import express from 'express';
var router = express.Router();
import jwt from 'jsonwebtoken';

/* GET home page. */
router.get('/', async function (req, res, next) {
    const token = req.cookies?.userToken;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/lobby');
        } catch (e) {
            // Invalid token, continue to show home page
        }
    }
    
    res.render('index', { layout: false, title: 'Express' });
});

/*

router.get('/board', function (req, res, next) {
    const game = req.app.locals.game;
    res.json(game.getBoard.toJson);
});

router.post('/move', function (req, res, next) {
    try {
        const game = req.app.locals.game;
        const { player, fromX = null, fromY = null, toX, toY, pieceKind = null, promoting = false } = req.body;

        if (typeof toX !== 'number' || typeof toY !== 'number') {
            return res.status(400).json({ error: 'toX/toY required' });
        }

        const move = { playerColor: player, fromX, fromY, toX, toY, pieceKind, promoting };
        const result = game.requestMove(move);

        return res.json({ 
            board: game.getBoard.toJson, 
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

router.get('/shogi', function (req, res, next) {
    res.render('shogi', { title: 'Shogi Game' });
});
*/

export default router;
