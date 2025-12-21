import { PieceKind } from "./PieceKind.js";
import { BOARD_SIZE } from "./Piece.js";
import { Piece } from "./Piece.js";
import { Color } from "./Color.js";

export class Board {
    constructor() {
        this.cells = [
            [new Piece(PieceKind.KYOSHA, Color.BLACK), new Piece(PieceKind.KEIMA, Color.BLACK), new Piece(PieceKind.GIN, Color.BLACK), new Piece(PieceKind.KIN, Color.BLACK), new Piece(PieceKind.OU, Color.BLACK), new Piece(PieceKind.KIN, Color.BLACK), new Piece(PieceKind.GIN, Color.BLACK), new Piece(PieceKind.KEIMA, Color.BLACK), new Piece(PieceKind.KYOSHA, Color.BLACK)],
            [null, new Piece(PieceKind.HISHA, Color.BLACK), null, null, null, null, null, new Piece(PieceKind.KAKU, Color.BLACK), null],
            [new Piece(PieceKind.FU, Color.BLACK), new Piece(PieceKind.FU, Color.BLACK), new Piece(PieceKind.FU, Color.BLACK), new Piece(PieceKind.FU, Color.BLACK), new Piece(PieceKind.FU, Color.BLACK), new Piece(PieceKind.FU, Color.BLACK), new Piece(PieceKind.FU, Color.BLACK), new Piece(PieceKind.FU, Color.BLACK), new Piece(PieceKind.FU, Color.BLACK)],
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null],
            [new Piece(PieceKind.FU, Color.WHITE), new Piece(PieceKind.FU, Color.WHITE), new Piece(PieceKind.FU, Color.WHITE), new Piece(PieceKind.FU, Color.WHITE), new Piece(PieceKind.FU, Color.WHITE), new Piece(PieceKind.FU, Color.WHITE), new Piece(PieceKind.FU, Color.WHITE), new Piece(PieceKind.FU, Color.WHITE), new Piece(PieceKind.FU, Color.WHITE)],
            [null, new Piece(PieceKind.KAKU, Color.WHITE), null, null, null, null, null, new Piece(PieceKind.HISHA, Color.WHITE), null],
            [new Piece(PieceKind.KYOSHA, Color.WHITE), new Piece(PieceKind.KEIMA, Color.WHITE), new Piece(PieceKind.GIN, Color.WHITE), new Piece(PieceKind.KIN, Color.WHITE), new Piece(PieceKind.OU, Color.WHITE), new Piece(PieceKind.KIN, Color.WHITE), new Piece(PieceKind.GIN, Color.WHITE), new Piece(PieceKind.KEIMA, Color.WHITE), new Piece(PieceKind.KYOSHA, Color.WHITE)]
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
}