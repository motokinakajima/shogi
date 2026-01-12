import express from 'express';
const router = express.Router();
import { db } from '../lib/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateNewUserToken } from '../lib/passwordResetManager.js';

// School authentication middleware
function schoolAuth(req, res, next) {
    const token = req.cookies.schoolToken;
    if (!token) {
        return res.redirect('/login/school');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.schoolId = decoded.schoolId;
        next();
    } catch (err) {
        res.clearCookie('schoolToken');
        return res.redirect('/login/school');
    }
}

// School dashboard - list of students
router.get('/dashboard', schoolAuth, async function(req, res) {
    const schoolId = req.schoolId;
    
    // Get school information
    const school = await db
        .selectFrom('schools')
        .select('display_name')
        .where('id', '=', schoolId)
        .executeTakeFirst();
    
    // Get all students belonging to this school
    const students = await db
        .selectFrom('users')
        .select(['id', 'display_name', 'email_address', 'rating', 'grade', 'skill_level', 'gender'])
        .where('school_id', '=', schoolId)
        .orderBy('display_name', 'asc')
        .execute();
    
    res.render('school-dashboard', {
        layout: false,
        schoolName: school?.display_name || '学校',
        students: students || []
    });
});

// New student registration page
router.get('/register-student', schoolAuth, async function(req, res) {
    const schoolId = req.schoolId;
    
    const school = await db
        .selectFrom('schools')
        .select('display_name')
        .where('id', '=', schoolId)
        .executeTakeFirst();
    
    res.render('school-register-student', {
        layout: false,
        schoolName: school?.display_name || '学校'
    });
});

// Handle student registration
router.post('/register-student', schoolAuth, async function(req, res) {
    const schoolId = req.schoolId;
    const { display_name, email_address, grade, skill_level, gender } = req.body;
    
    try {
        // Check if email already exists
        const existing = await db
            .selectFrom('users')
            .select('id')
            .where('email_address', '=', email_address)
            .executeTakeFirst();
        
        if (existing) {
            return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
        }
        
        // ランダムパスワード生成（管理者は知らない）
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        
        // Insert new user
        const result = await db
            .insertInto('users')
            .values({
                email_address,
                password_hash: passwordHash,
                display_name,
                school_id: schoolId,
                grade,
                skill_level,
                gender,
                rating: 1500
            })
            .returning('id')
            .executeTakeFirst();
        
        // パスワード設定用トークン生成（24時間有効）
        const tokenResult = generateNewUserToken(result.id, email_address);
        
        if (!tokenResult.success) {
            console.error('Failed to generate token');
            return res.status(500).json({ error: 'トークン生成に失敗しました' });
        }
        
        // パスワード設定用URLを生成
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/login/reset-password/${tokenResult.token}`;
        
        // コンソールに出力（将来的にはメール送信）
        console.log('\n=== 新規生徒登録 ===');
        console.log(`表示名: ${display_name}`);
        console.log(`メール: ${email_address}`);
        console.log(`パスワード設定 URL: ${resetUrl}`);
        console.log(`有効期限: 24時間`);
        console.log('========================\n');
        
        res.redirect('/school-admin/dashboard');
    } catch (error) {
        console.error('Student registration error:', error);
        return res.status(400).json({ error: 'ユーザー登録に失敗しました' });
    }
});

// Logout
router.post('/logout', function(req, res) {
    res.clearCookie('schoolToken');
    res.redirect('/login/school');
});

export default router;
