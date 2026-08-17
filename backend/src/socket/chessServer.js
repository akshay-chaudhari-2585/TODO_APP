import { Chess } from 'chess.js';

let chessGame = new Chess();
let waitingPlayers = []; // array of socket.id
let gamePlayers = {
  w: null,
  b: null,
};

export function initChessServer(io) {
  // We can use a namespace to separate chess from the main game
  const chessNs = io.of('/chess');

  chessNs.on('connection', (socket) => {
    console.log(`[CHESS] User connected: ${socket.id}`);

    socket.on('join_chess', () => {
      // If they are already in the game, tell them their role
      if (gamePlayers.w === socket.id) {
        socket.emit('chess_state', { fen: chessGame.fen(), role: 'w', isGameOver: chessGame.isGameOver(), turn: chessGame.turn() });
        return;
      }
      if (gamePlayers.b === socket.id) {
        socket.emit('chess_state', { fen: chessGame.fen(), role: 'b', isGameOver: chessGame.isGameOver(), turn: chessGame.turn() });
        return;
      }

      // If game is full and they are new, they are a spectator
      if (gamePlayers.w && gamePlayers.b) {
        socket.emit('chess_state', { fen: chessGame.fen(), role: 'spectator', isGameOver: chessGame.isGameOver(), turn: chessGame.turn() });
        return;
      }

      // Add to waiting if not full
      if (!waitingPlayers.includes(socket.id)) {
        waitingPlayers.push(socket.id);
      }

      // If we have 2 players waiting, start the game with random colors!
      if (waitingPlayers.length >= 2) {
        const p1 = waitingPlayers.shift();
        const p2 = waitingPlayers.shift();
        
        // Random assign
        if (Math.random() > 0.5) {
          gamePlayers.w = p1;
          gamePlayers.b = p2;
        } else {
          gamePlayers.w = p2;
          gamePlayers.b = p1;
        }

        // Inform players
        chessNs.to(gamePlayers.w).emit('chess_state', { fen: chessGame.fen(), role: 'w', isGameOver: chessGame.isGameOver(), turn: chessGame.turn() });
        chessNs.to(gamePlayers.b).emit('chess_state', { fen: chessGame.fen(), role: 'b', isGameOver: chessGame.isGameOver(), turn: chessGame.turn() });
        
        console.log(`[CHESS] Game started! White: ${gamePlayers.w}, Black: ${gamePlayers.b}`);
      } else {
        // Just one player waiting
        socket.emit('chess_state', { fen: chessGame.fen(), role: 'waiting', isGameOver: chessGame.isGameOver(), turn: chessGame.turn() });
        console.log(`[CHESS] ${socket.id} is waiting for an opponent...`);
      }
    });

    socket.on('chess_move', (move) => {
      console.log(`[CHESS] Move received from ${socket.id}:`, move);
      const turn = chessGame.turn(); 
      if (gamePlayers[turn] !== socket.id) {
        console.log(`[CHESS] Ignored move. It is ${turn}'s turn, but ${socket.id} tried to move.`);
        return; // Ignore if it's not their turn or they are a spectator
      }

      try {
        const result = chessGame.move(move);
        if (result) {
          console.log(`[CHESS] Move valid. New FEN: ${chessGame.fen()}`);
          // Valid move, broadcast new state to everyone in /chess
          chessNs.emit('chess_state', {
            fen: chessGame.fen(),
            // role is specific to client, so we don't send role in broadcasts. Clients just update FEN.
            isGameOver: chessGame.isGameOver(),
            turn: chessGame.turn()
          });
        } else {
          console.log(`[CHESS] Move rejected by chess.js (returned null)`);
        }
      } catch (e) {
        console.log(`[CHESS] Move threw error:`, e.message);
        // Invalid move, ignore
      }
    });

    socket.on('chess_reset', () => {
      // Reset the game board and kick everyone back to waiting pool
      chessGame = new Chess();
      waitingPlayers = [];
      if (gamePlayers.w) waitingPlayers.push(gamePlayers.w);
      if (gamePlayers.b) waitingPlayers.push(gamePlayers.b);
      gamePlayers.w = null;
      gamePlayers.b = null;
      
      chessNs.emit('chess_state', {
        fen: chessGame.fen(),
        role: 'spectator', // Force clients to re-request join or stay spectator until 2 are ready
        isGameOver: chessGame.isGameOver(),
        turn: chessGame.turn()
      });
      
      // Auto-rejoin for people who were in the game
      waitingPlayers.forEach(id => {
        chessNs.to(id).emit('chess_state', { fen: chessGame.fen(), role: 'waiting', isGameOver: chessGame.isGameOver(), turn: chessGame.turn() });
      });

      if (waitingPlayers.length >= 2) {
        const p1 = waitingPlayers.shift();
        const p2 = waitingPlayers.shift();
        if (Math.random() > 0.5) { gamePlayers.w = p1; gamePlayers.b = p2; } 
        else { gamePlayers.w = p2; gamePlayers.b = p1; }
        chessNs.to(gamePlayers.w).emit('chess_state', { fen: chessGame.fen(), role: 'w', isGameOver: chessGame.isGameOver(), turn: chessGame.turn() });
        chessNs.to(gamePlayers.b).emit('chess_state', { fen: chessGame.fen(), role: 'b', isGameOver: chessGame.isGameOver(), turn: chessGame.turn() });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[CHESS] User disconnected: ${socket.id}`);
      waitingPlayers = waitingPlayers.filter(id => id !== socket.id);
      
      let wasInGame = false;
      if (gamePlayers.w === socket.id) { gamePlayers.w = null; wasInGame = true; }
      if (gamePlayers.b === socket.id) { gamePlayers.b = null; wasInGame = true; }

      if (wasInGame) {
        console.log(`[CHESS] A player in the active game disconnected. Resetting match.`);
        chessGame = new Chess();
        
        const remainingPlayer = gamePlayers.w || gamePlayers.b;
        if (remainingPlayer && !waitingPlayers.includes(remainingPlayer)) {
          waitingPlayers.push(remainingPlayer);
        }
        gamePlayers.w = null;
        gamePlayers.b = null;

        chessNs.emit('chess_state', {
          fen: chessGame.fen(),
          role: 'spectator',
          isGameOver: chessGame.isGameOver(),
          turn: chessGame.turn()
        });

        waitingPlayers.forEach(id => {
          chessNs.to(id).emit('chess_state', { fen: chessGame.fen(), role: 'waiting', isGameOver: chessGame.isGameOver(), turn: chessGame.turn() });
        });
      }
    });
  });
}
