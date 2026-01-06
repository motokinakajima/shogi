import express from 'express';
var router = express.Router();
import { db } from '../lib/db.js';
import auth from '../lib/middlewares.js';

router.post('/users/by-ids', auth, async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.json([]);
    }

    try {
        // ユーザー情報を取得
        const users = await db
            .selectFrom('users')
            .select(['id', 'display_name', 'rating', 'grade', 'skill_level', 'school_id'])
            .where('id', 'in', ids)
            .execute();

        // school_idを収集
        const schoolIds = [...new Set(users.filter(u => u.school_id).map(u => u.school_id))];
        
        // 学校情報を取得
        let schoolMap = new Map();
        if (schoolIds.length > 0) {
            const schools = await db
                .selectFrom('schools')
                .select(['id', 'display_name'])
                .where('id', 'in', schoolIds)
                .execute();
            
            schools.forEach(school => schoolMap.set(school.id, school.display_name));
        }

        // ユーザー情報に学校名を追加
        const result = users.map(user => ({
            ...user,
            school_name: user.school_id ? schoolMap.get(user.school_id) : null
        }));

        res.json(result);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return res.status(500).json({ error: 'fetch failed' });
    }
});


export default router;