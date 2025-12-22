import { PieceKind } from "./PieceKind.js";
import { BOARD_SIZE } from "./Piece.js";
import { Piece } from "./Piece.js";
import { Player } from "./Player.js";

export class Board {
    constructor() {
        this.cells = [
            [new Piece(PieceKind.KYOSHA, Player.GOTE), new Piece(PieceKind.KEIMA, Player.GOTE), new Piece(PieceKind.GIN, Player.GOTE), new Piece(PieceKind.KIN, Player.GOTE), new Piece(PieceKind.OU, Player.GOTE), new Piece(PieceKind.KIN, Player.GOTE), new Piece(PieceKind.GIN, Player.GOTE), new Piece(PieceKind.KEIMA, Player.GOTE), new Piece(PieceKind.KYOSHA, Player.GOTE)],
            [null, new Piece(PieceKind.KAKU, Player.GOTE), null, null, null, null, null, new Piece(PieceKind.HISHA, Player.GOTE), null],
            [new Piece(PieceKind.FU, Player.GOTE), new Piece(PieceKind.FU, Player.GOTE), new Piece(PieceKind.FU, Player.GOTE), new Piece(PieceKind.FU, Player.GOTE), new Piece(PieceKind.FU, Player.GOTE), new Piece(PieceKind.FU, Player.GOTE), new Piece(PieceKind.FU, Player.GOTE), new Piece(PieceKind.FU, Player.GOTE), new Piece(PieceKind.FU, Player.GOTE)],
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null],
            [new Piece(PieceKind.FU, Player.SENTE), new Piece(PieceKind.FU, Player.SENTE), new Piece(PieceKind.FU, Player.SENTE), new Piece(PieceKind.FU, Player.SENTE), new Piece(PieceKind.FU, Player.SENTE), new Piece(PieceKind.FU, Player.SENTE), new Piece(PieceKind.FU, Player.SENTE), new Piece(PieceKind.FU, Player.SENTE), new Piece(PieceKind.FU, Player.SENTE)],
            [null, new Piece(PieceKind.HISHA, Player.SENTE), null, null, null, null, null, new Piece(PieceKind.KAKU, Player.SENTE), null],
            [new Piece(PieceKind.KYOSHA, Player.SENTE), new Piece(PieceKind.KEIMA, Player.SENTE), new Piece(PieceKind.GIN, Player.SENTE), new Piece(PieceKind.KIN, Player.SENTE), new Piece(PieceKind.OU, Player.SENTE), new Piece(PieceKind.KIN, Player.SENTE), new Piece(PieceKind.GIN, Player.SENTE), new Piece(PieceKind.KEIMA, Player.SENTE), new Piece(PieceKind.KYOSHA, Player.SENTE)]
        ];
        this.capturedPieces = [];
    }

    get getCells() {
        return this.cells;
    }

    get getPieceAtPosition() {
        return (x, y) => {
            return this.cells[y][x];
        }
    }
    
    get getCapturedPieces() {
        return this.capturedPieces;
    }

    get toJson() {
        return {
            cells: this.cells.map(row =>
                row.map(cell => (cell ? cell.toJson : null))
            ),
            capturedPieces: this.capturedPieces.map(piece => piece.toJson)
        }
    }

    setCapturedPieces(pieces) {
        this.capturedPieces = pieces;
    }

    addCapturedPiece(piece) {
        piece.promoted = false;
        this.capturedPieces.push(piece);
    }

    removeCapturedPiece(piece) {
        const index = this.capturedPieces.findIndex(p => p.kind === piece.kind && p.owner === piece.owner);
        if (index !== -1) {
            this.capturedPieces.splice(index, 1);
        }
    }

    setPieceAtPosition(x, y, piece) {
        this.cells[y][x] = piece;
    }

    isInsideBoard(x, y) {
        return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
    }

    clearCell(x, y) {
        this.cells[y][x] = null;
    }

    findKing(player) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                const piece = this.cells[y][x];
                if (piece && piece.kind === PieceKind.OU && piece.owner === player) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    isInCheck(player) {
        const kingPos = this.findKing(player);
        if (!kingPos) return false;
        const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
        
        for (const kind of Object.values(PieceKind)) {
            for (const promoted of [false, true]) {
                const vectors = Piece.getAttackVectors(kind, promoted);
                for (const [dy, dx] of vectors) {
                    const attackDy = opponent === Player.GOTE ? dy : -dy;
                    const checkY = kingPos.y + attackDy;
                    const checkX = kingPos.x + dx;
                    
                    if (!this.isInsideBoard(checkX, checkY)) continue;
                    
                    const attacker = this.cells[checkY][checkX];
                    if (!attacker || attacker.owner !== opponent) continue;
                    if (attacker.kind !== kind || attacker.promoted !== promoted) continue;
                    
                    if (Piece.isSlidingKind(kind) && !promoted && (Math.abs(dy) > 1 || Math.abs(dx) > 1)) {
                        if (!this.isPathClearBetween(checkX, checkY, kingPos.x, kingPos.y)) continue;
                    }
                    
                    return true;
                }
            }
        }
        return false;
    }

    isPathClearBetween(fromX, fromY, toX, toY) {
        const stepX = Math.sign(toX - fromX);
        const stepY = Math.sign(toY - fromY);
        let x = fromX + stepX;
        let y = fromY + stepY;
        while (x !== toX || y !== toY) {
            if (this.cells[y][x]) return false;
            x += stepX;
            y += stepY;
        }
        return true;
    }
}