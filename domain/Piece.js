import { PieceKind } from "./PieceKind.js";
import { Player } from "./Player.js";

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
        return this.owner === Player.GOTE ? base : base.map(([dy, dx]) => [-dy, dx]);
    }

    get toJson() {
        return {
            kind: this.kind,
            owner: this.owner,
            promoted: this.promoted
        };
    }

    get isSliding() {
        return this.kind === PieceKind.KYOSHA ||
               this.kind === PieceKind.HISHA ||
               this.kind === PieceKind.KAKU;
    }

    canPromote(fromY, toY) {
        if (this.promoted) return false;
        if (this.kind === PieceKind.KIN || this.kind === PieceKind.OU) return false;
        const inPromotionZone = (player, y) => player === Player.SENTE ? y <= 2 : y >= 6;
        return inPromotionZone(this.owner, toY) || inPromotionZone(this.owner, fromY);
    }

    promote() {
        this.promoted = true;
    }

    demote() {
        this.promoted = false;
    }

    static getAttackVectors(kind, promoted) {
        return getMovableRelativePositionWithPromotion(kind, promoted);
    }

    static isSlidingKind(kind) {
        return kind === PieceKind.KYOSHA || kind === PieceKind.HISHA || kind === PieceKind.KAKU;
    }
}


function getMovableRelativePosition(kind) {
    switch (kind) {
        case PieceKind.FU:
            return [[1, 0]];

        case PieceKind.KIN:
            return [
                [1, 0], [1, 1], [1, -1],
                [0, 1], [0, -1],
                [-1, 0]
            ];

        case PieceKind.GIN:
            return [
                [1, 0], [1, 1], [1, -1],
                [-1, 1], [-1, -1]
            ];

        case PieceKind.KEIMA:
            return [[2, 1], [2, -1]];

        case PieceKind.KYOSHA:
            return Array.from({ length: MAX_MOVE_CELL }, (_, i) => [i + 1, 0]);

        case PieceKind.KAKU:
            return [
                ...Array.from({ length: MAX_MOVE_CELL }, (_, i) => [i + 1, i + 1]),
                ...Array.from({ length: MAX_MOVE_CELL }, (_, i) => [i + 1, -(i + 1)]),
                ...Array.from({ length: MAX_MOVE_CELL }, (_, i) => [-(i + 1), i + 1]),
                ...Array.from({ length: MAX_MOVE_CELL }, (_, i) => [-(i + 1), -(i + 1)])
            ];

        case PieceKind.HISHA:
            return [
                ...Array.from({ length: MAX_MOVE_CELL }, (_, i) => [i + 1, 0]),
                ...Array.from({ length: MAX_MOVE_CELL }, (_, i) => [-(i + 1), 0]),
                ...Array.from({ length: MAX_MOVE_CELL }, (_, i) => [0, i + 1]),
                ...Array.from({ length: MAX_MOVE_CELL }, (_, i) => [0, -(i + 1)])
            ];

        case PieceKind.OU:
            return [
                [1, 0], [1, 1], [1, -1],
                [-1, 0], [-1, 1], [-1, -1],
                [0, 1], [0, -1]
            ];

        default:
            return [];
    }
}

function getMovableRelativePositionWithPromotion(kind, promoted) {
    if (promoted) {
        if (kind === PieceKind.FU || kind === PieceKind.KYOSHA ||
            kind === PieceKind.KEIMA || kind === PieceKind.GIN) {
            return getMovableRelativePosition(PieceKind.KIN);
        }
        if (kind === PieceKind.KAKU) {
            return [
                ...getMovableRelativePosition(PieceKind.KAKU),
                [1, 0], [-1, 0], [0, 1], [0, -1]
            ];
        }
        if (kind === PieceKind.HISHA) {
            return [
                ...getMovableRelativePosition(PieceKind.HISHA),
                [1, 1], [1, -1], [-1, 1], [-1, -1]
            ];
        }
    }
    return getMovableRelativePosition(kind);
}