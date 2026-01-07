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

// Update student information (school admin only)
router.post('/school/update-student', auth.schoolAuth, async (req, res) => {
    const { studentId, field, value } = req.body;
    const schoolId = req.schoolId;

    if (!studentId || !field) {
        return res.status(400).json({ error: 'studentId and field are required' });
    }

    // Validate field (only allow specific fields)
    const allowedFields = ['grade', 'skill_level', 'gender'];
    if (!allowedFields.includes(field)) {
        return res.status(400).json({ error: 'Invalid field' });
    }

    try {
        // Verify student belongs to this school
        const student = await db
            .selectFrom('users')
            .select(['id', 'school_id'])
            .where('id', '=', studentId)
            .executeTakeFirst();

        if (!student || student.school_id !== schoolId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Update the field
        await db
            .updateTable('users')
            .set({ [field]: value })
            .where('id', '=', studentId)
            .execute();

        res.json({ success: true, message: 'Updated successfully' });
    } catch (error) {
        console.error('Failed to update student:', error);
        return res.status(500).json({ error: 'Update failed' });
    }
});


// Update student information (school admin only)
router.post('/school/update-student', auth.schoolAuth, async (req, res) => {
    const { studentId, field, value } = req.body;
    const schoolId = req.schoolId;

    if (!studentId || !field) {
        return res.status(400).json({ error: 'studentId and field are required' });
    }

    // Validate field (only allow specific fields)
    const allowedFields = ['grade', 'skill_level', 'gender'];
    if (!allowedFields.includes(field)) {
        return res.status(400).json({ error: 'Invalid field' });
    }

    try {
        // Verify student belongs to this school
        const student = await db
            .selectFrom('users')
            .select(['id', 'school_id'])
            .where('id', '=', studentId)
            .executeTakeFirst();

        if (!student || student.school_id !== schoolId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Update the field
        await db
            .updateTable('users')
            .set({ [field]: value })
            .where('id', '=', studentId)
            .execute();

        res.json({ success: true, message: 'Updated successfully' });
    } catch (error) {
        console.error('Failed to update student:', error);
        return res.status(500).json({ error: 'Update failed' });
    }
});

// Get game information
router.get('/games/:gameId', auth, async (req, res) => {
    try {
        const game = await db
            .selectFrom('games')
            .selectAll()
            .where('id', '=', req.params.gameId)
            .executeTakeFirst();
        
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        res.json(game);
    } catch (error) {
        console.error('Failed to fetch game:', error);
        return res.status(500).json({ error: 'Fetch failed' });
    }
});

// Get moves for a game
router.get('/games/:gameId/moves', auth, async (req, res) => {
    try {
        const moves = await db
            .selectFrom('moves')
            .selectAll()
            .where('game_id', '=', req.params.gameId)
            .orderBy('move_number', 'asc')
            .execute();
        
        res.json(moves);
    } catch (error) {
        console.error('Failed to fetch moves:', error);
        return res.status(500).json({ error: 'Fetch failed' });
    }
});

export default router;