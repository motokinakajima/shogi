import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { getGame } from '../lib/gameManager.js';
import { supabase } from '../lib/supabase.js';
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

    return res.json({
        board: game.board.toJson,
        currentTurn: game.currentTurn,
        isFinished: game.isFinished,
        winner: game.winner,
        moveCount: game.kifu.getMoves().length
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
        const { error: insertError } = await supabase.from('moves').insert({
            game_id: game.id,
            move_number: moveNumber,
            player: game.getPlayerById(req.userId),
            from_x: fromX,
            from_y: fromY,
            to_x: toX,
            to_y: toY,
            piece_kind: pieceKind,
            promoting: promoting
        });
        if (insertError) {
            console.error('Failed to log move:', insertError);
        }

        if (game.isFinished) {
            const winnerId = game.winner === Player.SENTE ? game.senteId : game.goteId;
            const loserId = game.winner === Player.SENTE ? game.goteId : game.senteId;

            const { data: winnerData } = await supabase
                .from('users').select('rating').eq('id', winnerId).single();
            const { data: loserData } = await supabase
                .from('users').select('rating').eq('id', loserId).single();

            const winnerRating = winnerData?.rating ?? Rating.DEFAULT_RATING;
            const loserRating = loserData?.rating ?? Rating.DEFAULT_RATING;
            const { winnerNewRating, loserNewRating } = Rating.calculateMatch(winnerRating, loserRating);

            const { data: gameRecord, error: gameError } = await supabase.from('games').insert({
                sente_id: game.senteId,
                gote_id: game.goteId,
                winner: game.winner,
                finish_reason: 'checkmate'
            }).select('id').single();

            if (gameError) {
                console.error('Failed to save game:', gameError);
            } else {
                await supabase.from('rating_history').insert([
                    { user_id: winnerId, game_id: gameRecord.id, rating_before: winnerRating, rating_after: winnerNewRating },
                    { user_id: loserId, game_id: gameRecord.id, rating_before: loserRating, rating_after: loserNewRating }
                ]);

                await supabase.from('users').update({ rating: winnerNewRating }).eq('id', winnerId);
                await supabase.from('users').update({ rating: loserNewRating }).eq('id', loserId);
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