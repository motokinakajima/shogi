import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { supabase } from '../lib/supabase.js';

router.get('/', auth, async function(req, res) {
    const { data: userData } = await supabase
        .from('users')
        .select('display_name, rating, email_address')
        .eq('id', req.userId)
        .single();
    
    const { data: gameHistory } = await supabase
        .from('games')
        .select('id, winner, finish_reason, created_at')
        .or(`sente_id.eq.${req.userId},gote_id.eq.${req.userId}`)
        .order('created_at', { ascending: false })
        .limit(10);
    
    const { data: ratingHistory } = await supabase
        .from('rating_history')
        .select('rating_before, rating_after, created_at')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false })
        .limit(20);
    
    res.render('mypage', {
        layout: 'layout-auth',
        title: 'マイページ',
        currentPage: 'mypage',
        userName: userData?.display_name || 'プレイヤー',
        user: userData,
        gameHistory: gameHistory || [],
        ratingHistory: ratingHistory || []
    });
});

export default router;
