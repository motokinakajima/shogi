import express from 'express';
var router = express.Router();
import { supabase } from '../lib/supabase.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import auth from '../lib/middlewares.js';

router.get('/', async function (_req, res) {
    res.render('login', { layout: false, title: 'Login' });
});

router.get('/register', async function (_req, res) {
    res.render('register', { layout: false, title: 'Register' });
});

router.get('/school', async function(_req, res) {
    const { data, fetchError } = await supabase
        .from('schools')
        .select('id, display_name');
    if (fetchError) {
        return res.status(500).json({ error: 'Failed to fetch schools' });
    }
    res.render('school-login', { layout: false, title: 'School Login', schools: data });
});

router.get('/school-register', auth.adminAuth, async function(_req, res) {
    res.render('school-register', { layout: false });
});

router.get('/school-password-reset', auth.adminAuth, async function(_req, res) {
    const { data, fetchError } = await supabase
        .from('schools')
        .select('id, display_name');
    if (fetchError) {
        return res.status(500).json({ error: 'Failed to fetch schools' });
    }
    res.render('school-password-reset', { layout: false, title: 'School Password Reset', schools: data });
});

router.get('/auth-test', auth, async function (req, res) {
    res.render('auth_test', { title: 'Auth Test' });
});

router.post('/', async function (req, res) {
    const { email, password } = req.body;

    const { data, error } = await supabase
        .from('users')
        .select('id, password_hash, is_admin')
        .eq('email_address', email)
        .single();
    if (error || !data) {
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, data.password_hash);
    if (!ok) {
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
        { userId: data.id, isAdmin: data.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.cookie('userToken', token, { httpOnly: true, sameSite: 'lax' });
    res.redirect('/lobby');
});

router.post('/logout', function (_req, res) {
    res.clearCookie('userToken');
    res.redirect('/login');
});

router.post('/register', async function (req, res) {
    const { email, username, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email_address', email);
    if (existingUser.length > 0) {
        console.log(existingUser);
        return res.status(400).json({ error: 'Email address already exists' });
    }
    const { error: insertError } = await supabase
        .from('users')
        .insert([{ email_address: email, display_name: username, password_hash: passwordHash }]);
    if (insertError) {
        return res.status(400).json({ error: 'Registration failed' });
    }
    
    const token = jwt.sign(
        { userId: (await supabase.from('users').select('id').eq('email_address', email).single()).data.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
    res.cookie('userToken', token, { httpOnly: true, sameSite: 'lax' });
    res.redirect('/lobby');
});

router.post('/school', async function (req, res) {
    const { school, password } = req.body;

    const { data:passwordHash, error: fetchError } = await supabase
        .from('schools')
        .select('password_hash')
        .eq('id', school)
        .single();
    if (fetchError) {
        return res.status(400).json({ error: 'Invalid school login credentials' });
    }

    const ok = await bcrypt.compare(password, passwordHash.password_hash);
    if (!ok) {
        return res.status(400).json({ error: 'Invalid school login credentials' });
    }

    const token = jwt.sign({ schoolId: school }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('schoolToken', token, { httpOnly: true, sameSite: 'lax' });
    res.redirect('/school-admin/dashboard');
});

router.post('/school-register', auth.adminAuth, async function (req, res) {
    const { school, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const { error: insertError } = await supabase
        .from('schools')
        .insert([{ display_name: school, password_hash: passwordHash }]);
    if (insertError) {
        return res.status(400).json({ error: 'School registration failed' });
    }
    res.json({ message: 'School registration successful' });
});

router.post('/school-password-reset', auth.adminAuth, async function (req, res) {
    const { school, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const { error: updateError } = await supabase
        .from('schools')
        .update({ password_hash: passwordHash })
        .eq('id', school);
    if (updateError) {
        return res.status(400).json({ error: 'Password reset failed' });
    }
    res.json({ message: 'Password reset successful' });
});

export default router;