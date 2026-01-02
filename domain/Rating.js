// domain/Rating.js

const DEFAULT_RATING = 1500;
const K_FACTOR = 32;  // 初心者向けは大きめ、上級者は16程度に下げることも

export class Rating {
    
    /**
     * 期待勝率を計算
     * @param {number} playerRating 
     * @param {number} opponentRating 
     * @returns {number} 0-1の勝率
     */
    static expectedScore(playerRating, opponentRating) {
        return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    }

    /**
     * 新しいレーティングを計算
     * @param {number} playerRating 現在のレート
     * @param {number} opponentRating 相手のレート
     * @param {number} score 結果 (1=勝ち, 0.5=引分, 0=負け)
     * @returns {number} 新しいレート
     */
    static calculateNewRating(playerRating, opponentRating, score) {
        const expected = this.expectedScore(playerRating, opponentRating);
        return Math.round(playerRating + K_FACTOR * (score - expected));
    }

    /**
     * 対局結果から両者の新レートを計算
     * @param {number} winnerRating 
     * @param {number} loserRating 
     * @returns {{ winnerNewRating: number, loserNewRating: number }}
     */
    static calculateMatch(winnerRating, loserRating) {
        return {
            winnerNewRating: this.calculateNewRating(winnerRating, loserRating, 1),
            loserNewRating: this.calculateNewRating(loserRating, winnerRating, 0)
        };
    }

    static get DEFAULT_RATING() {
        return DEFAULT_RATING;
    }

    static get K_FACTOR() {
        return K_FACTOR;
    }
}