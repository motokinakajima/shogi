import express from 'express';
var router = express.Router();
import auth from '../lib/middlewares.js';
import { getUserSidebarData } from '../lib/userHelpers.js';

router.get('/', auth, async function(req, res) {
    const userId = req.userId;
    const sidebarData = await getUserSidebarData(userId);
    
    res.render('lobby', { 
        layout: 'layout-auth',
        title: 'ロビー',
        currentPage: 'lobby',
        ...sidebarData,
        currentUserId: userId,
        currentUserName: sidebarData.userName
    });
});

export default router;