import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { supabase } from '../lib/supabase.js';
import { getUserSidebarData } from '../lib/userHelpers.js';

router.get('/', auth, async function(req, res) {
    const sidebarData = await getUserSidebarData(req.userId);
    
    const { data: games } = await supabase
        .from('games')
        .select(`
            id,
            sente:sente_id(display_name),
            gote:gote_id(display_name),
            winner,
            finish_reason,
            created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);
    
    res.render('database', {
        layout: 'layout-auth',
        title: '棋譜データベース',
        currentPage: 'database',
        ...sidebarData,
        games: games || []
    });
});

export default router;
