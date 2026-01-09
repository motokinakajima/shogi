import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { getGame, finishGame } from '../lib/gameManager.js';
import { db } from '../lib/db.js';

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

router.post('/:gameId/resign', auth, async function(req, res) {
    try {
        const game = getGame(req.params.gameId);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        if (game.isFinished) {
            return res.status(400).json({ error: 'Game already finished' });
        }

        const player = game.getPlayerById(req.userId);
        const opponent = player === 'sente' ? 'gote' : 'sente';
        
        console.log(`[POST /resign] Player ${player} resigned. Winner: ${opponent}`);
        
        game.isFinished = true;
        game.winner = opponent;
        game.finishReason = 'resign';

        try {
            await finishGame(game, opponent, 'resign');
            console.log(`[POST /resign] finishGame completed successfully`);
        } catch (gameError) {
            console.error('Failed to finish game:', gameError);
            return res.status(500).json({ error: 'Failed to finish game' });
        }

        return res.json({
            success: true,
            isFinished: true,
            winner: opponent
        });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ error: err.message });
    }
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
            console.log(`[POST /move] Game finished detected. Winner: ${game.winner}, Reason: ${game.finishReason}`);
            try {
                await finishGame(game, game.winner, game.finishReason || 'checkmate');
                console.log(`[POST /move] finishGame completed successfully`);
            } catch (gameError) {
                console.error('Failed to finish game:', gameError);
            }
        } else {
            // ゲームが続行中の場合、次のプレイヤーのタイマーを再スケジュール
            const { scheduleGameTimeout } = await import('../lib/gameManager.js');
            if (scheduleGameTimeout) {
                scheduleGameTimeout(game);
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
        
        // エラー時でもゲームが終了している場合は終了処理を実行
        const game = getGame(req.params.gameId);
        if (game && game.isFinished) {
            try {
                await finishGame(game, game.winner, game.finishReason || 'checkmate');
            } catch (gameError) {
                console.error('Failed to finish game in catch block:', gameError);
            }
        }
        
        return res.status(400).json({ error: err.message });
    }
});

export default router;