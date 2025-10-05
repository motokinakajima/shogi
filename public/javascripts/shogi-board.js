// Basic shogi board logic and Socket.IO integration

console.log('SHOGI BOARD SCRIPT LOADED!');

// Use the existing socket from socket-client.js
console.log('Socket.IO client loaded:', typeof io);

// Temporarily disabled socket events
// socket.on('connect', () => {
//   console.log('Connected to Socket.IO server!');
//   socket.emit('test', { msg: 'Hello from client!' });
// });

// socket.on('test', (data) => {
//   console.log('Received test event from server:', data);
// });

// 9x9 board with scattered pieces
let board = Array(9).fill().map(() => Array(9).fill(null));

// Game state
let selectedPiece = null; // {x, y} of selected piece
let possibleMoves = []; // Array of {x, y} for valid moves

// Scatter some pieces on the board for testing
board[4][4] = '飛'; // Hisha at center
board[2][2] = '角'; // Kaku (Bishop)
board[6][6] = '金'; // Kin (Gold)
board[1][7] = '銀'; // Gin (Silver)
board[7][1] = '桂'; // Keima (Knight)
board[0][8] = '香'; // Kyosha (Lance)
board[8][0] = '歩'; // Fu (Pawn)
board[4][0] = '王'; // Ou (King)
board[3][5] = '歩'; // Another pawn for collision testing

console.log('Board after setting pieces:', board);

function renderBoard() {
  console.log('renderBoard called');
  console.log('Board state:', board);
  console.log('Board[4][4] (center):', board[4][4]);
  
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const cell = document.getElementById(`cell-${x}-${y}`);
      if (cell) {
        const piece = board[y][x];
        cell.textContent = piece || '';
        
        if (piece) {
          console.log(`Setting cell-${x}-${y} to: "${piece}"`);
        }
        
        cell.onclick = () => handleCellClick(x, y);
        
        // Reset cell styling
        cell.className = '';
        
        // Highlight selected piece
        if (selectedPiece && selectedPiece.x === x && selectedPiece.y === y) {
          cell.style.backgroundColor = '#ff6b6b';
        }
        // Highlight possible moves
        else if (possibleMoves.some(move => move.x === x && move.y === y)) {
          cell.style.backgroundColor = '#4ecdc4';
        }
        // Normal cell
        else {
          cell.style.backgroundColor = '#deb887';
        }
      } else {
        console.log(`Cell not found: cell-${x}-${y}`);
      }
    }
  }
  console.log('Board rendered');
}

function handleCellClick(x, y) {
  // If clicking on selected piece, cancel selection
  if (selectedPiece && selectedPiece.x === x && selectedPiece.y === y) {
    selectedPiece = null;
    possibleMoves = [];
    renderBoard();
    return;
  }
  
  // If clicking on a possible move, make the move
  if (possibleMoves.some(move => move.x === x && move.y === y)) {
    makeMove(selectedPiece.x, selectedPiece.y, x, y);
    return;
  }
  
  // If clicking on a piece, select it
  if (board[y][x]) {
    selectedPiece = { x, y };
    possibleMoves = getPossibleMoves(x, y, board[y][x]);
    renderBoard();
  }
}

function makeMove(fromX, fromY, toX, toY) {
  const piece = board[fromY][fromX];
  board[fromY][fromX] = null;
  board[toY][toX] = piece;
  
  // Temporarily disabled socket communication
  // socket.emit('move', { fromX, fromY, toX, toY, piece });
  
  // Clear selection
  selectedPiece = null;
  possibleMoves = [];
  renderBoard();
}

function getPossibleMoves(x, y, piece) {
  // Use the piece definitions from shogi-pieces.js
  return getPossibleMovesForPiece(x, y, piece, board);
}

// Temporarily disabled socket events that override board state
// socket.on('move', ({ fromX, fromY, toX, toY, piece }) => {
//   board[fromY][fromX] = null;
//   board[toY][toX] = piece;
//   selectedPiece = null;
//   possibleMoves = [];
//   renderBoard();
// });

// socket.on('board', (newBoard) => {
//   console.log('Received board from server:', newBoard);
//   board = newBoard;
//   selectedPiece = null;
//   possibleMoves = [];
//   renderBoard();
// });

// Render board when page loads
window.onload = () => {
  console.log('Page loaded, rendering board...');
  renderBoard();
};
