import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { db } from '../lib/db.js';
import { getUserSidebarData } from '../lib/userHelpers.js';

router.get('/:gameId', auth, async function(req, res) {
    const sidebarData = await getUserSidebarData(req.userId);
    
    const game = await db
        .selectFrom('games')
        .innerJoin('users as sente', 'sente.id', 'games.sente_id')
        .innerJoin('users as gote', 'gote.id', 'games.gote_id')
        .select([
            'games.id',
            'games.winner',
            'games.finish_reason',
            'games.finished_at',
            'games.created_at',
            'games.time_control',
            'sente.id as sente_id',
            'sente.display_name as sente_name',
            'gote.id as gote_id',
            'gote.display_name as gote_name'
        ])
        .where('games.id', '=', req.params.gameId)
        .executeTakeFirst();
    
    if (!game) {
        return res.status(404).send('Game not found');
    }
    
    res.render('kifu', {
        layout: 'layout-auth',
        title: '棋譜閲覧',
        currentPage: 'database',
        ...sidebarData,
        game
    });
});

export default router;
