// ShogiBoard Class - Comprehensive Shogi game management

class ShogiBoard {
  constructor(options = {}) {
    // Configuration
    this.boardElementId = options.boardElementId || 'shogi-board';
    this.cellIdPattern = options.cellIdPattern || 'cell-{x}-{y}';
    this.onPromotion = options.onPromotion || this.defaultPromotionHandler;
    this.onGameEvent = options.onGameEvent || this.defaultGameEventHandler;
    this.onSocketEvent = options.onSocketEvent || null;
    
    // Board state
    this.board = Array(9).fill().map(() => Array(9).fill(null));
    this.capturedPieces = { 1: {}, 2: {} }; // captured pieces by player
    this.currentPlayer = 1; // 1 or 2
    this.selectedPiece = null; // {x, y}
    this.possibleMoves = [];
    this.gameState = 'playing'; // 'playing', 'check', 'checkmate', 'stalemate'
    this.isFlipped = false; // board orientation
    
    // Drop mode properties
    this.dropMode = false;
    this.selectedDropPiece = null;
    
    // Piece definitions with alphabetic IDs for reliability
    this.pieceTypes = {
      'K': { char: '王', name: 'King', promotesTo: null },
      'R': { char: '飛', name: 'Rook', promotesTo: 'DR' },
      'B': { char: '角', name: 'Bishop', promotesTo: 'DB' },
      'G': { char: '金', name: 'Gold', promotesTo: null },
      'S': { char: '銀', name: 'Silver', promotesTo: 'PS' },
      'N': { char: '桂', name: 'Knight', promotesTo: 'PN' },
      'L': { char: '香', name: 'Lance', promotesTo: 'PL' },
      'P': { char: '歩', name: 'Pawn', promotesTo: 'PP' },
      // Promoted pieces
      'DR': { char: '竜', name: 'Dragon King', promotesTo: null },
      'DB': { char: '馬', name: 'Dragon Horse', promotesTo: null },
      'PS': { char: '成銀', name: 'Promoted Silver', promotesTo: null },
      'PN': { char: '成桂', name: 'Promoted Knight', promotesTo: null },
      'PL': { char: '成香', name: 'Promoted Lance', promotesTo: null },
      'PP': { char: 'と', name: 'Tokin', promotesTo: null }
    };
    
    // Initialize board with standard setup
    this.initializeStandardBoard();
    
    // Set up DOM event handlers
    this.setupEventHandlers();
  }
  
  // Create piece object
  createPiece(type, owner, isPromoted = false) {
    return {
      type: type,
      owner: owner, // 1 or 2
      isPromoted: isPromoted,
      id: `${type}_${owner}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }
  
  // Initialize board with standard Shogi starting position
  initializeStandardBoard() {
    // Clear board
    this.board = Array(9).fill().map(() => Array(9).fill(null));
    
    // Player 2 pieces (top of board, y=0-2)
    // Back row (y=0)
    this.board[0][0] = this.createPiece('L', 2);
    this.board[0][1] = this.createPiece('N', 2);
    this.board[0][2] = this.createPiece('S', 2);
    this.board[0][3] = this.createPiece('G', 2);
    this.board[0][4] = this.createPiece('K', 2);
    this.board[0][5] = this.createPiece('G', 2);
    this.board[0][6] = this.createPiece('S', 2);
    this.board[0][7] = this.createPiece('N', 2);
    this.board[0][8] = this.createPiece('L', 2);
    
    // Second row (y=1)
    this.board[1][1] = this.createPiece('R', 2);
    this.board[1][7] = this.createPiece('B', 2);
    
    // Third row (y=2) - Pawns
    for (let x = 0; x < 9; x++) {
      this.board[2][x] = this.createPiece('P', 2);
    }
    
    // Player 1 pieces (bottom of board, y=6-8)
    // Seventh row (y=6) - Pawns
    for (let x = 0; x < 9; x++) {
      this.board[6][x] = this.createPiece('P', 1);
    }
    
    // Eighth row (y=7)
    this.board[7][1] = this.createPiece('B', 1);
    this.board[7][7] = this.createPiece('R', 1);
    
    // Ninth row (y=8)
    this.board[8][0] = this.createPiece('L', 1);
    this.board[8][1] = this.createPiece('N', 1);
    this.board[8][2] = this.createPiece('S', 1);
    this.board[8][3] = this.createPiece('G', 1);
    this.board[8][4] = this.createPiece('K', 1);
    this.board[8][5] = this.createPiece('G', 1);
    this.board[8][6] = this.createPiece('S', 1);
    this.board[8][7] = this.createPiece('N', 1);
    this.board[8][8] = this.createPiece('L', 1);
  }
  
  // Set up DOM event handlers
  setupEventHandlers() {
    // Set up click handlers for all cells
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const cell = this.getCell(x, y);
        if (cell) {
          cell.addEventListener('click', (e) => this.handleCellClick(x, y, e));
        }
      }
    }
  }
  
  // Get DOM cell element
  getCell(x, y) {
    const cellId = this.cellIdPattern.replace('{x}', x).replace('{y}', y);
    return document.getElementById(cellId);
  }
  
  // Convert coordinates for flipped board
  getDisplayCoordinates(x, y) {
    if (this.isFlipped) {
      return { x: 8 - x, y: 8 - y };
    }
    return { x, y };
  }
  
  // Handle cell click events
  handleCellClick(x, y, event) {
    // Convert display coordinates to board coordinates
    const boardX = this.isFlipped ? 8 - x : x;
    const boardY = this.isFlipped ? 8 - y : y;
    
    // Check for drop mode first
    if (this.dropMode && this.selectedDropPiece) {
      this.handleDropClick(boardX, boardY);
      return;
    }
    
    // If clicking on selected piece, cancel selection
    if (this.selectedPiece && this.selectedPiece.x === boardX && this.selectedPiece.y === boardY) {
      this.clearSelection();
      this.render();
      return;
    }
    
    // If clicking on a possible move, make the move
    if (this.possibleMoves.some(move => move.x === boardX && move.y === boardY)) {
      this.makeMove(this.selectedPiece.x, this.selectedPiece.y, boardX, boardY);
      return;
    }
    
    // If clicking on a piece owned by current player, select it
    const piece = this.board[boardY][boardX];
    if (piece && piece.owner === this.currentPlayer) {
      this.selectedPiece = { x: boardX, y: boardY };
      this.possibleMoves = this.getPossibleMoves(boardX, boardY);
      this.render();
    }
  }
  
  // Handle drop click during drop mode
  handleDropClick(x, y) {
    if (!this.selectedDropPiece) return;
    
    // Check if drop is valid
    if (this.isValidDropPosition(x, y, this.selectedDropPiece.type, this.selectedDropPiece.player)) {
      // Perform the drop
      const piece = this.createPiece(this.selectedDropPiece.type, this.selectedDropPiece.player);
      
      // Place piece on board
      this.board[y][x] = piece;
      
      // Remove from captured pieces
      this.capturedPieces[this.selectedDropPiece.player][this.selectedDropPiece.type]--;
      
      // Switch turns
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
      
      // Exit drop mode
      this.exitDropMode();
      
      // Update display
      this.render();
      this.renderCapturedPieces();
      
      console.log(`Dropped ${this.selectedDropPiece.type} at (${x}, ${y})`);
      
      // Notify external handler
      if (window.updateGameStatus) {
        window.updateGameStatus();
      }
    } else {
      alert('Invalid drop position!');
    }
  }
  
  // Check if drop position is valid
  isValidDropPosition(x, y, pieceType, player) {
    // Position must be empty
    if (this.board[y][x] !== null) {
      return false;
    }
    
    // Basic shogi drop rules
    if (pieceType === 'P') { // Pawn drop rules
      // Cannot drop pawn if there's already a pawn in the same column
      for (let row = 0; row < 9; row++) {
        const piece = this.board[row][x];
        if (piece && piece.type === 'P' && piece.owner === player && !piece.promoted) {
          return false;
        }
      }
      
      // Cannot drop pawn for immediate checkmate (simplified - just prevent drop on last rank)
      if ((player === 1 && y === 0) || (player === 2 && y === 8)) {
        return false;
      }
    }
    
    // Pieces that cannot be dropped on their starting edge
    if (pieceType === 'L') { // Lance
      if ((player === 1 && y === 0) || (player === 2 && y === 8)) {
        return false;
      }
    }
    
    if (pieceType === 'N') { // Knight
      if ((player === 1 && y <= 1) || (player === 2 && y >= 7)) {
        return false;
      }
    }
    
    return true;
  }
  
  // Enter drop mode
  enterDropMode(pieceType, player) {
    this.dropMode = true;
    this.selectedDropPiece = { type: pieceType, player: player };
    this.clearSelection(); // Clear any piece selection
    this.render(); // Re-render to show drop highlights
    console.log(`Entered drop mode: ${pieceType} for player ${player}`);
  }
  
  // Exit drop mode
  exitDropMode() {
    this.dropMode = false;
    this.selectedDropPiece = null;
    this.render(); // Re-render to remove drop highlights
    console.log('Exited drop mode');
  }

  // Clear selection
  clearSelection() {
    this.selectedPiece = null;
    this.possibleMoves = [];
  }
  
  // Make a move
  makeMove(fromX, fromY, toX, toY) {
    const piece = this.board[fromY][fromX];
    const capturedPiece = this.board[toY][toX];
    
    // Handle piece capture
    if (capturedPiece) {
      this.capturePiece(capturedPiece);
    }
    
    // Move piece
    this.board[fromY][fromX] = null;
    this.board[toY][toX] = piece;
    
    // Check for promotion
    if (this.canPromote(piece, toY)) {
      this.handlePromotion(piece, toX, toY);
    }
    
    // Clear selection
    this.clearSelection();
    
    // Switch players
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    
    // Check game state
    this.updateGameState();
    
    // Emit socket event if handler provided
    if (this.onSocketEvent) {
      this.onSocketEvent('move', { fromX, fromY, toX, toY, piece });
    }
    
    // Re-render board
    this.render();
  }
  
  // Handle piece capture
  capturePiece(piece) {
    const capturedType = piece.isPromoted ? this.getUnpromotedType(piece.type) : piece.type;
    const capturingPlayer = this.currentPlayer;
    
    if (!this.capturedPieces[capturingPlayer][capturedType]) {
      this.capturedPieces[capturingPlayer][capturedType] = 0;
    }
    this.capturedPieces[capturingPlayer][capturedType]++;
  }
  
  // Get unpromoted type of a piece
  getUnpromotedType(type) {
    const mapping = {
      'DR': 'R', 'DB': 'B', 'PS': 'S', 'PN': 'N', 'PL': 'L', 'PP': 'P'
    };
    return mapping[type] || type;
  }
  
  // Check if piece can promote
  canPromote(piece, toY) {
    if (!this.pieceTypes[piece.type].promotesTo || piece.isPromoted) {
      return false;
    }
    
    // Promotion zone: last 3 rows for each player
    if (piece.owner === 1 && toY <= 2) return true;
    if (piece.owner === 2 && toY >= 6) return true;
    
    return false;
  }
  
  // Handle promotion
  handlePromotion(piece, x, y) {
    // Call external promotion handler
    this.onPromotion(piece, { x, y }, (shouldPromote) => {
      if (shouldPromote) {
        piece.type = this.pieceTypes[piece.type].promotesTo;
        piece.isPromoted = true;
        this.render();
      }
    });
  }
  
  // Default promotion handler
  defaultPromotionHandler(piece, position, callback) {
    const shouldPromote = confirm(`Promote ${this.pieceTypes[piece.type].name}?`);
    callback(shouldPromote);
  }
  
  // Get possible moves for a piece
  getPossibleMoves(x, y) {
    const piece = this.board[y][x];
    if (!piece) return [];
    
    // Get movement patterns for the piece
    const movePattern = this.getPieceMovement(piece.type, piece.owner);
    const possibleMoves = [];
    
    for (const [dx, dy] of movePattern) {
      const newX = x + dx;
      const newY = y + dy;
      
      // Check board boundaries
      if (newX < 0 || newX >= 9 || newY < 0 || newY >= 9) {
        continue;
      }
      
      // Check if move is valid for this player
      if (this.isValidMoveForPlayer(x, y, newX, newY, piece)) {
        // For sliding pieces, check if path is clear
        if (this.isSlidingPiece(piece.type)) {
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { // Multi-step move
            if (this.isPathClear(x, y, newX, newY)) {
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
  
  // Convert board to format expected by existing move calculation
  getBoardForMoveCalculation() {
    return this.board.map(row => 
      row.map(cell => cell ? this.pieceTypes[cell.type].char : null)
    );
  }
  
  // Get movement pattern for a piece type and owner
  getPieceMovement(pieceType, owner) {
    // Base movement patterns (for player 1, moving "up" the board)
    const movements = {
      'K': [ // King
        [0, -1], [1, -1], [-1, -1], // Forward moves
        [0, 1], [1, 1], [-1, 1], // Backward moves  
        [1, 0], [-1, 0] // Left and right
      ],
      'R': [ // Rook
        // Horizontal moves (left and right)
        [-8, 0], [-7, 0], [-6, 0], [-5, 0], [-4, 0], [-3, 0], [-2, 0], [-1, 0],
        [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0],
        // Vertical moves (up and down)
        [0, -8], [0, -7], [0, -6], [0, -5], [0, -4], [0, -3], [0, -2], [0, -1],
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8]
      ],
      'B': [ // Bishop
        // Diagonal moves
        [-8, -8], [-7, -7], [-6, -6], [-5, -5], [-4, -4], [-3, -3], [-2, -2], [-1, -1],
        [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8],
        [-8, 8], [-7, 7], [-6, 6], [-5, 5], [-4, 4], [-3, 3], [-2, 2], [-1, 1],
        [1, -1], [2, -2], [3, -3], [4, -4], [5, -5], [6, -6], [7, -7], [8, -8]
      ],
      'G': [ // Gold General
        [0, -1], [1, -1], [-1, -1], // Forward and diagonally forward
        [0, 1], // Backward
        [1, 0], [-1, 0] // Left and right
      ],
      'S': [ // Silver General
        [0, -1], [1, -1], [-1, -1], // Forward and diagonally forward
        [1, 1], [-1, 1] // Diagonally backward
      ],
      'N': [ // Knight
        [1, -2], [-1, -2] // L-shaped moves forward
      ],
      'L': [ // Lance
        [0, -1], [0, -2], [0, -3], [0, -4], [0, -5], [0, -6], [0, -7], [0, -8] // Forward only
      ],
      'P': [ // Pawn
        [0, -1] // One step forward
      ],
      // Promoted pieces
      'DR': [ // Dragon King (Promoted Rook) - Rook + King
        // All rook moves plus king's diagonal moves
        [-8, 0], [-7, 0], [-6, 0], [-5, 0], [-4, 0], [-3, 0], [-2, 0], [-1, 0],
        [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0],
        [0, -8], [0, -7], [0, -6], [0, -5], [0, -4], [0, -3], [0, -2], [0, -1],
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
        [1, -1], [-1, -1], [1, 1], [-1, 1] // King's diagonal moves
      ],
      'DB': [ // Dragon Horse (Promoted Bishop) - Bishop + King
        // All bishop moves plus king's orthogonal moves
        [-8, -8], [-7, -7], [-6, -6], [-5, -5], [-4, -4], [-3, -3], [-2, -2], [-1, -1],
        [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8],
        [-8, 8], [-7, 7], [-6, 6], [-5, 5], [-4, 4], [-3, 3], [-2, 2], [-1, 1],
        [1, -1], [2, -2], [3, -3], [4, -4], [5, -5], [6, -6], [7, -7], [8, -8],
        [0, -1], [0, 1], [1, 0], [-1, 0] // King's orthogonal moves
      ],
      'PS': [ // Promoted Silver - moves like Gold
        [0, -1], [1, -1], [-1, -1], // Forward and diagonally forward
        [0, 1], // Backward
        [1, 0], [-1, 0] // Left and right
      ],
      'PN': [ // Promoted Knight - moves like Gold
        [0, -1], [1, -1], [-1, -1], // Forward and diagonally forward
        [0, 1], // Backward
        [1, 0], [-1, 0] // Left and right
      ],
      'PL': [ // Promoted Lance - moves like Gold
        [0, -1], [1, -1], [-1, -1], // Forward and diagonally forward
        [0, 1], // Backward
        [1, 0], [-1, 0] // Left and right
      ],
      'PP': [ // Promoted Pawn (Tokin) - moves like Gold
        [0, -1], [1, -1], [-1, -1], // Forward and diagonally forward
        [0, 1], // Backward
        [1, 0], [-1, 0] // Left and right
      ]
    };
    
    let pattern = movements[pieceType] || [];
    
    // For player 2, flip the Y coordinates (they move in opposite direction)
    if (owner === 2) {
      pattern = pattern.map(([dx, dy]) => [dx, -dy]);
    }
    
    return pattern;
  }
  
  // Check if piece is a sliding piece (can move multiple squares)
  isSlidingPiece(pieceType) {
    return ['R', 'B', 'L', 'DR', 'DB'].includes(pieceType);
  }
  
  // Check if path is clear for sliding pieces
  isPathClear(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    
    // Get direction (normalize to -1, 0, or 1)
    const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
    const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
    
    // Check each square along the path (excluding start and end)
    let checkX = fromX + stepX;
    let checkY = fromY + stepY;
    
    while (checkX !== toX || checkY !== toY) {
      if (this.board[checkY][checkX] !== null) {
        return false; // Path blocked
      }
      checkX += stepX;
      checkY += stepY;
    }
    
    return true;
  }
  
  // Check if move is valid for current player
  isValidMoveForPlayer(fromX, fromY, toX, toY, piece) {
    const targetPiece = this.board[toY][toX];
    
    // Can't capture own pieces
    if (targetPiece && targetPiece.owner === piece.owner) {
      return false;
    }
    
    // TODO: Add check detection logic here
    
    return true;
  }
  
  // Update game state (check, checkmate, etc.)
  updateGameState() {
    // TODO: Implement check/checkmate detection
    this.gameState = 'playing';
    
    if (this.onGameEvent) {
      this.onGameEvent(this.gameState);
    }
  }
  
  // Default game event handler
  defaultGameEventHandler(event) {
    console.log('Game event:', event);
  }
  
  // Flip board orientation
  flipBoard() {
    this.isFlipped = !this.isFlipped;
    this.render();
  }
  
  // Render the board
  render() {
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        // Get the actual board position
        const boardX = this.isFlipped ? 8 - x : x;
        const boardY = this.isFlipped ? 8 - y : y;
        
        const cell = this.getCell(x, y);
        if (!cell) continue;
        
        const piece = this.board[boardY][boardX];
        
        // Set piece text
        if (piece) {
          const pieceChar = this.pieceTypes[piece.type].char;
          cell.textContent = pieceChar;
          
          // Add class for piece ownership
          cell.className = `piece player-${piece.owner}`;
          if (piece.isPromoted) {
            cell.classList.add('promoted');
          }
          
          // When flipped, don't rotate player 2 pieces (they're now "our" pieces visually)
          // When not flipped, rotate player 2 pieces
          if (!this.isFlipped && piece.owner === 2) {
            cell.style.transform = 'rotate(180deg)';
          } else if (this.isFlipped && piece.owner === 1) {
            cell.style.transform = 'rotate(180deg)';
          } else {
            cell.style.transform = 'none';
          }
        } else {
          cell.textContent = '';
          cell.className = '';
          cell.style.transform = 'none';
        }
        
        // Highlight selected piece (using display coordinates)
        if (this.selectedPiece) {
          const selectedDisplayX = this.isFlipped ? 8 - this.selectedPiece.x : this.selectedPiece.x;
          const selectedDisplayY = this.isFlipped ? 8 - this.selectedPiece.y : this.selectedPiece.y;
          if (selectedDisplayX === x && selectedDisplayY === y) {
            cell.classList.add('selected');
          }
        }
        
        // Highlight possible moves (using display coordinates)
        const moveAtThisDisplay = this.possibleMoves.find(move => {
          const moveDisplayX = this.isFlipped ? 8 - move.x : move.x;
          const moveDisplayY = this.isFlipped ? 8 - move.y : move.y;
          return moveDisplayX === x && moveDisplayY === y;
        });
        
        if (moveAtThisDisplay) {
          cell.classList.add('possible-move');
        }
        
        // Set background colors (can be overridden by CSS)
        if (cell.classList.contains('selected')) {
          cell.style.backgroundColor = '#ff6b6b';
        } else if (cell.classList.contains('possible-move')) {
          cell.style.backgroundColor = '#4ecdc4';
        } else {
          cell.style.backgroundColor = '#deb887';
        }
      }
    }
    
    this.renderCapturedPieces();
  }
  
  // Render captured pieces (placeholder)
  renderCapturedPieces() {
    for (let player = 1; player <= 2; player++) {
      const container = document.getElementById(`player${player}-pieces`);
      if (container) {
        container.innerHTML = '';
        
        const captured = this.capturedPieces[player];
        for (const [pieceType, count] of Object.entries(captured)) {
          if (count > 0) {
            const pieceElement = document.createElement('span');
            const pieceChar = this.pieceTypes[pieceType].char;
            pieceElement.textContent = `${pieceChar}×${count} `;
            pieceElement.style.cursor = 'pointer';
            pieceElement.style.margin = '2px';
            pieceElement.title = `Drop ${this.pieceTypes[pieceType].name}`;
            
            // Add click handler for dropping pieces
            pieceElement.addEventListener('click', () => {
              this.handleDropPieceClick(pieceType);
            });
            
            container.appendChild(pieceElement);
          }
        }
      }
    }
  }
  
  // Handle clicking on captured pieces for dropping
  handleDropPieceClick(pieceType) {
    // Call the external drop handler if available
    if (window.handleCapturedPieceClick) {
      window.handleCapturedPieceClick(pieceType, this.currentPlayer);
    } else {
      console.log(`Selected ${this.pieceTypes[pieceType].name} for dropping`);
      console.log('Drop handler not found - make sure shogi-board.js is loaded');
    }
  }
  
  // Get board state for serialization
  getBoardState() {
    return {
      board: this.board,
      capturedPieces: this.capturedPieces,
      currentPlayer: this.currentPlayer,
      gameState: this.gameState
    };
  }
  
  // Set board state from serialized data
  setBoardState(state) {
    this.board = state.board;
    this.capturedPieces = state.capturedPieces;
    this.currentPlayer = state.currentPlayer;
    this.gameState = state.gameState;
    this.clearSelection();
    this.render();
  }
  
  // Drop a captured piece onto the board
  dropPiece(pieceType, x, y) {
    if (!this.capturedPieces[this.currentPlayer][pieceType] || 
        this.capturedPieces[this.currentPlayer][pieceType] <= 0) {
      return false;
    }
    
    if (this.board[y][x] !== null) {
      return false; // Can't drop on occupied square
    }
    
    // Create new piece and place it
    const piece = this.createPiece(pieceType, this.currentPlayer);
    this.board[y][x] = piece;
    
    // Remove from captured pieces
    this.capturedPieces[this.currentPlayer][pieceType]--;
    
    // Switch players
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    
    this.render();
    return true;
  }
}
