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

// Maps are loaded dynamically from the backend

const Game = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [maps, setMaps] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

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
      setGameState(state);
      if (state.players[newSocket.id]) {
        setMyRole(state.players[newSocket.id].role);
      }
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
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
      
      // Filter out auto-repeating keydowns
      if (key && (e.type === 'keyup' || !e.repeat)) {
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

  // Canvas Render Loop
  useEffect(() => {
    if (!canvasRef.current || !gameState) return;
    const ctx = canvasRef.current.getContext('2d');
    
    let animationFrameId;

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (!maps) return;
      const currentMap = maps[gameState.selectedMapIndex || 0];

      // Draw Map
      for (let row = 0; row < MAP_HEIGHT; row++) {
        for (let col = 0; col < MAP_WIDTH; col++) {
          if (currentMap && currentMap[row] && currentMap[row][col] === 1) {
            ctx.fillStyle = '#334155'; // Wall/Platform color
            ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            // Draw subtle border for bricks
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // Draw Players
      Object.values(gameState.players).forEach(player => {
        // Infection pending glow effect
        if (gameState.infectionPending) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'yellow';
        } else {
          ctx.shadowBlur = 10;
          ctx.shadowColor = player.color === 'green' ? '#22c55e' : '#3b82f6';
        }

        ctx.fillStyle = player.color === 'green' ? '#22c55e' : '#3b82f6';
        ctx.fillRect(player.x, player.y, TILE_SIZE, TILE_SIZE);
        
        ctx.shadowBlur = 0; // reset shadow

        // Draw Player Emoji inside box
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let emoji = player.role === 'zombie' ? '👹' : '😷';
        ctx.fillText(emoji, player.x + TILE_SIZE/2, player.y + TILE_SIZE/2 + 2); // +2 for slight vertical adjustment
        
        // Draw YOU label above if it's the current player
        if (player.id === socket?.id) {
            ctx.font = '12px Arial';
            ctx.textBaseline = 'bottom';
            ctx.fillText('YOU', player.x + TILE_SIZE/2, player.y - 5);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, socket, maps]);

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
          <p style={{ color: 'var(--text-muted)' }}>Run. Hide. Survive.</p>
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
          {/* Scoreboard Overlay */}
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

          {/* Canvas Game Board */}
          <div style={{ position: 'relative', width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, margin: '0 auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', borderRadius: '12px', overflow: 'hidden', border: '4px solid #1e293b' }}>
            
            <canvas 
              ref={canvasRef} 
              width={CANVAS_WIDTH} 
              height={CANVAS_HEIGHT} 
              style={{ display: 'block' }}
            />

            {/* UI Overlays inside Canvas Container */}
            {gameState.status === 'waiting' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: 'white', zIndex: 20 }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Waiting for Opponent...</h2>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderLeftColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '2rem' }}></div>
                
                {myRole === 'zombie' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#fbbf24' }}>ZOMBIE PERK: CHOOSE THE MAP</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <Button variant="secondary" onClick={() => selectMap('prev')}>&larr; Prev Map</Button>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Map {gameState.selectedMapIndex + 1}</span>
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

// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { io } from 'socket.io-client';
// import Button from '../components/Button';
// import Card from '../components/Card';

// const CANVAS_WIDTH = 800;
// const CANVAS_HEIGHT = 600;
// const PLAYER_SIZE = 50;
// const COIN_SIZE = 20;

// const Game = () => {
//   const navigate = useNavigate();
//   const [socket, setSocket] = useState(null);
//   const [gameState, setGameState] = useState(null);
//   const [myColor, setMyColor] = useState(null);
//   const [error, setError] = useState(null);
//   const [isConnected, setIsConnected] = useState(false);

//   useEffect(() => {
//     // Connect to Socket.io server
//     const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
//     const newSocket = io(backendUrl);

//     newSocket.on('connect', () => {
//       setIsConnected(true);
//       setError(null);
//     });

//     newSocket.on('game_state', (state) => {
//       setGameState(state);
//       // Figure out my color from state based on socket id
//       if (state.players[newSocket.id]) {
//         setMyColor(state.players[newSocket.id].color);
//       }
//     });

//     newSocket.on('error', (err) => {
//       setError(err.message);
//     });

//     setSocket(newSocket);

//     return () => {
//       newSocket.disconnect();
//     };
//   }, []);

//   // Keyboard controls
//   useEffect(() => {
//     if (!socket || !gameState || gameState.status !== 'playing') return;

//     const handleKeyDown = (e) => {
//       // Prevent default scrolling for arrow keys
//       if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
//         e.preventDefault();
//       }

//       switch (e.key) {
//         case 'ArrowUp':
//         case 'w':
//           socket.emit('move', 'up');
//           break;
//         case 'ArrowDown':
//         case 's':
//           socket.emit('move', 'down');
//           break;
//         case 'ArrowLeft':
//         case 'a':
//           socket.emit('move', 'left');
//           break;
//         case 'ArrowRight':
//         case 'd':
//           socket.emit('move', 'right');
//           break;
//         default:
//           break;
//       }
//     };

//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [socket, gameState?.status]);

//   const joinGame = () => {
//     if (socket) {
//       socket.emit('join_game');
//     }
//   };

//   return (
//     <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
//       <header style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
//         <div>
//           <h1 style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
//             Coin Collector
//           </h1>
//           <p style={{ color: 'var(--text-muted)' }}>Multiplayer Mini-Game</p>
//         </div>
//         <Button variant="ghost" onClick={() => navigate('/')}>Back to Dashboard</Button>
//       </header>

//       {error && (
//         <div style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
//           {error}
//         </div>
//       )}

//       {!gameState || !myColor ? (
//         <Card padding="lg" style={{ textAlign: 'center', width: '100%' }}>
//           <h2>Ready to play?</h2>
//           <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Join the global lobby to play against someone else.</p>
//           <Button variant="primary" size="lg" onClick={joinGame} disabled={!isConnected}>
//             {isConnected ? 'Join Game' : 'Connecting...'}
//           </Button>
//         </Card>
//       ) : (
//         <div style={{ width: '100%' }}>
//           {/* Scoreboard Overlay */}
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border)' }}>
//             <div style={{ display: 'flex', gap: '2rem' }}>
//               <div style={{ textAlign: 'center' }}>
//                 <span style={{ color: '#3b82f6', fontWeight: '800', fontSize: '1.5rem', display: 'block' }}>BLUE</span>
//                 <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>
//                   {Object.values(gameState.players).find(p => p.color === 'blue')?.score || 0}
//                 </span>
//               </div>
//               <div style={{ textAlign: 'center' }}>
//                 <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '1.5rem', display: 'block' }}>RED</span>
//                 <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>
//                   {Object.values(gameState.players).find(p => p.color === 'red')?.score || 0}
//                 </span>
//               </div>
//             </div>

//             <div style={{ textAlign: 'center' }}>
//               <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase' }}>Time Left</span>
//               <span style={{ fontSize: '2.5rem', fontWeight: '800', color: gameState.timeLeft <= 10 ? 'var(--error)' : 'var(--text-main)' }}>
//                 {gameState.timeLeft}s
//               </span>
//             </div>

//             <div style={{ textAlign: 'right' }}>
//               <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status</span>
//               <span style={{ fontWeight: 'bold', fontSize: '1.25rem', textTransform: 'uppercase', color: gameState.status === 'playing' ? 'var(--success)' : 'var(--accent-yellow)' }}>
//                 {gameState.status}
//               </span>
//               {myColor && (
//                 <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
//                   You are <span style={{ color: myColor === 'blue' ? '#3b82f6' : '#ef4444', fontWeight: 'bold' }}>{myColor.toUpperCase()}</span>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Game Board */}
//           <div style={{
//             position: 'relative',
//             width: `${CANVAS_WIDTH}px`,
//             height: `${CANVAS_HEIGHT}px`,
//             backgroundColor: '#0f172a',
//             borderRadius: '12px',
//             overflow: 'hidden',
//             margin: '0 auto',
//             boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
//             border: '4px solid #1e293b'
//           }}>
//             {/* Render Coins */}
//             {gameState.coins.map(coin => (
//               <div
//                 key={coin.id}
//                 style={{
//                   position: 'absolute',
//                   left: `${coin.x}px`,
//                   top: `${coin.y}px`,
//                   width: `${COIN_SIZE}px`,
//                   height: `${COIN_SIZE}px`,
//                   backgroundColor: '#fbbf24',
//                   borderRadius: '50%',
//                   boxShadow: '0 0 15px #fbbf24, inset 0 0 5px #f59e0b',
//                   transition: 'transform 0.2s',
//                   transform: 'scale(1)',
//                 }}
//               />
//             ))}

//             {/* Render Bombs */}
//             {gameState.bombs?.map(bomb => (
//               <div
//                 key={bomb.id}
//                 style={{
//                   position: 'absolute',
//                   left: `${bomb.x}px`,
//                   top: `${bomb.y}px`,
//                   width: `${COIN_SIZE * 1.5}px`,
//                   height: `${COIN_SIZE * 1.5}px`,
//                   fontSize: '1.5rem',
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   animation: 'pulse 1s infinite alternate',
//                   zIndex: 5
//                 }}
//               >
//                 💣
//               </div>
//             ))}

//             {/* Render Players */}
//             {Object.values(gameState.players).map(player => (
//               <div
//                 key={player.id}
//                 style={{
//                   position: 'absolute',
//                   left: `${player.x}px`,
//                   top: `${player.y}px`,
//                   width: `${PLAYER_SIZE}px`,
//                   height: `${PLAYER_SIZE}px`,
//                   backgroundColor: player.color === 'blue' ? '#3b82f6' : '#ef4444',
//                   borderRadius: '8px',
//                   boxShadow: `0 0 20px ${player.color === 'blue' ? '#3b82f6' : '#ef4444'}`,
//                   transition: 'all 0.05s linear', // smooth movement interpolation
//                   zIndex: 10,
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   color: 'white',
//                   fontWeight: 'bold',
//                   fontSize: '1.5rem'
//                 }}
//               >
//                 {player.id === socket.id ? '😎' : ''}
//               </div>
//             ))}

//             {gameState.status === 'waiting' && (
//               <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: 'white', zIndex: 20 }}>
//                 <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Waiting for Opponent...</h2>
//                 <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderLeftColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
//               </div>
//             )}

//             {gameState.status === 'finished' && (
//               <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: 'white', zIndex: 20 }}>
//                 <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: '#fbbf24' }}>TIME'S UP!</h1>
//                 <h2 style={{ fontSize: '2rem' }}>
//                   {Object.values(gameState.players).find(p => p.color === 'blue')?.score > Object.values(gameState.players).find(p => p.color === 'red')?.score ? 'BLUE WINS!' : 
//                    Object.values(gameState.players).find(p => p.color === 'red')?.score > Object.values(gameState.players).find(p => p.color === 'blue')?.score ? 'RED WINS!' : 'TIE!'}
//                 </h2>
//                 <p style={{ marginTop: '2rem', color: '#94a3b8' }}>Starting a new game soon...</p>
//               </div>
//             )}
//           </div>
//           <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem' }}>Use WASD or Arrow Keys to move.</p>
//         </div>
//       )}
      
//       <style>{`
//         @keyframes spin {
//           to { transform: rotate(360deg); }
//         }
//         @keyframes pulse {
//           0% { transform: scale(1); filter: drop-shadow(0 0 5px red); }
//           100% { transform: scale(1.2); filter: drop-shadow(0 0 15px red); }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default Game;
