// Shogi board implementation using ShogiBoard class

console.log('SHOGI BOARD SCRIPT LOADED!');

// Use the existing socket from socket-client.js
console.log('Socket.IO client loaded:', typeof io);

// Global shogi board instance
let shogiBoard;

// Setup mode state
let setupMode = false;
let selectedPieceForPlacement = null;

// Drop mode state
let dropMode = false;
let selectedDropPiece = null;

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
  
  // Add some test captured pieces for debugging
  shogiBoard.capturedPieces[1]['P'] = 2;
  shogiBoard.capturedPieces[1]['R'] = 1;
  shogiBoard.capturedPieces[2]['P'] = 1;
  shogiBoard.capturedPieces[2]['S'] = 1;
  shogiBoard.renderCapturedPieces();
  
  console.log('Test captured pieces added:', shogiBoard.capturedPieces);
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
  
  // Setup mode toggle button
  const setupModeButton = document.getElementById('toggle-setup-mode');
  if (setupModeButton) {
    setupModeButton.addEventListener('click', toggleSetupMode);
  }
  
  // Clear board button
  const clearBoardButton = document.getElementById('clear-board');
  if (clearBoardButton) {
    clearBoardButton.addEventListener('click', () => {
      if (confirm('Clear the entire board?')) {
        shogiBoard.clearBoard();
        shogiBoard.render();
        updateGameStatus();
      }
    });
  }
  
  // Piece palette event handlers
  setupPieceePaletteHandlers();
}

// Toggle setup mode
function toggleSetupMode() {
  setupMode = !setupMode;
  selectedPieceForPlacement = null;
  
  const setupButton = document.getElementById('toggle-setup-mode');
  const paletteDiv = document.getElementById('piece-palette');
  const setupStatus = document.getElementById('setup-status');
  const gameStatus = document.getElementById('game-status');
  
  if (setupMode) {
    setupButton.textContent = 'Exit Setup Mode';
    paletteDiv.style.display = 'block';
    setupStatus.style.display = 'block';
    gameStatus.style.display = 'none';
    document.body.classList.add('setup-mode-active');
    
    // Override the board's click handler for setup mode
    shogiBoard.setupMode = true;
    shogiBoard.onCellClick = handleSetupModeClick;
  } else {
    setupButton.textContent = 'Setup Mode';
    paletteDiv.style.display = 'none';
    setupStatus.style.display = 'none';
    gameStatus.style.display = 'block';
    document.body.classList.remove('setup-mode-active');
    
    // Restore normal game mode
    shogiBoard.setupMode = false;
    shogiBoard.onCellClick = null; // Use default click handler
    clearPaletteSelection();
  }
  
  shogiBoard.clearSelection();
  shogiBoard.render();
}

// Setup piece palette handlers
function setupPieceePaletteHandlers() {
  const paletteePieces = document.querySelectorAll('.palette-piece');
  paletteePieces.forEach(piece => {
    piece.addEventListener('click', () => {
      // Clear previous selection
      clearPaletteSelection();
      
      // Select new piece
      piece.classList.add('selected');
      selectedPieceForPlacement = {
        type: piece.dataset.piece,
        player: parseInt(piece.dataset.player)
      };
      
      updateSelectedPieceDisplay();
    });
  });
}

// Clear palette selection
function clearPaletteSelection() {
  document.querySelectorAll('.palette-piece').forEach(piece => {
    piece.classList.remove('selected');
  });
  selectedPieceForPlacement = null;
  updateSelectedPieceDisplay();
}

// Update selected piece display
function updateSelectedPieceDisplay() {
  const display = document.getElementById('selected-piece-display');
  if (selectedPieceForPlacement) {
    if (selectedPieceForPlacement.type === 'REMOVE') {
      display.textContent = 'Selected: Remove piece';
    } else {
      const pieceName = shogiBoard.pieceTypes[selectedPieceForPlacement.type]?.name || selectedPieceForPlacement.type;
      display.textContent = `Selected: Player ${selectedPieceForPlacement.player} ${pieceName}`;
    }
  } else {
    display.textContent = 'No piece selected';
  }
}

// Handle setup mode cell clicks
function handleSetupModeClick(x, y) {
  if (!selectedPieceForPlacement) {
    alert('Please select a piece from the palette first');
    return;
  }
  
  if (selectedPieceForPlacement.type === 'REMOVE') {
    // Remove piece from board
    shogiBoard.setPiece(x, y, null);
  } else {
    // Place piece on board
    const piece = {
      type: selectedPieceForPlacement.type,
      player: selectedPieceForPlacement.player,
      promoted: false
    };
    shogiBoard.setPiece(x, y, piece);
  }
  
  shogiBoard.render();
}

// Update game status display
function updateGameStatus() {
  const currentPlayerElement = document.getElementById('current-player');
  if (currentPlayerElement) {
    currentPlayerElement.textContent = shogiBoard.currentPlayer;
  }
  
  // The ShogiBoard class handles captured pieces display automatically
  // No need to call updateCapturedPiecesDisplay() here
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

// Handle captured piece click for dropping (make globally accessible)
window.handleCapturedPieceClick = function(pieceType, player) {
  console.log(`Clicked to drop ${pieceType} for player ${player}`);
  
  // Only allow current player to drop their pieces
  if (player !== shogiBoard.currentPlayer) {
    alert(`It's Player ${shogiBoard.currentPlayer}'s turn!`);
    return;
  }
  
  // Toggle drop mode
  if (dropMode && selectedDropPiece && 
      selectedDropPiece.type === pieceType && 
      selectedDropPiece.player === player) {
    // Cancel drop mode
    exitDropMode();
  } else {
    // Enter drop mode
    enterDropMode(pieceType, player);
  }
};

// Enter drop mode
function enterDropMode(pieceType, player) {
  // Use the ShogiBoard class's drop mode
  shogiBoard.enterDropMode(pieceType, player);
  
  // Update external drop mode state for visual feedback
  dropMode = true;
  selectedDropPiece = { type: pieceType, player: player };
  
  // Show visual feedback
  updateDropModeDisplay();
  highlightValidDropPositions();
}

// Exit drop mode
function exitDropMode() {
  // Use the ShogiBoard class's exit drop mode
  shogiBoard.exitDropMode();
  
  // Update external drop mode state
  dropMode = false;
  selectedDropPiece = null;
  
  // Clear visual feedback
  clearDropModeDisplay();
}

// Clear drop mode visual display
function clearDropModeDisplay() {
  updateGameStatus(); // Reset to normal status
}

// Update drop mode visual display
function updateDropModeDisplay() {
  // The ShogiBoard class handles captured pieces display automatically
  // Just update the game status
  const gameStatus = document.getElementById('game-status');
  if (gameStatus && selectedDropPiece) {
    const pieceName = shogiBoard.pieceTypes[selectedDropPiece.type].name;
    gameStatus.innerHTML = `<span style="color: #c41e3a; font-weight: bold;">DROP MODE: Click board to drop ${pieceName}</span>`;
  }
}

// Highlight valid drop positions
function highlightValidDropPositions() {
  if (!selectedDropPiece) return;
  
  // Add highlighting to valid positions
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      if (shogiBoard.isValidDropPosition(x, y, selectedDropPiece.type, selectedDropPiece.player)) {
        const cell = document.getElementById(`cell-${x}-${y}`);
        if (cell) {
          cell.classList.add('possible-drop');
        }
      }
    }
  }
}

// Highlight valid drop positions
function highlightValidDropPositions() {
  if (!selectedDropPiece) return;
  
  // Add highlighting to valid positions
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      if (isValidDropPosition(x, y, selectedDropPiece.type, selectedDropPiece.player)) {
        const cell = document.getElementById(`cell-${x}-${y}`);
        if (cell) {
          cell.classList.add('possible-drop');
        }
      }
    }
  }
}
