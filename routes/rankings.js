import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { db } from '../lib/db.js';
import { getUserSidebarData } from '../lib/userHelpers.js';

router.get('/', auth, async function(req, res) {
    const sidebarData = await getUserSidebarData(req.userId);
    
    const rankings = await db
        .selectFrom('users')
        .select(['display_name', 'rating'])
        .orderBy('rating', 'desc')
        .limit(100)
        .execute();
    
    res.render('rankings', {
        layout: 'layout-auth',
        title: 'ランキング',
        currentPage: 'rankings',
        ...sidebarData,
        rankings: rankings || []
    });
});

export default router;
