import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { db } from '../lib/db.js';
import { getUserSidebarData } from '../lib/userHelpers.js';

router.get('/', auth, async function(req, res) {
    const sidebarData = await getUserSidebarData(req.userId);
    
    const games = await db
        .selectFrom('games')
        .innerJoin('users as sente', 'sente.id', 'games.sente_id')
        .innerJoin('users as gote', 'gote.id', 'games.gote_id')
        .select([
            'games.id',
            'games.winner',
            'games.finish_reason',
            'games.created_at',
            'sente.display_name as sente_name',
            'gote.display_name as gote_name'
        ])
        .orderBy('games.created_at', 'desc')
        .limit(50)
        .execute();
    
    // フロント側の形式に合わせる
    const formattedGames = games.map(g => ({
        id: g.id,
        sente: { display_name: g.sente_name },
        gote: { display_name: g.gote_name },
        winner: g.winner,
        finish_reason: g.finish_reason,
        created_at: g.created_at
    }));
    
    res.render('database', {
        layout: 'layout-auth',
        title: '棋譜データベース',
        currentPage: 'database',
        ...sidebarData,
        games: formattedGames
    });
});

export default router;
