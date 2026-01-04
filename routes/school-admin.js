import express from 'express';
const router = express.Router();
import { supabase } from '../lib/supabase.js';
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
    const { data: school } = await supabase
        .from('schools')
        .select('display_name')
        .eq('id', schoolId)
        .single();
    
    // Get all students belonging to this school
    const { data: students } = await supabase
        .from('users')
        .select('id, display_name, email_address, rating, grade, skill_level, gender')
        .eq('school_id', schoolId)
        .order('display_name', { ascending: true });
    
    res.render('school-dashboard', {
        layout: false,
        schoolName: school?.display_name || '学校',
        students: students || []
    });
});

// New student registration page
router.get('/register-student', schoolAuth, async function(req, res) {
    const schoolId = req.schoolId;
    
    const { data: school } = await supabase
        .from('schools')
        .select('display_name')
        .eq('id', schoolId)
        .single();
    
    res.render('school-register-student', {
        layout: false,
        schoolName: school?.display_name || '学校'
    });
});

// Handle student registration
router.post('/register-student', schoolAuth, async function(req, res) {
    const schoolId = req.schoolId;
    const { display_name, email_address, password, grade, skill_level, gender } = req.body;
    
    // Check if email already exists
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email_address', email_address)
        .single();
    
    if (existing) {
        return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert new user
    const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
            email_address,
            password: passwordHash,
            display_name,
            school_id: schoolId,
            grade,
            skill_level,
            gender,
            rating: 1500
        }])
        .select()
        .single();
    
    if (error) {
        return res.status(400).json({ error: 'ユーザー登録に失敗しました' });
    }
    
    res.redirect('/school-admin/dashboard');
});

// Logout
router.post('/logout', function(req, res) {
    res.clearCookie('schoolToken');
    res.redirect('/login/school');
});

export default router;
