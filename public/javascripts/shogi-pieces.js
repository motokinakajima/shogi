// Shogi piece definitions and movement patterns

const PIECES = {
  '飛': { // Hisha (Rook)
    name: 'Hisha',
    moves: [
      // Horizontal moves (left and right)
      [-8, 0], [-7, 0], [-6, 0], [-5, 0], [-4, 0], [-3, 0], [-2, 0], [-1, 0],
      [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0],
      // Vertical moves (up and down)
      [0, -8], [0, -7], [0, -6], [0, -5], [0, -4], [0, -3], [0, -2], [0, -1],
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8]
    ]
  },
  
  '角': { // Kaku (Bishop)
    name: 'Kaku',
    moves: [
      // Diagonal moves
      [-8, -8], [-7, -7], [-6, -6], [-5, -5], [-4, -4], [-3, -3], [-2, -2], [-1, -1],
      [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8],
      [-8, 8], [-7, 7], [-6, 6], [-5, 5], [-4, 4], [-3, 3], [-2, 2], [-1, 1],
      [1, -1], [2, -2], [3, -3], [4, -4], [5, -5], [6, -6], [7, -7], [8, -8]
    ]
  },
  
  '金': { // Kin (Gold General)
    name: 'Kin',
    moves: [
      [0, -1], [1, -1], [-1, -1], // Forward and diagonally forward
      [0, 1], // Backward
      [1, 0], [-1, 0] // Left and right
    ]
  },
  
  '銀': { // Gin (Silver General)  
    name: 'Gin',
    moves: [
      [0, -1], [1, -1], [-1, -1], // Forward and diagonally forward
      [1, 1], [-1, 1] // Diagonally backward
    ]
  },
  
  '桂': { // Keima (Knight)
    name: 'Keima',
    moves: [
      [1, -2], [-1, -2] // L-shaped moves forward
    ]
  },
  
  '香': { // Kyosha (Lance)
    name: 'Kyosha',
    moves: [
      [0, -1], [0, -2], [0, -3], [0, -4], [0, -5], [0, -6], [0, -7], [0, -8] // Forward only
    ]
  },
  
  '歩': { // Fu (Pawn)
    name: 'Fu',
    moves: [
      [0, -1] // One step forward
    ]
  },
  
  '王': { // Ou (King)
    name: 'Ou',
    moves: [
      [0, -1], [1, -1], [-1, -1], // Forward moves
      [0, 1], [1, 1], [-1, 1], // Backward moves  
      [1, 0], [-1, 0] // Left and right
    ]
  }
};

// Check if a move is valid (within board bounds and handles collisions)
function isValidMove(fromX, fromY, toX, toY, board) {
  // Check board boundaries
  if (toX < 0 || toX >= 9 || toY < 0 || toY >= 9) {
    return false;
  }
  
  // Check if destination has our own piece (collision with own piece)
  if (board[toY][toX] !== null) {
    // For now, we'll allow capturing (moving to a square with opponent piece)
    // In a full game, you'd check piece ownership here
    return true;
  }
  
  return true;
}

// Check if path is clear for sliding pieces (Hisha, Kaku, Kyosha)
function isPathClear(fromX, fromY, toX, toY, board) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  
  // Get direction (normalize to -1, 0, or 1)
  const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
  const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
  
  // Check each square along the path (excluding start and end)
  let checkX = fromX + stepX;
  let checkY = fromY + stepY;
  
  while (checkX !== toX || checkY !== toY) {
    if (board[checkY][checkX] !== null) {
      return false; // Path blocked
    }
    checkX += stepX;
    checkY += stepY;
  }
  
  return true;
}

// Get all possible moves for a piece at a given position
function getPossibleMovesForPiece(x, y, piece, board) {
  const pieceData = PIECES[piece];
  if (!pieceData) return [];
  
  const possibleMoves = [];
  
  for (const [dx, dy] of pieceData.moves) {
    const newX = x + dx;
    const newY = y + dy;
    
    if (isValidMove(x, y, newX, newY, board)) {
      // For sliding pieces, check if path is clear
      if (piece === '飛' || piece === '角' || piece === '香') {
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { // Multi-step move
          if (isPathClear(x, y, newX, newY, board)) {
            possibleMoves.push({ x: newX, y: newY });
          }
        } else {
          possibleMoves.push({ x: newX, y: newY });
        }
      } else {
        possibleMoves.push({ x: newX, y: newY });
      }
    }
  }
  
  return possibleMoves;
}
