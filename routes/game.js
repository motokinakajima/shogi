import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import crypto from 'crypto';
import { activeGames, getGame } from '../lib/gameManager.js';
import { supabase } from '../lib/supabase.js';

router.get('/:gameId', auth, async function(req, res) {
    const gameId = req.params.gameId;
    if(!crypto.validateUUID(gameId)) {
        return res.status(400).send('Invalid game ID');
    }
    const game = getGame(gameId);
    if (!game) {
        return res.status(404).send('Game not found');
    }
    res.render('game', { game: game, userId: req.userId });
});

export default router;