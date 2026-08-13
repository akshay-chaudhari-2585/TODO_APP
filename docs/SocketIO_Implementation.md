# Socket.io Implementation

This project uses `socket.io` to provide real-time, bidirectional communication between the Node.js backend and the React frontend.

## Architecture

The server maintains the authoritative state of the game in memory. The frontend is merely a "dumb terminal" that sends keystrokes to the backend and renders whatever state the backend tells it to render. This prevents cheating and keeps physics perfectly synchronized for both players.

### Backend (`/backend/src/socket/gameServer.js`)
- The server runs an authoritative game loop (`setInterval`) at 60 FPS.
- On every tick, it calculates the new `gameState` and broadcasts it to all connected sockets via `io.emit('game_state', gameState)`.
- It listens for specific events from clients, such as:
  - `join_game`: Adds the socket to the game, assigning them a role (`zombie` or `survivor`).
  - `input`: Updates the `inputs` object (e.g. `{ left: true, right: false, jump: false }`) for that specific player in the `gameState`.
  - `select_map`: Modifies the `selectedMapIndex` if the game is in the lobby phase.

### Frontend (`/frontend/src/pages/Game.jsx`)
- Upon mounting, the React component creates a connection via `io(backendUrl)`.
- It listens for the `init_config` event to download the map layouts from the database.
- It listens for the `game_state` event, which occurs 60 times a second. It immediately dumps this state into a React state variable (`setGameState(state)`).
- The `requestAnimationFrame` render loop simply draws the Canvas based entirely on the contents of the `gameState`.
- When a user presses a key (`keydown` or `keyup`), an `input` event is emitted directly to the server. No local physics or movement predictions are performed on the frontend.
