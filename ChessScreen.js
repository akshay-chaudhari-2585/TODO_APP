import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Chess } from 'chess.js';
import Chessboard from 'react-native-chessboard';
import io from 'socket.io-client';

const SOCKET_URL = 'https://todoapp-production-10f6.up.railway.app';

export default function ChessScreen({ navigation }) {
  const [chess, setChess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [role, setRole] = useState('spectator');
  const [socket, setSocket] = useState(null);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);

  useEffect(() => {
    let interval;
    const isGameActive =
      !chess.isGameOver() &&
      chess.fen() !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    if (isGameActive && role !== 'waiting') {
      interval = setInterval(() => {
        if (chess.turn() === 'w') {
          setWhiteTime((prev) => (prev > 0 ? prev - 1 : 0));
        } else {
          setBlackTime((prev) => (prev > 0 ? prev - 1 : 0));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [chess, role]);

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const newSocket = io(`${SOCKET_URL}/chess`);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_chess');
    });

    newSocket.on('chess_state', (state) => {
      if (state.fen) {
        const newGame = new Chess(state.fen);
        setChess(newGame);
        setFen(newGame.fen());
        if (state.fen === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
          setWhiteTime(600);
          setBlackTime(600);
        }
      }
      if (state.role) {
        setRole(state.role);
      }
    });

    return () => newSocket.close();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Multiplayer Chess</Text>
      
      <View style={styles.statusContainer}>
        {role === 'spectator' ? (
          <Text style={styles.statusTextSpectator}>You are spectating</Text>
        ) : (
          <Text style={styles.statusText}>
            You are {role === 'w' ? 'White' : 'Black'}. 
            {chess.turn() === role ? " It's your turn!" : " Waiting for opponent..."}
          </Text>
        )}
      </View>

      <View style={styles.timersContainer}>
         <Text style={[styles.timerText, chess.turn() === 'w' && styles.activeTimer]}>
           White: {formatTime(whiteTime)}
         </Text>
         <Text style={[styles.timerText, chess.turn() === 'b' && styles.activeTimer]}>
           Black: {formatTime(blackTime)}
         </Text>
      </View>

      <View style={styles.boardContainer}>
        <Chessboard 
          gestureEnabled={role === chess.turn()} // only allow if it's our turn
          fen={fen}
          colors={{ black: '#779556', white: '#ebecd0' }}
          onMove={({ move }) => {
            // react-native-chessboard gives us { from, to }
            if (role !== chess.turn()) return;

            const moveInfo = {
              from: move.from,
              to: move.to,
              promotion: 'q',
            };

            const gameCopy = new Chess(chess.fen());
            try {
              const result = gameCopy.move(moveInfo);
              if (result) {
                setChess(gameCopy);
                setFen(gameCopy.fen());
                socket?.emit('chess_move', moveInfo);
              }
            } catch (e) {}
          }}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.buttonSecondary}
          onPress={() => socket?.emit('chess_reset')}
        >
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusTextSpectator: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boardContainer: {
    marginBottom: 30,
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8,
  },
  timersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  timerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  activeTimer: {
    color: '#ef4444',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 15,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: '#64748b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
