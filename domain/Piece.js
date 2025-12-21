import { PieceKind } from "./PieceKind.js";

export const BOARD_SIZE = 9;
const MAX_MOVE_CELL = BOARD_SIZE - 1;

export class Piece {
    constructor(kind, owner, promoted = false) {
        this.kind = kind;
        this.owner = owner;
        this.promoted = promoted;
    }

    get getMovableRelativePosition() {
        const base = getMovableRelativePositionWithPromotion(this.kind, this.promoted);
        return this.owner === Color.WHITE ? base : base.map(([dx, dy]) => [-dx, -dy]);
    }

    get toJson() {
        return {
            kind: this.kind,
            owner: this.owner,
            promoted: this.promoted
        };
    }
}


function getMovableRelativePosition(kind) {
    switch(kind) {
        case PieceKind.FU: return [[0,-1]];

        case PieceKind.KIN: return [
            [0,-1],[1,-1],[-1,-1],
            [0,1],[1,0],
            [-1,0]];

        case PieceKind.GIN: return [
            [0,-1],[1,-1],[-1,-1],
            [1,1],[-1,1]];

        case PieceKind.KEIMA: return [[1,-2],[-1,-2]];

        case PieceKind.KYOSHA: return Array.from({length: MAX_MOVE_CELL}, (_, i) => [0, -(i + 1)]);

        case PieceKind.KAKU: return Array.from({length: MAX_MOVE_CELL}, (_, i) => [-(i + 1), -(i + 1)])
            .concat(Array.from({length: MAX_MOVE_CELL}, (_, i) => [(i + 1), -(i + 1)]))
            .concat(Array.from({length: MAX_MOVE_CELL}, (_, i) => [-(i + 1), (i + 1)]))
            .concat(Array.from({length: MAX_MOVE_CELL}, (_, i) => [(i + 1), (i + 1)]));

        case PieceKind.HISHA: return Array.from({length: MAX_MOVE_CELL}, (_, i) => [0, -(i + 1)])
            .concat(Array.from({length: MAX_MOVE_CELL}, (_, i) => [0, (i + 1)]))
            .concat(Array.from({length: MAX_MOVE_CELL}, (_, i) => [-(i + 1), 0]))
            .concat(Array.from({length: MAX_MOVE_CELL}, (_, i) => [(i + 1), 0]));

        case PieceKind.OU: return [
            [0,-1],[1,-1],[-1,-1],
            [0,1],[1,1],[-1,1],
            [1,0],[-1,0]];
    }
}

function getMovableRelativePositionWithPromotion(kind, promoted) {
    if (promoted) {
        if(kind === PieceKind.FU ||
           kind === PieceKind.KYOSHA ||
           kind === PieceKind.KEIMA ||
           kind === PieceKind.GIN) {
            return getMovableRelativePosition(PieceKind.KIN);
        }else if (kind === PieceKind.KAKU) {
            return getMovableRelativePosition(PieceKind.KAKU).concat([
                [0,-1],[1,0],[0,1],[-1,0]
            ]);
        }else if (kind === PieceKind.HISHA) {
            return getMovableRelativePosition(PieceKind.HISHA).concat([
                [ -1,-1],[1,-1],
                [ 1, 1],[-1, 1]
            ]);
        }
    }
    return getMovableRelativePosition(kind);
}