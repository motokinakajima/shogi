import express from 'express';
var router = express.Router();
import { db } from '../lib/db.js';
import auth from '../lib/middlewares.js';
import { getAllActiveGames } from '../lib/gameManager.js';

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

// 進行中のゲーム一覧を取得
router.get('/active-games', auth, async function(req, res) {
    try {
        const games = getAllActiveGames();
        const limit = parseInt(req.query.limit) || 10;
        
        // ゲーム情報を取得
        const gameList = await Promise.all(
            games.slice(0, limit).map(async (game) => {
                const senteUser = await db
                    .selectFrom('users')
                    .select(['display_name', 'rating'])
                    .where('id', '=', game.senteId)
                    .executeTakeFirst();
                const goteUser = await db
                    .selectFrom('users')
                    .select(['display_name', 'rating'])
                    .where('id', '=', game.goteId)
                    .executeTakeFirst();
                
                return {
                    id: game.id,
                    senteId: game.senteId,
                    senteName: senteUser?.display_name || 'Unknown',
                    senteRating: senteUser?.rating || 1500,
                    goteId: game.goteId,
                    goteName: goteUser?.display_name || 'Unknown',
                    goteRating: goteUser?.rating || 1500,
                    moveCount: game.kifu.getMoves().length,
                    currentTurn: game.currentTurn
                };
            })
        );
        
        res.json({ games: gameList });
    } catch (error) {
        console.error('Error fetching active games:', error);
        res.status(500).json({ error: 'Failed to fetch active games' });
    }
});

export default router;