import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { supabase } from '../lib/supabase.js';

router.get('/', auth, async function(req, res) {
    const { data: userData } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', req.userId)
        .single();
    
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
        userName: userData?.display_name || 'プレイヤー',
        games: games || []
    });
});

export default router;
