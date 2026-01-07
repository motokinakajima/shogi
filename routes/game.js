import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { getGame } from '../lib/gameManager.js';
import { db } from '../lib/db.js';
import { Player } from '../domain/Player.js';
import { Rating } from '../domain/Rating.js';

router.get('/:gameId', auth, async function(req, res) {
    const game = getGame(req.params.gameId);
    if (!game) {
        return res.status(404).send('Game not found');
    }

    res.render('game', { 
        layout: false,
        gameId: req.params.gameId,
        userId: req.userId,
        senteId: game.senteId,
        goteId: game.goteId
    });
});

router.get('/:gameId/state', auth, async function(req, res) {
    const game = getGame(req.params.gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    const timeState = game.timeManager.getState();

    return res.json({
        board: game.board.toJson,
        currentTurn: game.currentTurn,
        isFinished: game.isFinished,
        winner: game.winner,
        moveCount: game.kifu.getMoves().length,
        timeState: timeState
    });
});

router.post('/:gameId/move', auth, async function(req, res) {
    try {
        const game = getGame(req.params.gameId);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const { fromX = null, fromY = null, toX, toY, pieceKind = null, promoting = false } = req.body;

        if (typeof toX !== 'number' || typeof toY !== 'number') {
            return res.status(400).json({ error: 'toX/toY required' });
        }

        const player = game.getPlayerById(req.userId);
        const move = { player, fromX, fromY, toX, toY, pieceKind, promoting };
        const result = game.requestMove(move);

        const moveNumber = game.kifu.getMoves().length;
        try {
            await db.insertInto('moves').values({
                game_id: game.id,
                move_number: moveNumber,
                player: game.getPlayerById(req.userId),
                from_x: fromX,
                from_y: fromY,
                to_x: toX,
                to_y: toY,
                piece_kind: pieceKind,
                promoting: promoting
            }).execute();
        } catch (insertError) {
            console.error('Failed to log move:', insertError);
        }

        if (game.isFinished) {
            const winnerId = game.winner === Player.SENTE ? game.senteId : game.goteId;
            const loserId = game.winner === Player.SENTE ? game.goteId : game.senteId;

            const winnerData = await db
                .selectFrom('users')
                .select('rating')
                .where('id', '=', winnerId)
                .executeTakeFirst();
            const loserData = await db
                .selectFrom('users')
                .select('rating')
                .where('id', '=', loserId)
                .executeTakeFirst();

            const winnerRating = winnerData?.rating ?? Rating.DEFAULT_RATING;
            const loserRating = loserData?.rating ?? Rating.DEFAULT_RATING;
            const { winnerNewRating, loserNewRating } = Rating.calculateMatch(winnerRating, loserRating);

            try {
                // ゲームレコードを更新（終局情報を追加）
                await db.updateTable('games')
                    .set({
                        winner: game.winner,
                        finish_reason: game.finishReason || 'checkmate',
                        finished_at: new Date(),
                        is_finished: true
                    })
                    .where('id', '=', game.id)
                    .execute();

                await db.insertInto('rating_history').values([
                    { user_id: winnerId, game_id: game.id, rating_before: winnerRating, rating_after: winnerNewRating },
                    { user_id: loserId, game_id: game.id, rating_before: loserRating, rating_after: loserNewRating }
                ]).execute();

                await db.updateTable('users').set({ rating: winnerNewRating }).where('id', '=', winnerId).execute();
                await db.updateTable('users').set({ rating: loserNewRating }).where('id', '=', loserId).execute();
            } catch (gameError) {
                console.error('Failed to save game:', gameError);
            }
        }

        return res.json({
            success: true,
            board: game.board.toJson,
            currentTurn: game.currentTurn,
            isCheck: result.isCheck,
            isCheckmate: result.isCheckmate,
            isFinished: game.isFinished,
            winner: game.winner
        });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ error: err.message });
    }
});

export default router;