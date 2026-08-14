import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Button from '../components/Button';
import Card from '../components/Card';

const TILE_SIZE = 40;
const MAP_WIDTH = 24;
const MAP_HEIGHT = 16;
const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE;

// Physics constants (Must match Server)
const GRAVITY = 0.8;
const JUMP_FORCE = -15; 
const SPEED_SURVIVOR = 5;
const SPEED_ZOMBIE = 6;
const MAX_FALL_SPEED = 15;
const PHYSICS_FPS = 60;

const Game = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(document.createElement('canvas'));
  
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [maps, setMaps] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ping, setPing] = useState(0);

  // Mutable refs for high-frequency physics/rendering
  const playersRef = useRef({});
  const myInputsRef = useRef({ left: false, right: false, jump: false });
  const mapDrawnRef = useRef(false);
  const pingInterval = useRef(null);

  // Connection
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(backendUrl);

    newSocket.on('connect', () => { setIsConnected(true); setError(null); });
    newSocket.on('error', (err) => setError(err.message));
    
    newSocket.on('init_config', (data) => {
      setMaps(data.maps);
    });

    newSocket.on('game_state', (state) => {
      // Sync authoritative state to refs immediately
      playersRef.current = state.players || {};

      // Only trigger a React render for UI elements to prevent lag
      setGameState(prevState => {
        if (!prevState || 
            prevState.status !== state.status || 
            prevState.timeLeft !== state.timeLeft ||
            prevState.countdown !== state.countdown ||
            prevState.infectionPending !== state.infectionPending ||
            prevState.selectedMapIndex !== state.selectedMapIndex) {
          
          if (prevState && prevState.selectedMapIndex !== state.selectedMapIndex) {
            mapDrawnRef.current = false; // Redraw offscreen map if map changes
          }
          return state;
        }
        return prevState;
      });

      setMyRole(prev => {
        const newRole = state.players[newSocket.id]?.role;
        return newRole && newRole !== prev ? newRole : prev;
      });
    });

    newSocket.on('pong', (clientTime) => {
      setPing(Date.now() - clientTime);
    });

    pingInterval.current = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping', Date.now());
      }
    }, 2000);

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
      if (pingInterval.current) clearInterval(pingInterval.current);
    };
  }, []);

  // Keyboard controls mapping
  useEffect(() => {
    if (!socket || !gameState || gameState.status !== 'playing') return;

    const handleKey = (e, state) => {
      if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'w', 'a', 'd', ' '].includes(e.key)) {
        if (e.type === 'keydown') e.preventDefault();
      }
      let key = null;
      if (e.key === 'ArrowLeft' || e.key === 'a') key = 'left';
      if (e.key === 'ArrowRight' || e.key === 'd') key = 'right';
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') key = 'jump';
      
      if (key && (e.type === 'keyup' || !e.repeat)) {
        myInputsRef.current[key] = state;
        socket.emit('input', { key, state });
      }
    };

    const onKeyDown = (e) => handleKey(e, true);
    const onKeyUp = (e) => handleKey(e, false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [socket, gameState?.status]);

  // Canvas Render & Local Physics Loop
  useEffect(() => {
    if (!canvasRef.current || !gameState || !maps) return;
    const ctx = canvasRef.current.getContext('2d');
    
    // Prepare offscreen canvas for map
    if (!mapDrawnRef.current) {
      offscreenCanvasRef.current.width = CANVAS_WIDTH;
      offscreenCanvasRef.current.height = CANVAS_HEIGHT;
      const offCtx = offscreenCanvasRef.current.getContext('2d');
      offCtx.fillStyle = '#0f172a';
      offCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const currentMap = maps[gameState.selectedMapIndex || 0];
      for (let row = 0; row < MAP_HEIGHT; row++) {
        for (let col = 0; col < MAP_WIDTH; col++) {
          if (currentMap && currentMap[row] && currentMap[row][col] === 1) {
            offCtx.fillStyle = '#334155';
            offCtx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            offCtx.strokeStyle = '#1e293b';
            offCtx.lineWidth = 2;
            offCtx.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }
      mapDrawnRef.current = true;
    }

    const isSolid = (x, y, mapIndex) => {
      const col = Math.floor(x / TILE_SIZE);
      const row = Math.floor(y / TILE_SIZE);
      if (row < 0 || row >= MAP_HEIGHT || col < 0 || col >= MAP_WIDTH) return true;
      return maps[mapIndex][row][col] === 1;
    };

    const checkTileCollision = (player, dx, dy, mapIndex) => {
      const testPoints = (px, py) => {
        return (
          isSolid(px, py, mapIndex) ||
          isSolid(px + TILE_SIZE - 0.1, py, mapIndex) ||
          isSolid(px, py + TILE_SIZE - 0.1, mapIndex) ||
          isSolid(px + TILE_SIZE - 0.1, py + TILE_SIZE - 0.1, mapIndex)
        );
      };

      if (dx !== 0) {
        if (testPoints(player.x + dx, player.y)) {
          if (dx > 0) player.x = Math.floor((player.x + dx + TILE_SIZE) / TILE_SIZE) * TILE_SIZE - TILE_SIZE;
          else player.x = Math.floor((player.x + dx) / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
        } else {
          player.x += dx;
        }
      }

      if (dy !== 0) {
        if (testPoints(player.x, player.y + dy)) {
          if (dy > 0) {
            player.y = Math.floor((player.y + dy + TILE_SIZE) / TILE_SIZE) * TILE_SIZE - TILE_SIZE;
            player.vy = 0;
          } else {
            player.y = Math.floor((player.y + dy) / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
            player.vy = 0;
          }
        } else {
          player.y += dy;
        }
      }
    };

    let lastTick = Date.now();
    let animationFrameId;

    const loop = () => {
      const now = Date.now();
      const dt = now - lastTick;
      const mapIndex = gameState.selectedMapIndex || 0;

      // Physics Prediction
      if (gameState.status === 'playing' && dt >= 1000 / PHYSICS_FPS) {
        Object.values(playersRef.current).forEach(player => {
          if (player.id === socket?.id) {
            // Local prediction
            const speed = player.role === 'zombie' ? SPEED_ZOMBIE : SPEED_SURVIVOR;
            player.vx = 0;
            if (myInputsRef.current.left) player.vx = -speed;
            if (myInputsRef.current.right) player.vx = speed;

            player.vy += GRAVITY;
            if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;

            const wasGrounded = isSolid(player.x, player.y + TILE_SIZE, mapIndex) || isSolid(player.x + TILE_SIZE - 0.1, player.y + TILE_SIZE, mapIndex);

            if (myInputsRef.current.jump) {
              if (wasGrounded && !player.jumpHeld) {
                player.vy = JUMP_FORCE;
                player.jumpHeld = true;
              }
            } else {
              player.jumpHeld = false;
            }

            checkTileCollision(player, player.vx, 0, mapIndex);
            checkTileCollision(player, 0, player.vy, mapIndex);

            if (player.x < 0) player.x = 0;
            if (player.x > CANVAS_WIDTH - TILE_SIZE) player.x = CANVAS_WIDTH - TILE_SIZE;
            if (player.y > CANVAS_HEIGHT) {
              player.y = 2 * TILE_SIZE;
              player.vy = 0;
            }
          }
          // Note: Opponent interpolates by just rendering at server provided position (snapping)
          // For true interpolation, we'd lerp here, but visual snapping is okay for this simple prototype
        });
        lastTick = now;
      }

      // Draw Map (Blit offscreen canvas)
      ctx.drawImage(offscreenCanvasRef.current, 0, 0);

      // Draw Players
      Object.values(playersRef.current).forEach(player => {
        if (gameState.infectionPending) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'yellow';
        } else {
          ctx.shadowBlur = 10;
          ctx.shadowColor = player.color === 'green' ? '#22c55e' : '#3b82f6';
        }

        ctx.fillStyle = player.color === 'green' ? '#22c55e' : '#3b82f6';
        ctx.fillRect(player.x, player.y, TILE_SIZE, TILE_SIZE);
        
        ctx.shadowBlur = 0; 

        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let emoji = player.role === 'zombie' ? '👹' : '😷';
        ctx.fillText(emoji, player.x + TILE_SIZE/2, player.y + TILE_SIZE/2 + 2); 
        
        if (player.id === socket?.id) {
            ctx.font = '12px Arial';
            ctx.textBaseline = 'bottom';
            ctx.fillText('YOU', player.x + TILE_SIZE/2, player.y - 5);
        }
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState?.status, socket, maps]);

  const joinGame = () => {
    if (socket) socket.emit('join_game');
  };
  
  const selectMap = (dir) => {
    if (socket) socket.emit('select_map', dir);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <header style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(90deg, #22c55e, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            Infection (Zombie Tag)
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Ping: {ping}ms | Run. Hide. Survive.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/')}>Back to Dashboard</Button>
      </header>

      {error && (
        <div style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      {!gameState || !myRole || !maps ? (
        <Card padding="lg" style={{ textAlign: 'center', width: '100%' }}>
          <h2>Ready to play?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Join the global lobby to play Infection against someone else.</p>
          <Button variant="primary" size="lg" onClick={joinGame} disabled={!isConnected || !maps}>
            {isConnected ? (!maps ? 'Loading Maps from DB...' : 'Join Game') : 'Connecting...'}
          </Button>
        </Card>
      ) : (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                <span style={{ color: '#22c55e' }}>ZOMBIE</span> vs <span style={{ color: '#3b82f6' }}>SURVIVOR</span>
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Survive for 2 minutes to win!</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase' }}>Time Left</span>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: gameState.timeLeft <= 10 ? 'var(--error)' : 'var(--text-main)' }}>
                {gameState.timeLeft}s
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status</span>
              <span style={{ fontWeight: 'bold', fontSize: '1.25rem', textTransform: 'uppercase', color: gameState.status === 'playing' ? 'var(--success)' : 'var(--accent-yellow)' }}>
                {gameState.status}
              </span>
              {myRole && (
                <div style={{ marginTop: '0.25rem', fontSize: '1rem' }}>
                  You are the <span style={{ color: myRole === 'zombie' ? '#22c55e' : '#3b82f6', fontWeight: 'bold' }}>{myRole.toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ position: 'relative', width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, margin: '0 auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', borderRadius: '12px', overflow: 'hidden', border: '4px solid #1e293b' }}>
            
            <canvas 
              ref={canvasRef} 
              width={CANVAS_WIDTH} 
              height={CANVAS_HEIGHT} 
              style={{ display: 'block' }}
            />

            {gameState.status === 'waiting' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: 'white', zIndex: 20 }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Waiting for Opponent...</h2>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderLeftColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '2rem' }}></div>
                
                {myRole === 'zombie' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#fbbf24' }}>ZOMBIE PERK: CHOOSE THE MAP</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <Button variant="secondary" onClick={() => selectMap('prev')}>&larr; Prev Map</Button>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Map {(gameState.selectedMapIndex || 0) + 1}</span>
                      <Button variant="secondary" onClick={() => selectMap('next')}>Next Map &rarr;</Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px' }}>
                    <p style={{ color: '#94a3b8' }}>The Zombie is selecting the map...</p>
                  </div>
                )}
              </div>
            )}
            
            {gameState.status === 'starting' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.7)', color: 'white', zIndex: 20 }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>GET READY!</h2>
                <div style={{ fontSize: '6rem', fontWeight: '900', color: '#22c55e', textShadow: '0 0 20px #22c55e', animation: 'pulse 1s infinite alternate' }}>
                  {gameState.countdown}
                </div>
              </div>
            )}

            {gameState.status === 'finished' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: 'white', zIndex: 20 }}>
                <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: '#fbbf24' }}>TIME'S UP!</h1>
                <h2 style={{ fontSize: '2rem' }}>
                  {myRole === 'survivor' ? (
                    <span style={{ color: '#3b82f6' }}>YOU SURVIVED! YOU WIN!</span>
                  ) : (
                    <span style={{ color: '#22c55e' }}>YOU ARE INFECTED! YOU LOSE!</span>
                  )}
                </h2>
                <p style={{ marginTop: '2rem', color: '#94a3b8' }}>Starting a new game soon...</p>
              </div>
            )}

            {gameState.infectionPending && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundColor: 'rgba(234, 179, 8, 0.2)', animation: 'flash 0.2s infinite alternate', zIndex: 10 }} />
            )}
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem' }}>Use WASD or Arrow Keys to move and Jump.</p>
        </div>
      )}
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes flash { to { opacity: 0; } }
        @keyframes pulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default Game;
