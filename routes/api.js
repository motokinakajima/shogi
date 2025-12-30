import express from 'express';
var router = express.Router();
import { supabase } from '../lib/supabase.js';
import auth from '../lib/middlewares.js';

router.post('/users/by-ids', auth, async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.json([]);
    }

    const { data, fetchError } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', ids);

    if (fetchError) {
        return res.status(500).json({ error: 'fetch failed' });
    }

    res.json(data);
});


export default router;