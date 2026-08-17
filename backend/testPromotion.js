import { Chess } from 'chess.js';
const chess = new Chess();
try {
  chess.move({ from: 'e2', to: 'e4', promotion: 'q' });
  console.log('Move successful');
} catch (e) {
  console.log('Error:', e.message);
}
