import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { supabase } from '../lib/supabase.js';
import { getUserSidebarData } from '../lib/userHelpers.js';

router.get('/', auth, async function(req, res) {
    const sidebarData = await getUserSidebarData(req.userId);
    
    const { data: rankings } = await supabase
        .from('users')
        .select('display_name, rating')
        .order('rating', { ascending: false })
        .limit(100);
    
    res.render('rankings', {
        layout: 'layout-auth',
        title: 'ランキング',
        currentPage: 'rankings',
        ...sidebarData,
        rankings: rankings || []
    });
});

export default router;
