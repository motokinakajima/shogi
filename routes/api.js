import express from 'express';
var router = express.Router();
import { supabase } from '../lib/supabase.js';
import auth from '../lib/middlewares.js';

router.post('/users/by-ids', auth, async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.json([]);
    }

    // ユーザー情報を取得
    const { data: users, error } = await supabase
        .from('users')
        .select('id, display_name, rating, grade, skill_level, school_id')
        .in('id', ids);

    if (error) {
        return res.status(500).json({ error: 'fetch failed' });
    }

    // school_idを収集
    const schoolIds = [...new Set(users.filter(u => u.school_id).map(u => u.school_id))];
    
    // 学校情報を取得
    let schoolMap = new Map();
    if (schoolIds.length > 0) {
        const { data: schools, error: schoolError } = await supabase
            .from('schools')
            .select('id, display_name')
            .in('id', schoolIds);
        
        if (!schoolError && schools) {
            schools.forEach(school => schoolMap.set(school.id, school.display_name));
        }
    }

    // ユーザー情報に学校名を追加
    const result = users.map(user => ({
        ...user,
        school_name: user.school_id ? schoolMap.get(user.school_id) : null
    }));

    res.json(result);
});


export default router;