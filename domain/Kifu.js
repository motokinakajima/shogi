import { PieceKind } from "./PieceKind.js";

export class Kifu {
    constructor(moves = []) {
        this.moves = moves;
    }

    addMove(move) {
        this.moves.push(move);
    }

    getMoves() {
        return this.moves;
    }
}

export class Move {
    constructor(playerColor, fromX, fromY, toX, toY, pieceKind, promoting = false) {
        this.playerColor = playerColor;
        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
        this.pieceKind = pieceKind;
        this.promoting = promoting;
    }
}