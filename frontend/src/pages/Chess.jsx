import React, { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ChessPage() {
  const navigate = useNavigate();
  const [game, setGame] = useState(new Chess());
  const [role, setRole] = useState("spectator");
  const [socket, setSocket] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});
  const [moveFrom, setMoveFrom] = useState("");
  const [timers, setTimers] = useState({
    w: 600000,
    b: 600000,
    lastMoveTime: null,
    serverTimeOffset: 0,
    turn: 'w'
  });
  const [displayTimers, setDisplayTimers] = useState({ w: 600, b: 600 });

  // Refs to fix stale closures in react-chessboard callbacks
  const gameRef = React.useRef(game);
  const roleRef = React.useRef(role);
  const moveFromRef = React.useRef(moveFrom);

  useEffect(() => {
    gameRef.current = game;
    roleRef.current = role;
    moveFromRef.current = moveFrom;
  }, [game, role, moveFrom]);

  useEffect(() => {
    const newSocket = io(`${SOCKET_URL}/chess`);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join_chess");
    });

    newSocket.on("chess_state", (state) => {
      console.log("[SOCKET] Received chess_state:", state);
      if (state.fen) {
        setGame(new Chess(state.fen));
      }
      if (state.role) {
        setRole(state.role);
      }
      if (state.whiteTime !== undefined) {
        setTimers({
          w: state.whiteTime,
          b: state.blackTime,
          lastMoveTime: state.lastMoveTime,
          serverTimeOffset: Date.now() - (state.serverTime || Date.now()),
          turn: state.turn || 'w'
        });
      }
      if (state.opponentDisconnected) {
        alert("Opponent disconnected!");
      }
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const { w, b, lastMoveTime, serverTimeOffset, turn } = timers;
      if (!lastMoveTime || game.isGameOver() || role === "waiting") {
        setDisplayTimers({
          w: Math.floor(Math.max(0, w) / 1000),
          b: Math.floor(Math.max(0, b) / 1000),
        });
        return;
      }
      
      const now = Date.now() - serverTimeOffset;
      const elapsed = now - lastMoveTime;
      
      setDisplayTimers({
        w: Math.floor(Math.max(0, turn === 'w' ? w - elapsed : w) / 1000),
        b: Math.floor(Math.max(0, turn === 'b' ? b - elapsed : b) / 1000),
      });
    }, 250); // fast local tick for smooth display
    return () => clearInterval(interval);
  }, [timers, game.isGameOver(), role]);

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  function makeAMove(move) {
    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move(move);
      setGame(gameCopy);
      return result; // null if the move was illegal
    } catch (e) {
      return null;
    }
  }

  function onDrop({ sourceSquare, targetSquare }) {
    console.log(
      `[onDrop] Attempting drop from ${sourceSquare} to ${targetSquare}`,
    );
    const currentGame = gameRef.current;
    const currentRole = roleRef.current;

    console.log(`[onDrop] Role: ${currentRole}, Turn: ${currentGame.turn()}`);

    // Only allow moves if it's our turn
    if (currentRole !== currentGame.turn()) {
      console.log("[onDrop] Rejected: Not your turn!");
      return false;
    }

    const moveInfo = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    };

    const gameCopy = new Chess(currentGame.fen());
    try {
      const result = gameCopy.move(moveInfo);
      console.log(`[onDrop] Move result:`, result);
      if (result) {
        setGame(gameCopy);
        setMoveFrom("");
        setOptionSquares({});
        socket?.emit("chess_move", moveInfo);
        return true;
      }
    } catch (e) {
      console.error("[onDrop] Invalid move error:", e.message);
    }

    return false;
  }

  function getMoveOptions(square) {
    console.log(`[getMoveOptions] Getting moves for ${square}`);
    const currentGame = gameRef.current;
    const moves = currentGame.moves({
      square,
      verbose: true,
    });

    console.log(`[getMoveOptions] Possible moves:`, moves);

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          currentGame.get(move.to) &&
          currentGame.get(move.to).color !== currentGame.get(square).color
            ? "radial-gradient(circle, rgba(239, 68, 68, 0.2) 75%, rgba(255, 12, 12, 0.2) 100%)" // Outer ring for capture
            : "radial-gradient(circle, rgba(0, 0, 0, 0.2) 20%, transparent 20%)", // Darker dot for empty square
        borderRadius: "50%",
      };
      return move;
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)", // Yellow highlight for selected square
    };
    setOptionSquares(newSquares);
    return true;
  }

  const getCombinedSquareStyles = () => {
    const styles = { ...optionSquares };
    // Track opponent's last move (or any last move)
    // Since we don't have history directly from FEN in chess.js properly synced,
    // we might not get history across reconnections, but for local play in the session:
    const history = game.history({ verbose: true });
    if (history.length > 0) {
      const lastMoveObj = history[history.length - 1];
      styles[lastMoveObj.from] = {
        ...styles[lastMoveObj.from],
        backgroundColor: "rgba(255, 255, 0, 0.4)",
      };
      styles[lastMoveObj.to] = {
        ...styles[lastMoveObj.to],
        backgroundColor: "rgba(255, 255, 0, 0.4)",
      };
    }
    return styles;
  };

  function onSquareClick(squareObjOrString) {
    // Safely handle both the object the user passed in onPieceDragBegin, or the string react-chessboard passes natively
    const square =
      typeof squareObjOrString === "object"
        ? squareObjOrString.square
        : squareObjOrString;

    console.log(`[onSquareClick] Clicked square: ${square}`);
    const currentGame = gameRef.current;
    const currentRole = roleRef.current;
    const currentMoveFrom = moveFromRef.current;

    console.log(
      `[onSquareClick] Current Role: ${currentRole}, Turn: ${currentGame.turn()}`,
    );

    // Only allow interaction if it's our turn
    if (currentRole !== currentGame.turn()) {
      console.log("[onSquareClick] Ignored: Not your turn!");
      return;
    }

    // If we click the same square again, deselect
    if (currentMoveFrom === square) {
      console.log("[onSquareClick] Deselecting square");
      setMoveFrom("");
      setOptionSquares({});
      return;
    }

    // Try to move
    const moveInfo = {
      from: currentMoveFrom,
      to: square,
      promotion: "q",
    };

    if (currentMoveFrom) {
      console.log(
        `[onSquareClick] Attempting move from ${currentMoveFrom} to ${square}`,
      );
      const gameCopy = new Chess(currentGame.fen());
      try {
        const result = gameCopy.move(moveInfo);
        console.log(`[onSquareClick] Move result:`, result);
        if (result) {
          setGame(gameCopy);
          socket?.emit("chess_move", moveInfo);
          setMoveFrom("");
          setOptionSquares({});
          return;
        }
      } catch (e) {
        console.log("[onSquareClick] Move was invalid:", e.message);
      }
    }

    // If it wasn't a valid move, it might be a selection of our own piece
    const piece = currentGame.get(square);
    console.log(`[onSquareClick] Piece at ${square}:`, piece);

    if (piece && piece.color === currentRole) {
      console.log(`[onSquareClick] Selected own piece at ${square}`);
      setMoveFrom(square);
      getMoveOptions(square);
    } else {
      console.log(`[onSquareClick] Cleared selection`);
      setMoveFrom("");
      setOptionSquares({});
    }
  }

  return (
    <div className="chess-page-container">
      <div className="chess-layout">
        {/* Left Panel - Player Status & Controls */}
        <div className="chess-panel-left glass-panel">
          <h1 className="chess-title">Multiplayer Chess</h1>

          <div className="chess-status-card">
            <h2 className="chess-status-header">Game Status</h2>
            {role === "spectator" ? (
              <div className="chess-status-content">
                <span className="chess-icon">👀</span>
                <span className="chess-text-spectator">You are spectating</span>
              </div>
            ) : role === "waiting" ? (
              <div className="chess-status-content chess-waiting">
                <div className="chess-spinner"></div>
                <p className="chess-text-waiting">
                  Waiting for opponent to join...
                </p>
              </div>
            ) : (
              <div className="chess-status-info">
                <div className="chess-role-row">
                  <span className="chess-label">Playing as</span>
                  <span
                    className={`chess-role-badge ${role === "w" ? "role-white" : "role-black"}`}
                  >
                    {role === "w" ? "White" : "Black"}
                  </span>
                </div>
                <div
                  className={`chess-turn-box ${game.turn() === role ? "turn-active" : "turn-waiting"}`}
                >
                  <p className="chess-turn-text">
                    {game.turn() === role
                      ? "👉 It's your turn!"
                      : "⏳ Waiting for opponent..."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="chess-status-card" style={{ marginTop: '1rem' }}>
             <h2 className="chess-status-header">Timers</h2>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', padding: '0.5rem 1rem' }}>
               <div style={{ color: game.turn() === 'w' ? '#ef4444' : 'inherit' }}>
                  White: {formatTime(displayTimers.w)}
               </div>
               <div style={{ color: game.turn() === 'b' ? '#ef4444' : 'inherit' }}>
                  Black: {formatTime(displayTimers.b)}
               </div>
             </div>
          </div>

          {game.isGameOver() && (
            <div className="chess-gameover-card">
              <h3>Game Over!</h3>
              <p>{game.isCheckmate() ? "Checkmate!" : "Draw!"}</p>
            </div>
          )}

          <div className="chess-controls">
            <button
              onClick={() => socket?.emit("chess_reset")}
              className="chess-btn-primary"
            >
              Reset Game
            </button>
            <button
              onClick={() => navigate("/")}
              className="chess-btn-secondary"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Right Panel - Chess Board */}
        <div className="chess-panel-right glass-panel">
          <div className="chess-board-wrapper">
            {(() => {
              const chessboardOptions = {
                position: game.fen(),
                onPieceDrop: onDrop,
                onSquareClick: onSquareClick,
                squareStyles: getCombinedSquareStyles(),
                boardOrientation: role === "b" ? "black" : "white",
                darkSquareStyle: { backgroundColor: "#779556" }, // Classic chess.com green
                lightSquareStyle: { backgroundColor: "#ebecd0" }, // Classic chess.com cream
                animationDuration: 200,
                onPieceDragBegin: (piece, sourceSquare) =>
                  onSquareClick({ square: sourceSquare || piece }),
                arePremovesAllowed: false,
              };

              return <Chessboard options={chessboardOptions} />;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
