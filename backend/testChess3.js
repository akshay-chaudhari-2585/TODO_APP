import { Chess } from 'chess.js';

const chess = new Chess();
try {
  const result = chess.move({ from: 'e2', to: 'e5', promotion: 'q' });
  console.log('Result of invalid move:', result);
} catch (e) {
  console.error('Error on invalid move:', e.message);
}
