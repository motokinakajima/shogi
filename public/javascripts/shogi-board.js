// Shogi board implementation using ShogiBoard class

console.log('SHOGI BOARD SCRIPT LOADED!');

// Use the existing socket from socket-client.js
console.log('Socket.IO client loaded:', typeof io);

// Global shogi board instance
let shogiBoard;

// Initialize the board when page loads
window.onload = () => {
  console.log('Page loaded, initializing ShogiBoard...');
  
  // Create ShogiBoard instance with custom handlers
  shogiBoard = new ShogiBoard({
    boardElementId: 'shogi-board',
    cellIdPattern: 'cell-{x}-{y}',
    
    // Custom promotion handler
    onPromotion: (piece, position, callback) => {
      const pieceName = shogiBoard.pieceTypes[piece.type].name;
      const shouldPromote = confirm(`Promote ${pieceName}?`);
      callback(shouldPromote);
    },
    
    // Custom game event handler
    onGameEvent: (gameState) => {
      console.log('Game state changed:', gameState);
      updateGameStatus();
    },
    
    // Socket event handler (currently disabled)
    onSocketEvent: null // Will enable later: (event, data) => socket.emit(event, data)
  });
  
  // Set up additional UI handlers
  setupUIHandlers();
  
  // Initial render
  shogiBoard.render();
  updateGameStatus();
};

// Set up UI event handlers
function setupUIHandlers() {
  // Flip board button
  const flipButton = document.getElementById('flip-board');
  if (flipButton) {
    flipButton.addEventListener('click', () => {
      shogiBoard.flipBoard();
    });
  }
  
  // Reset game button
  const resetButton = document.getElementById('reset-game');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (confirm('Reset the game?')) {
        shogiBoard.initializeStandardBoard();
        shogiBoard.currentPlayer = 1;
        shogiBoard.clearSelection();
        shogiBoard.render();
        updateGameStatus();
      }
    });
  }
}

// Update game status display
function updateGameStatus() {
  const currentPlayerElement = document.getElementById('current-player');
  if (currentPlayerElement) {
    currentPlayerElement.textContent = shogiBoard.currentPlayer;
  }
  
  // Update captured pieces display
  updateCapturedPiecesDisplay();
}

// Update captured pieces display
function updateCapturedPiecesDisplay() {
  for (let player = 1; player <= 2; player++) {
    const container = document.getElementById(`player${player}-pieces`);
    if (container) {
      container.innerHTML = '';
      
      const captured = shogiBoard.capturedPieces[player];
      for (const [pieceType, count] of Object.entries(captured)) {
        if (count > 0) {
          const pieceElement = document.createElement('span');
          const pieceChar = shogiBoard.pieceTypes[pieceType].char;
          pieceElement.textContent = `${pieceChar}×${count} `;
          pieceElement.style.cursor = 'pointer';
          pieceElement.title = `Drop ${shogiBoard.pieceTypes[pieceType].name}`;
          
          // Add click handler for dropping pieces (placeholder)
          pieceElement.addEventListener('click', () => {
            console.log(`Clicked to drop ${pieceType}`);
            // TODO: Implement drop piece UI
          });
          
          container.appendChild(pieceElement);
        }
      }
    }
  }
}

// Socket event handlers (temporarily disabled)
// socket.on('connect', () => {
//   console.log('Connected to Socket.IO server!');
//   socket.emit('test', { msg: 'Hello from client!' });
// });

// socket.on('test', (data) => {
//   console.log('Received test event from server:', data);
// });

// socket.on('move', (data) => {
//   console.log('Received move from server:', data);
//   // Handle incoming moves
// });

// socket.on('board', (boardState) => {
//   console.log('Received board state from server:', boardState);
//   shogiBoard.setBoardState(boardState);
// });

// Utility functions for external access
function getCurrentBoardState() {
  return shogiBoard ? shogiBoard.getBoardState() : null;
}

function makeMove(fromX, fromY, toX, toY) {
  if (shogiBoard) {
    shogiBoard.makeMove(fromX, fromY, toX, toY);
  }
}

// Export functions for external use
window.shogiGame = {
  board: () => shogiBoard,
  getBoardState: getCurrentBoardState,
  makeMove: makeMove,
  flipBoard: () => shogiBoard && shogiBoard.flipBoard(),
  reset: () => shogiBoard && shogiBoard.initializeStandardBoard()
};
