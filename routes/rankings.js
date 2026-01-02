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
    
    const { data: rankings } = await supabase
        .from('users')
        .select('display_name, rating')
        .order('rating', { ascending: false })
        .limit(100);
    
    res.render('rankings', {
        layout: 'layout-auth',
        title: 'ランキング',
        currentPage: 'rankings',
        userName: userData?.display_name || 'プレイヤー',
        rankings: rankings || []
    });
});

export default router;
