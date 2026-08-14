import { Server } from 'socket.io';
import prisma from '../config/db.js';

const GAME_DURATION = 120; // seconds
const FPS = 60; // Higher FPS for smooth physics
const TILE_SIZE = 40;
const MAP_WIDTH = 24;
const MAP_HEIGHT = 16;
const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE;

// 0: Air, 1: Wall/Floor/Platform
const DEFAULT_MAP_0 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const DEFAULT_MAP_1 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]
];

const DEFAULT_MAP_2 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

let MAPS = [DEFAULT_MAP_0, DEFAULT_MAP_1, DEFAULT_MAP_2];

// Initialize DB config asynchronously
async function loadGameConfig() {
  try {
    let config = await prisma.game_config.findUnique({
      where: { name: 'zombie_tag' }
    });
    
    if (!config) {
      console.log('No game config found, seeding database...');
      config = await prisma.game_config.create({
        data: {
          name: 'zombie_tag',
          maps: MAPS
        }
      });
    } else {
      MAPS = config.maps;
      console.log('Loaded maps from database.');
    }
  } catch (error) {
    console.error('Failed to load game config:', error);
  }
}
loadGameConfig();

// Physics constants
const GRAVITY = 0.6;
const JUMP_FORCE = -15; 
const SPEED_SURVIVOR = 5;
const SPEED_ZOMBIE = 5; // Or keep it 6? The sandbox used 5 for the player. Let's make both 5 for consistency with the sandbox.
const MAX_FALL_SPEED = 15;

export const initGameServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  let gameState = {
    status: 'waiting', // waiting, starting, playing, finished
    timeLeft: GAME_DURATION,
    countdown: 3,
    selectedMapIndex: 0,
    players: {}, // id -> { role, x, y, vx, vy, color, inputs }
    infectionPending: false, // if a tag happened, waiting 1 sec
    infectionTimer: null
  };

  let gameLoopInterval = null;
  let timerInterval = null;

  const resetGame = () => {
    gameState.status = 'waiting';
    gameState.timeLeft = GAME_DURATION;
    gameState.countdown = 3;
    gameState.infectionPending = false;
    gameState.infectionTimer = null;

    const ids = Object.keys(gameState.players);
    if (ids.length >= 2) {
      // Assign roles
      gameState.players[ids[0]].role = 'zombie';
      gameState.players[ids[0]].color = 'green';
      gameState.players[ids[0]].x = 2 * TILE_SIZE;
      gameState.players[ids[0]].y = 14 * TILE_SIZE;

      gameState.players[ids[1]].role = 'survivor';
      gameState.players[ids[1]].color = 'blue';
      gameState.players[ids[1]].x = 21 * TILE_SIZE;
      gameState.players[ids[1]].y = 14 * TILE_SIZE;
    }

    ids.forEach(id => {
      gameState.players[id].vx = 0;
      gameState.players[id].vy = 0;
      gameState.players[id].inputs = { left: false, right: false, jump: false };
    });

    if (gameLoopInterval) clearInterval(gameLoopInterval);
    if (timerInterval) clearInterval(timerInterval);
    gameLoopInterval = null;
    timerInterval = null;
  };

  const startCountdown = () => {
    if (gameState.status === 'starting' || gameState.status === 'playing') return;
    gameState.status = 'starting';
    
    timerInterval = setInterval(() => {
      gameState.countdown -= 1;
      io.emit('game_state', gameState);
      
      if (gameState.countdown <= 0) {
        clearInterval(timerInterval);
        startGame();
      }
    }, 1000);
  };

  const startGame = () => {
    gameState.status = 'playing';
    
    // Fall back into main game timer
    timerInterval = setInterval(() => {
      if (gameState.status !== 'playing') {
        clearInterval(timerInterval);
        return;
      }
      gameState.timeLeft -= 1;

      if (gameState.timeLeft <= 0) {
        gameState.status = 'finished';
        clearInterval(timerInterval);
        io.emit('game_state', gameState);
        setTimeout(() => {
          resetGame();
          io.emit('game_state', gameState);
        }, 5000);
      }
    }, 1000);

    let tickCount = 0;
    gameLoopInterval = setInterval(() => {
      if (gameState.status === 'playing') {
        updatePhysics();
        checkInfection();
        
        tickCount++;
        // Emit game state at 10 FPS (every 6 ticks) as final truth
        if (tickCount % 6 === 0) {
          io.emit('game_state', gameState);
        }
      }
    }, 1000 / FPS);
  };

  const isSolid = (x, y) => {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (row < 0 || row >= MAP_HEIGHT || col < 0 || col >= MAP_WIDTH) return true; // Bounds
    return MAPS[gameState.selectedMapIndex][row][col] === 1;
  };

  // AABB Collision vs Tile Map
  const checkTileCollision = (player, dx, dy) => {
    // We test all 4 corners of the player's bounding box
    // Subtract 0.1 from bottom/right edges to avoid catching on flush adjacent tiles
    const testPoints = (px, py) => {
      return (
        isSolid(px, py) ||
        isSolid(px + TILE_SIZE - 0.1, py) ||
        isSolid(px, py + TILE_SIZE - 0.1) ||
        isSolid(px + TILE_SIZE - 0.1, py + TILE_SIZE - 0.1)
      );
    };

    // X axis step
    if (dx !== 0) {
      if (testPoints(player.x + dx, player.y)) {
        if (dx > 0) {
          player.x = Math.floor((player.x + dx + TILE_SIZE) / TILE_SIZE) * TILE_SIZE - TILE_SIZE;
        } else {
          player.x = Math.floor((player.x + dx) / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
        }
      } else {
        player.x += dx;
      }
    }

    // Y axis step
    if (dy !== 0) {
      if (testPoints(player.x, player.y + dy)) {
        if (dy > 0) {
          // Landing on floor
          player.y = Math.floor((player.y + dy + TILE_SIZE) / TILE_SIZE) * TILE_SIZE - TILE_SIZE;
        } else {
          // Hitting ceiling
          player.y = Math.floor((player.y + dy) / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
        }
        player.vy = 0;
      } else {
        player.y += dy;
      }
    }
  };

  const updatePhysics = () => {
    Object.values(gameState.players).forEach(player => {
      // Horizontal velocity from input
      const speed = player.role === 'zombie' ? SPEED_ZOMBIE : SPEED_SURVIVOR;
      player.vx = 0;
      if (player.inputs.left) player.vx = -speed;
      if (player.inputs.right) player.vx = speed;

      // Gravity
      player.vy += GRAVITY;
      if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;

      // Check if perfectly grounded
      const wasGrounded = isSolid(player.x, player.y + TILE_SIZE) || isSolid(player.x + TILE_SIZE - 0.1, player.y + TILE_SIZE);

      // Jump Logic (prevent holding to bounce)
      if (player.inputs.jump) {
        if (wasGrounded && !player.jumpHeld) {
          player.vy = JUMP_FORCE;
          player.jumpHeld = true; // Lock jump until key is released
        }
      } else {
        player.jumpHeld = false; // Key released, ready for next jump
      }

      // Apply movement and collide
      checkTileCollision(player, player.vx, 0);
      checkTileCollision(player, 0, player.vy);
      
      // Safety bounds for X (in case they clip out)
      if (player.x < 0) player.x = 0;
      if (player.x > CANVAS_WIDTH - TILE_SIZE) player.x = CANVAS_WIDTH - TILE_SIZE;
      
      // Safety bounds for Y (if they fall into the pit in Map 1)
      if (player.y > CANVAS_HEIGHT) {
        // Punish player, reset to spawn
        player.y = 2 * TILE_SIZE;
        player.vy = 0;
      }
    });
  };

  const checkInfection = () => {
    if (gameState.infectionPending) {
      if (Date.now() >= gameState.infectionTimer) {
        // Swap roles!
        const ids = Object.keys(gameState.players);
        ids.forEach(id => {
          if (gameState.players[id].role === 'zombie') {
            gameState.players[id].role = 'survivor';
            gameState.players[id].color = 'blue';
          } else {
            gameState.players[id].role = 'zombie';
            gameState.players[id].color = 'green';
          }
        });
        gameState.infectionPending = false;
        gameState.infectionTimer = null;
        io.emit('infection_swapped');
      }
      return; // pause tagging while pending
    }

    const ids = Object.keys(gameState.players);
    if (ids.length < 2) return;
    const p1 = gameState.players[ids[0]];
    const p2 = gameState.players[ids[1]];

    // AABB intersection
    const hit = (
      p1.x < p2.x + TILE_SIZE &&
      p1.x + TILE_SIZE > p2.x &&
      p1.y < p2.y + TILE_SIZE &&
      p1.y + TILE_SIZE > p2.y
    );

    if (hit) {
      gameState.infectionPending = true;
      gameState.infectionTimer = Date.now() + 1000; // 1 second delay
      io.emit('infection_triggered');
    }
  };

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    
    // Send maps to client
    socket.emit('init_config', { maps: MAPS });

    socket.on('ping', (clientTime) => {
      socket.emit('pong', clientTime);
    });


    socket.on('join_game', () => {
      const active = Object.keys(gameState.players).length;
      if (active >= 2) {
        socket.emit('error', { message: 'Game is currently full.' });
        return;
      }

      gameState.players[socket.id] = {
        id: socket.id,
        role: active === 0 ? 'zombie' : 'survivor',
        color: active === 0 ? 'green' : 'blue',
        x: active === 0 ? 2 * TILE_SIZE : 21 * TILE_SIZE, 
        y: 14 * TILE_SIZE, 
        vx: 0, vy: 0,
        inputs: { left: false, right: false, jump: false }
      };

      io.emit('game_state', gameState);

      if (Object.keys(gameState.players).length === 2 && gameState.status === 'waiting') {
        startCountdown();
      }
    });
    
    socket.on('select_map', (dir) => {
      if (gameState.status !== 'waiting') return;
      const player = gameState.players[socket.id];
      if (player && player.role === 'zombie') {
        if (dir === 'next') gameState.selectedMapIndex = (gameState.selectedMapIndex + 1) % MAPS.length;
        if (dir === 'prev') gameState.selectedMapIndex = (gameState.selectedMapIndex - 1 + MAPS.length) % MAPS.length;
        io.emit('game_state', gameState);
      }
    });

    socket.on('input', (data) => {
      // data: { key: 'left'|'right'|'jump', state: boolean }
      if (gameState.status !== 'playing') return;
      const player = gameState.players[socket.id];
      if (!player) return;

      if (data.key in player.inputs) {
        player.inputs[data.key] = data.state;
      }
    });

    socket.on('disconnect', () => {
      if (gameState.players[socket.id]) {
        delete gameState.players[socket.id];
        if (gameState.status === 'playing' || gameState.status === 'starting') {
          resetGame();
          io.emit('game_state', gameState);
        }
      }
    });
  });

  return io;
}
