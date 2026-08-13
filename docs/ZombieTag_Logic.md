# Zombie Tag Logic

## Game Loop & Physics

Zombie Tag runs a custom 2D platformer physics engine entirely on the backend (`gameServer.js`). 

The engine runs at **60 Frames Per Second (FPS)** using Node.js's `setInterval`. Every 16.6ms, the server processes player inputs, applies physics, and broadcasts the new positions to all connected clients.

### Collision Detection
We use **AABB (Axis-Aligned Bounding Box)** collision testing. 
The maps are stored as 2D arrays (matrices) where `0` is Air and `1` is a Wall.
Every tick, the engine predicts where the player is going (`player.y + dy`). It checks the 2D array coordinates corresponding to the four corners of the player's bounding box.
If any of those corners land on a `1`, a collision is detected.

```javascript
const isSolid = (x, y) => {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  if (row < 0 || row >= MAP_HEIGHT || col < 0 || col >= MAP_WIDTH) return true;
  return MAPS[gameState.selectedMapIndex][row][col] === 1;
};
```

### Jump Locking
To prevent a player from simply holding down the Jump key and bouncing forever, a `jumpHeld` flag is used.
When the player presses Jump, `jumpHeld` is set to `true` and the vertical velocity (`vy`) is updated. The player cannot jump again until the server receives a `keyup` event from the client, which resets the flag.

## Infection Mechanics

When the game starts, one player is designated the **Zombie (👹)** and the other is the **Survivor (😷)**.

During the physics loop, after positions are updated, the server checks if the two players' bounding boxes are overlapping:
```javascript
const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
if (dist < TILE_SIZE) {
  // Tag!
}
```

If a tag occurs:
1. The server flags `infectionPending = true`.
2. A 1-second timeout begins. During this timeout, the frontend flashes the screen yellow.
3. After 1 second, the roles are swapped (Zombie becomes Survivor, Survivor becomes Zombie).
4. `infectionPending` is cleared, allowing tags to happen again.

If the 2-minute timer expires, whoever is currently the Survivor wins!
