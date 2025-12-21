import express from 'express';
var router = express.Router();



/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});

router.get('/board', function (req, res, next) {
    const game = req.app.locals.game;
    res.json(game.getBoard.toJson);
});

router.get('/shogi', function (req, res, next) {
    res.render('shogi', { title: 'Shogi Game' });
});

export default router;
