import { Board } from "./Board.js";
import { Color } from "./Color.js";
import { Kifu, Move } from "./Kifu.js";

export class Game {
    constructor(id, whiteId, blackId) {
        this.id = id;
        this.whiteId = whiteId;
        this.blackId = blackId;
        this.board = new Board();
        this.kifu = new Kifu();
        this.currentTurn = Color.BLACK;
        this.isFinished = false;
        this.winner = null;
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

        if (move.playerColor !== this.currentTurn) {
            throw new Error("Not your turn");
        }

        this.kifu.addMove(move);
        this.currentTurn = this.currentTurn === Color.BLACK ? Color.WHITE : Color.BLACK;
    }

    applyMoveToBoard(move) {
        const { fromX, fromY, toX, toY, pieceKind, promoting } = move;

        if (fromX !== null) {
            const piece = this.board.getPieceAtPosition(fromX, fromY);
            this.board.setPieceAtPosition(fromX, fromY, null);
            this.board.setPieceAtPosition(toX, toY, piece);
        } else {
            // place
            const piece = new Piece(pieceKind, move.playerColor);
            this.board.setPieceAtPosition(toX, toY, piece);
        }

        if (promoting) {
            // piece.promote()
        }
    }

}