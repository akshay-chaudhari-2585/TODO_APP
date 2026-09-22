import { Chess } from 'chess.js';

const rooms = {};
let waitingRoomId = null; // Tracks the room that has 1 player waiting for an opponent

export function initChessServer(io) {
  const chessNs = io.of('/chess');

  // Check for timeouts periodically
  setInterval(() => {
    const now = Date.now();
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.players.w && room.players.b && !room.game.isGameOver() && room.lastMoveTime) {
        const elapsed = now - room.lastMoveTime;
        const currentTurn = room.game.turn();
        
        if (room.timers[currentTurn] - elapsed <= 0) {
          // Timeout happened
          room.timers[currentTurn] = 0;
          // Force game over state? For now just broadcast time sync to freeze it
          chessNs.to(roomId).emit('chess_state', {
             fen: room.game.fen(),
             role: 'spectator', // Avoid resetting roles improperly, just send updated time
             turn: currentTurn,
             isGameOver: true, // You could flag timeout here
             whiteTime: room.timers.w,
             blackTime: room.timers.b,
             lastMoveTime: null,
             serverTime: Date.now()
          });
        }
      }
    }
  }, 1000);

  chessNs.on('connection', (socket) => {
    console.log(`[CHESS] Client connected: ${socket.id}`);

    socket.on('join_chess', () => {
      let roomId;
      let role;
      
      // Check if there is a room waiting for a player
      if (waitingRoomId && rooms[waitingRoomId]) {
        // Join the existing room as Black
        roomId = waitingRoomId;
        rooms[roomId].players.b = socket.id;
        role = 'b';
        waitingRoomId = null; // The room is now full
        console.log(`[CHESS] ${socket.id} joined existing room ${roomId} as Black`);
      } else {
        // Create a new room and wait as White
        roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        rooms[roomId] = {
          game: new Chess(),
          players: { w: socket.id, b: null },
          timers: { w: 600000, b: 600000 }, // 10 minutes in ms
          lastMoveTime: null
        };
        waitingRoomId = roomId;
        role = 'waiting'; // Technically white, but waiting for opponent
        console.log(`[CHESS] ${socket.id} created new room ${roomId} and is waiting`);
      }

      socket.join(roomId);
      socket.roomId = roomId;
      socket.role = role === 'waiting' ? 'w' : role; // Store actual role internally

      // Send state to the connecting player
      socket.emit('chess_state', {
        fen: rooms[roomId].game.fen(),
        role: role,
        roomId: roomId,
        whiteTime: rooms[roomId].timers.w,
        blackTime: rooms[roomId].timers.b,
        lastMoveTime: rooms[roomId].lastMoveTime,
        serverTime: Date.now()
      });

      // If the room is now full (Black joined), notify White that the game is starting
      if (rooms[roomId].players.b) {
        // Start the clock
        if (!rooms[roomId].lastMoveTime) {
          rooms[roomId].lastMoveTime = Date.now();
        }
        
        chessNs.to(rooms[roomId].players.w).emit('chess_state', {
           fen: rooms[roomId].game.fen(),
           role: 'w',
           isGameOver: false,
           turn: 'w',
           whiteTime: rooms[roomId].timers.w,
           blackTime: rooms[roomId].timers.b,
           lastMoveTime: rooms[roomId].lastMoveTime,
           serverTime: Date.now()
        });
      }
    });

    socket.on('chess_move', (move) => {
      const roomId = socket.roomId;
      if (!roomId || !rooms[roomId]) return;
      
      const room = rooms[roomId];
      
      // Verify turn matches role to prevent spoofing
      if (socket.role !== room.game.turn()) return;

      const turnBeforeMove = room.game.turn();

      try {
        const result = room.game.move(move);
        if (result) {
          const now = Date.now();
          if (room.lastMoveTime) {
            const elapsed = now - room.lastMoveTime;
            room.timers[turnBeforeMove] = Math.max(0, room.timers[turnBeforeMove] - elapsed);
          }
          room.lastMoveTime = now;

          // Broadcast to EVERYONE in the room EXCEPT the sender
          socket.to(roomId).emit('chess_state', {
            fen: room.game.fen(),
            turn: room.game.turn(),
            isGameOver: room.game.isGameOver(),
            whiteTime: room.timers.w,
            blackTime: room.timers.b,
            lastMoveTime: room.lastMoveTime,
            serverTime: now
          });
          
          // Emit back to sender to sync their local clock with official server time
          socket.emit('chess_state', {
            fen: room.game.fen(),
            turn: room.game.turn(),
            isGameOver: room.game.isGameOver(),
            whiteTime: room.timers.w,
            blackTime: room.timers.b,
            lastMoveTime: room.lastMoveTime,
            serverTime: now
          });
        }
      } catch (e) {
        console.log(`[CHESS] Invalid move attempted in room ${roomId}:`, e.message);
      }
    });

    socket.on('chess_reset', () => {
      const roomId = socket.roomId;
      if (!roomId || !rooms[roomId]) return;
      
      // Reset the game for this specific room
      rooms[roomId].game.reset();
      rooms[roomId].timers = { w: 600000, b: 600000 };
      rooms[roomId].lastMoveTime = Date.now();
      
      // Broadcast the reset state to the entire room
      chessNs.to(roomId).emit('chess_state', {
        fen: rooms[roomId].game.fen(),
        turn: 'w',
        isGameOver: false,
        whiteTime: 600000,
        blackTime: 600000,
        lastMoveTime: rooms[roomId].lastMoveTime,
        serverTime: Date.now()
      });
    });

    socket.on('disconnect', () => {
      console.log(`[CHESS] Client disconnected: ${socket.id}`);
      const roomId = socket.roomId;
      
      if (roomId && rooms[roomId]) {
        // If the disconnecting player was waiting, clear the waiting room
        if (waitingRoomId === roomId) {
          waitingRoomId = null;
        }
        
        socket.to(roomId).emit('chess_state', {
          opponentDisconnected: true,
          role: 'spectator' 
        });
        
        delete rooms[roomId];
      }
    });
  });
}
