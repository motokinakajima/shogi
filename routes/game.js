import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { getGame } from '../lib/gameManager.js';
import { supabase } from '../lib/supabase.js';
import { Player } from '../domain/Player.js';

router.get('/:gameId', auth, async function(req, res) {
    const game = getGame(req.params.gameId);
    if (!game) {
        return res.status(404).send('Game not found');
    }

    res.render('game', { 
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
            await supabase.from('games').update({
                status: 'finished',
                winner_id: game.winner === Player.SENTE ? game.senteId : game.goteId,
                finished_at: new Date().toISOString()
            }).eq('id', game.id);
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