import { Board } from "./Board.js";
import { Player } from "./Player.js";
import { Kifu, Move } from "./Kifu.js";
import { Piece } from "./Piece.js";
import { PieceKind } from "./PieceKind.js";
import TimeManager from "./TimeManager.js";

export class Game {
    constructor(id, senteId, goteId, timeConfig = {}) {
        this.id = id;
        this.senteId = senteId;
        this.goteId = goteId;
        this.board = new Board();
        this.kifu = new Kifu();
        this.currentTurn = Player.SENTE;
        this.isFinished = false;
        this.winner = null;
        this.timeManager = new TimeManager(timeConfig);
        this.timeManager.startTurn(Player.SENTE);
    }

    get getId() {
        return this.id;
    }

    get getBoard() {
        return this.board;
    }

    requestMove(move) {
        if (this.isFinished) {
            throw new Error("Game already finished");
        }
        if (move.player !== this.currentTurn) {
            throw new Error("Not your turn");
        }
        
        this.validateMove(move);
        
        const backup = this.createBoardBackup();
        this.applyMoveToBoard(move);
        
        if (this.board.isInCheck(move.player)) {
            this.restoreBoardBackup(backup);
            throw new Error("Cannot leave your king in check");
        }
        
        const opponent = move.player === Player.SENTE ? Player.GOTE : Player.SENTE;
        const isCheck = this.board.isInCheck(opponent);
        
        let isCheckmate = false;
        if (isCheck) {
            isCheckmate = this.isCheckmate(opponent);
            if (isCheckmate) {
                this.isFinished = true;
                this.winner = move.player;
            }
        }
        
        this.postMoveUpdates(move, isCheck, isCheckmate);

        this.kifu.addMove(move);
        
        // 時間チェック（move完了後、ターン切り替え前）
        const timeoutResult = this.timeManager.consumeTime();
        console.log(`[Game.requestMove] Time check result: ${timeoutResult}, current player: ${move.player}`);
        if (timeoutResult === 'timeout') {
            console.log(`[Game.requestMove] TIMEOUT detected! Winner will be: ${opponent}`);
            this.isFinished = true;
            this.winner = opponent; // 時間切れしたのは現在のプレイヤー、勝者は相手
            this.finishReason = 'timeout';
            // 例外を投げずに終了状態を返す
            return { isCheck: false, isCheckmate: false, isTimeout: true };
        }
        
        this.currentTurn = opponent;
        this.timeManager.startTurn(opponent);
        
        return { isCheck, isCheckmate, isTimeout: false };
    }

    isCheckmate(player) {
        if (!this.board.isInCheck(player)) {
            return false;
        }
        const moves = this.generateAllLegalMoves(player);
        return moves.length === 0;
    }

    generateAllLegalMoves(player) {
        const legalMoves = [];
        
        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++) {
                const piece = this.board.getPieceAtPosition(x, y);
                if (!piece || piece.owner !== player) continue;
                
                const vectors = piece.getMovableRelativePosition;
                for (const [dy, dx] of vectors) {
                    const toY = y + dy;
                    const toX = x + dx;
                    
                    if (!this.board.isInsideBoard(toX, toY)) continue;
                    const target = this.board.getPieceAtPosition(toX, toY);
                    if (target && target.owner === player) continue;
                    
                    if (piece.isSliding && (Math.abs(dy) > 1 || Math.abs(dx) > 1)) {
                        if (!this.isPathClear(x, y, toX, toY)) continue;
                    }
                    
                    const canProm = piece.canPromote(y, toY);
                    const mustProm = !piece.promoted && this.mustPromote(piece.kind, player, toY);
                    
                    const promotionOptions = [];
                    if (mustProm) {
                        promotionOptions.push(true);
                    } else {
                        promotionOptions.push(false);
                        if (canProm) promotionOptions.push(true);
                    }
                    
                    for (const promoting of promotionOptions) {
                        const move = { player, fromX: x, fromY: y, toX, toY, pieceKind: null, promoting };
                        if (this.isMoveLegal(move)) {
                            legalMoves.push(move);
                        }
                    }
                }
            }
        }
        
        const capturedKinds = [...new Set(
            this.board.capturedPieces.filter(p => p.owner === player).map(p => p.kind)
        )];
        
        for (const kind of capturedKinds) {
            for (let y = 0; y < 9; y++) {
                if (kind === PieceKind.FU || kind === PieceKind.KYOSHA) {
                    if ((player === Player.SENTE && y === 0) || (player === Player.GOTE && y === 8)) continue;
                }
                if (kind === PieceKind.KEIMA) {
                    if ((player === Player.SENTE && y <= 1) || (player === Player.GOTE && y >= 7)) continue;
                }
                
                for (let x = 0; x < 9; x++) {
                    if (this.board.getPieceAtPosition(x, y)) continue;
                    
                    if (kind === PieceKind.FU) {
                        let hasFuInColumn = false;
                        for (let cy = 0; cy < 9; cy++) {
                            const cell = this.board.getPieceAtPosition(x, cy);
                            if (cell && cell.kind === PieceKind.FU && !cell.promoted && cell.owner === player) {
                                hasFuInColumn = true;
                                break;
                            }
                        }
                        if (hasFuInColumn) continue;
                    }
                    
                    const move = { player, fromX: null, fromY: null, toX: x, toY: y, pieceKind: kind, promoting: false };
                    if (this.isMoveLegal(move)) {
                        legalMoves.push(move);
                    }
                }
            }
        }
        
        return legalMoves;
    }

    isMoveLegal(move) {
        const backup = this.createBoardBackup();
        this.applyMoveToBoard(move);
        const legal = !this.board.isInCheck(move.player);
        this.restoreBoardBackup(backup);
        return legal;
    }

    createBoardBackup() {
        return {
            cells: this.board.cells.map(row => row.map(cell => cell ? new Piece(cell.kind, cell.owner, cell.promoted) : null)),
            capturedPieces: this.board.capturedPieces.map(p => new Piece(p.kind, p.owner, p.promoted))
        };
    }

    restoreBoardBackup(backup) {
        this.board.cells = backup.cells;
        this.board.capturedPieces = backup.capturedPieces;
    }

    applyMoveToBoard(move) {
        const { fromX, fromY, toX, toY, pieceKind, promoting } = move;

        if (fromX !== null) {
            const piece = this.board.getPieceAtPosition(fromX, fromY);
            const target = this.board.getPieceAtPosition(toX, toY);
            if (target && target.owner !== piece.owner) {
                target.owner = piece.owner;
                target.promoted = false;
                this.board.addCapturedPiece(target);
            }
            this.board.setPieceAtPosition(fromX, fromY, null);
            this.board.setPieceAtPosition(toX, toY, piece);
        } else {
            const piece = new Piece(pieceKind, move.player);
            this.board.removeCapturedPiece(piece);
            this.board.setPieceAtPosition(toX, toY, piece);
        }

        if (promoting) {
            const piece = this.board.getPieceAtPosition(toX, toY);
            if (piece) {
                piece.promote();
            }
        }
    }

    postMoveUpdates(move, isCheck, isCheckmate) {
    }

    validateMove(move) {
        const { player, fromX, fromY, toX, toY, pieceKind, promoting } = move;

        if (!this.board.isInsideBoard(toX, toY)) {
            throw new Error("Destination out of board");
        }

        if (fromX === null || fromY === null) {
            const hasCaptured = this.board.capturedPieces.find(
                p => p.kind === pieceKind && p.owner === player
            );
            if (!hasCaptured) {
                throw new Error("No such captured piece to drop");
            }
            if (this.board.getPieceAtPosition(toX, toY)) {
                throw new Error("Destination occupied");
            }
            if (pieceKind === PieceKind.FU) {
                for (let y = 0; y < 9; y++) {
                    const cell = this.board.getPieceAtPosition(toX, y);
                    if (cell && cell.kind === PieceKind.FU && !cell.promoted && cell.owner === player) {
                        throw new Error("二歩: Cannot drop pawn in column with existing unpromoted pawn");
                    }
                }
            }
            if (pieceKind === PieceKind.FU || pieceKind === PieceKind.KYOSHA) {
                if ((player === Player.SENTE && toY === 0) || (player === Player.GOTE && toY === 8)) {
                    throw new Error("Cannot drop piece on last rank");
                }
            }
            if (pieceKind === PieceKind.KEIMA) {
                if ((player === Player.SENTE && toY <= 1) || (player === Player.GOTE && toY >= 7)) {
                    throw new Error("Cannot drop knight on last two ranks");
                }
            }
            if (pieceKind === PieceKind.FU) {
                const move = { player, fromX: null, fromY: null, toX, toY, pieceKind, promoting: false };
                if (this.isUchifuzume(move)) {
                    throw new Error("打ち歩詰め: Cannot drop pawn to deliver checkmate");
                }
            }
            return;
        }

        if (!this.board.isInsideBoard(fromX, fromY)) {
            throw new Error("Source out of board");
        }

        const piece = this.board.getPieceAtPosition(fromX, fromY);
        if (!piece) {
            throw new Error("No piece at source");
        }
        if (piece.owner !== player) {
            throw new Error("Not your piece");
        }

        const target = this.board.getPieceAtPosition(toX, toY);
        if (target && target.owner === player) {
            throw new Error("Cannot capture your own piece");
        }

        const dy = toY - fromY;
        const dx = toX - fromX;
        const allowedVectors = piece.getMovableRelativePosition;
        const isAllowed = allowedVectors.some(([ay, ax]) => ay === dy && ax === dx);
        if (!isAllowed) {
            throw new Error("Illegal move for this piece");
        }

        if (piece.isSliding && (Math.abs(dy) > 1 || Math.abs(dx) > 1)) {
            if (!this.isPathClear(fromX, fromY, toX, toY)) {
                throw new Error("Path is blocked");
            }
        }

        if (promoting) {
            if (!piece.canPromote(fromY, toY)) {
                throw new Error("Promotion not allowed here");
            }
        }

        if (!promoting && !piece.promoted) {
            const mustPromote = this.mustPromote(piece.kind, player, toY);
            if (mustPromote) {
                throw new Error("Must promote on this rank");
            }
        }
    }

    getPlayerById(playerId) {
        if (playerId === this.senteId) {
            return Player.SENTE;
        } else if (playerId === this.goteId) {
            return Player.GOTE;
        } else {
            throw new Error("Player not in this game");
        }
    }

    isPathClear(fromX, fromY, toX, toY) {
        return this.board.isPathClearBetween(fromX, fromY, toX, toY);
    }

    mustPromote(kind, player, toY) {
        if (kind === PieceKind.FU || kind === PieceKind.KYOSHA) {
            return (player === Player.SENTE && toY === 0) || (player === Player.GOTE && toY === 8);
        }
        if (kind === PieceKind.KEIMA) {
            return (player === Player.SENTE && toY <= 1) || (player === Player.GOTE && toY >= 7);
        }
        return false;
    }

    isUchifuzume(move) {
        const { player, toX, toY, pieceKind } = move;
        if (pieceKind !== PieceKind.FU) return false;
        
        const backup = this.createBoardBackup();
        this.applyMoveToBoard(move);
        
        const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
        const isCheck = this.board.isInCheck(opponent);
        
        if (!isCheck) {
            this.restoreBoardBackup(backup);
            return false;
        }
        
        const opponentMoves = this.generateAllLegalMoves(opponent);
        const isCheckmate = opponentMoves.length === 0;
        
        this.restoreBoardBackup(backup);
        return isCheckmate;
    }

    static replayToMove(moves, moveNumber) {
        const tempGame = new Game('replay', 'temp-sente', 'temp-gote');
        const targetMoves = moves.slice(0, moveNumber);
        
        for (const move of targetMoves) {
            tempGame.applyMoveToBoard(move);
        }
        
        return tempGame.board;
    }
}