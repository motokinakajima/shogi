import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { db } from '../lib/db.js';
import { getUserSidebarData } from '../lib/userHelpers.js';

router.get('/', auth, async function(req, res) {
    const sidebarData = await getUserSidebarData(req.userId);
    
    const userData = await db
        .selectFrom('users')
        .select(['display_name', 'rating', 'email_address'])
        .where('id', '=', req.userId)
        .executeTakeFirst();
    
    const gameHistory = await db
        .selectFrom('games')
        .select(['id', 'winner', 'finish_reason', 'created_at'])
        .where((eb) => eb.or([
            eb('sente_id', '=', req.userId),
            eb('gote_id', '=', req.userId)
        ]))
        .orderBy('created_at', 'desc')
        .limit(10)
        .execute();
    
    const ratingHistory = await db
        .selectFrom('rating_history')
        .select(['rating_before', 'rating_after', 'created_at'])
        .where('user_id', '=', req.userId)
        .orderBy('created_at', 'desc')
        .limit(20)
        .execute();
    
    res.render('mypage', {
        layout: 'layout-auth',
        title: 'マイページ',
        currentPage: 'mypage',
        ...sidebarData,
        user: userData,
        gameHistory: gameHistory || [],
        ratingHistory: ratingHistory || []
    });
});

export default router;
