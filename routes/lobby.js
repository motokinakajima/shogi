import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { supabase } from '../lib/supabase.js';

router.get('/', auth, async function(req, res) {
    const userId = req.userId;  // Changed from req.userID to req.userId
    
    // Fetch user's display name
    const { data: user } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', userId)
        .single();
    
    res.render('lobby', { 
        layout: 'layout-auth',
        title: 'ロビー',
        currentPage: 'lobby',
        userName: user?.display_name || 'プレイヤー',
        currentUserId: userId,
        currentUserName: user?.display_name || 'User'
    });
});

export default router;