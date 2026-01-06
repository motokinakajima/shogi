import express from 'express';
const router = express.Router();
import { db } from '../lib/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

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
    const { display_name, email_address, password, grade, skill_level, gender } = req.body;
    
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
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Insert new user
        await db
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
            .execute();
        
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
