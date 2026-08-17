import { Chess } from 'chess.js';

const chess = new Chess();
try {
  console.log('Testing normal move e2-e4');
  chess.move({ from: 'e2', to: 'e4', promotion: 'q' });
  console.log('Move successful, FEN:', chess.fen());
} catch (e) {
  console.error('Error:', e);
}

try {
  console.log('Testing normal move string e4');
  chess.move('e4');
  console.log('Move successful, FEN:', chess.fen());
} catch (e) {
  console.error('Error:', e);
}
