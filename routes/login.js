import express from 'express';
var router = express.Router();
import { db } from '../lib/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import auth from '../lib/middlewares.js';
import { generateResetToken, validateResetToken, consumeResetToken, generateNewUserToken } from '../lib/passwordResetManager.js';
import { sendPasswordResetEmail } from '../lib/emailManager.js';
import { getCookieOptions } from '../lib/cookieHelper.js';
import { authLimiter, passwordResetLimiter } from '../lib/rateLimiter.js';

router.get('/', async function (_req, res) {
    res.render('login', { layout: false, title: 'Login' });
});

router.get('/register', async function (_req, res) {
    res.render('register', { layout: false, title: 'Register' });
});

router.get('/forgot-password', async function (_req, res) {
    res.render('forgot-password', { layout: false, title: 'Forgot Password' });
});

router.get('/reset-password/:token', async function (req, res) {
    const { token } = req.params;
    const result = validateResetToken(token);
    
    if (!result.valid) {
        return res.render('reset-password', { 
            layout: false, 
            title: 'Reset Password',
            error: result.error === 'expired' ? 'トークンの有効期限が切れています' : 'トークンが無効です',
            token: null
        });
    }
    
    res.render('reset-password', { 
        layout: false, 
        title: 'Reset Password',
        token,
        email: result.email,
        error: null
    });
});

router.get('/school', async function(_req, res) {
    try {
        const data = await db
            .selectFrom('schools')
            .select(['id', 'display_name'])
            .execute();
        res.render('school-login', { layout: false, title: 'School Login', schools: data });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch schools' });
    }
});

router.get('/school-register', auth.adminAuth, async function(_req, res) {
    res.render('school-register', { layout: false });
});

router.get('/school-password-reset', auth.adminAuth, async function(_req, res) {
    try {
        const data = await db
            .selectFrom('schools')
            .select(['id', 'display_name'])
            .execute();
        res.render('school-password-reset', { layout: false, title: 'School Password Reset', schools: data });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch schools' });
    }
});

router.get('/auth-test', auth, async function (req, res) {
    res.render('auth_test', { title: 'Auth Test' });
});

router.post('/', authLimiter, async function (req, res) {
    const { email, password } = req.body;

    try {
        const data = await db
            .selectFrom('users')
            .select(['id', 'password_hash', 'is_admin'])
            .where('email_address', '=', email)
            .executeTakeFirst();
        
        if (!data) {
            return res.render('login', { 
                layout: false, 
                title: 'Login',
                error: 'メールアドレスまたはパスワードが正しくありません'
            });
        }

        const ok = await bcrypt.compare(password, data.password_hash);
        if (!ok) {
            return res.render('login', { 
                layout: false, 
                title: 'Login',
                error: 'メールアドレスまたはパスワードが正しくありません'
            });
        }

        const token = jwt.sign(
            { userId: data.id, isAdmin: data.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('userToken', token, { 
            ...getCookieOptions(),
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.redirect('/');
    } catch (error) {
        console.error('Login error:', error);
        return res.render('login', { 
            layout: false, 
            title: 'Login',
            error: 'ログイン処理中にエラーが発生しました'
        });
    }
});

router.post('/logout', function (_req, res) {
    res.clearCookie('userToken');
    res.redirect('/login');
});

// 新規登録：学校管理者が登録したメールアドレスにパスワード設定リンクを送信
router.post('/register', async function (req, res) {
    const { email } = req.body;
    
    try {
        // 既に登録されているユーザー（学校管理者が登録済み）を検索
        const user = await db
            .selectFrom('users')
            .select(['id', 'password_hash'])
            .where('email_address', '=', email)
            .executeTakeFirst();
        
        if (!user) {
            // ユーザーが存在しない場合（学校管理者が登録していない）
            return res.status(400).json({ 
                error: 'このメールアドレスはメンバー登録されていません。学校の管理者にお問い合わせください。' 
            });
        }
        
        // パスワードが既に設定されているかチェック（初期パスワードはランダム生成なので区別不可だが、説明表示）
        // 24時間トークンを生成
        const result = generateNewUserToken(user.id, email);
        
        if (!result.success) {
            return res.status(429).json({ error: result.error });
        }
        
        const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/login/reset-password/${result.token}`;
        
        // TODO: 実際のメール送信処理
        console.log('\n=== 新規登録パスワード設定URL ===');
        console.log(`メールアドレス: ${email}`);
        console.log(`URL: ${resetUrl}`);
        console.log('（有効期限: 24時間）');
        console.log('================================\n');
        
        res.json({ 
            success: true,
            message: 'パスワード設定用のリンクをメールで送信しました。メールをご確認ください。'
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: '登録処理中にエラーが発生しました' });
    }
});

router.post('/forgot-password', passwordResetLimiter, async function (req, res) {
    const { email } = req.body;
    
    try {
        const user = await db
            .selectFrom('users')
            .select(['id', 'display_name'])
            .where('email_address', '=', email)
            .executeTakeFirst();
        
        if (!user) {
            // セキュリティのため、メールが存在しなくても同じメッセージを返す
            return res.render('forgot-password', {
                layout: false,
                success: 'パスワードリセットのリンクを送信しました（メールアドレスが登録されている場合）',
                error: null
            });
        }
        
        const result = generateResetToken(user.id, email);
        
        if (!result.success) {
            return res.render('forgot-password', {
                layout: false,
                error: result.error,
                success: null
            });
        }
        
        const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/login/reset-password/${result.token}`;
        
        // メール送信
        const emailResult = await sendPasswordResetEmail({
            email,
            displayName: user.display_name || 'ユーザー',
            resetUrl
        });
        
        if (emailResult.success) {
            console.log('✓ Password reset email sent to:', email);
            // コンソールにも出力（バックアップ）
            console.log('\n=== PASSWORD RESET URL ===');
            console.log(`Email: ${email}`);
            console.log(`Reset URL: ${resetUrl}`);
            console.log('========================\n');
            
            res.render('forgot-password', {
                layout: false,
                success: 'パスワードリセットのリンクをメールで送信しました。メールをご確認ください。',
                error: null
            });
        } else {
            console.error('✗ Failed to send password reset email:', emailResult.error);
            res.render('forgot-password', {
                layout: false,
                error: 'メール送信に失敗しました。しばらくしてから再度お試しください。',
                success: null
            });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.render('forgot-password', {
            layout: false,
            success: 'パスワードリセットのリンクを送信しました（メールアドレスが登録されている場合）',
            error: null
        });
    }
});

router.post('/reset-password/:token', async function (req, res) {
    const { token } = req.params;
    const { password } = req.body;
    
    const result = consumeResetToken(token);
    
    if (!result.valid) {
        return res.render('reset-password', {
            layout: false,
            error: result.error === 'expired' ? 'トークンの有効期限が切れています' : 'トークンが無効です',
            token: null
        });
    }
    
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        await db
            .updateTable('users')
            .set({ password_hash: passwordHash })
            .where('id', '=', result.userId)
            .execute();
        
        // パスワード設定完了後、ログインページにリダイレクト
        res.redirect('/login?reset=success');
    } catch (error) {
        console.error('Password reset error:', error);
        return res.render('reset-password', {
            layout: false,
            error: 'パスワードの更新に失敗しました',
            token
        });
    }
});

router.post('/school', async function (req, res) {
    const { school, password } = req.body;

    try {
        const schoolData = await db
            .selectFrom('schools')
            .select('password_hash')
            .where('id', '=', school)
            .executeTakeFirst();
        
        if (!schoolData) {
            const data = await db
                .selectFrom('schools')
                .select(['id', 'display_name'])
                .execute();
            return res.render('school-login', { 
                layout: false, 
                title: 'School Login', 
                schools: data,
                error: '学校IDまたはパスワードが正しくありません'
            });
        }

        const ok = await bcrypt.compare(password, schoolData.password_hash);
        if (!ok) {
            const data = await db
                .selectFrom('schools')
                .select(['id', 'display_name'])
                .execute();
            return res.render('school-login', { 
                layout: false, 
                title: 'School Login', 
                schools: data,
                error: '学校IDまたはパスワードが正しくありません'
            });
        }

        const token = jwt.sign({ schoolId: school }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('schoolToken', token, { 
            ...getCookieOptions(),
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        res.redirect('/school-admin/dashboard');
    } catch (error) {
        console.error('School login error:', error);
        return res.status(500).json({ error: 'ログイン処理中にエラーが発生しました' });
    }
});

router.post('/school-register', auth.adminAuth,  async function (req, res) {
    const { school, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    try {
        await db
            .insertInto('schools')
            .values({ display_name: school, password_hash: passwordHash })
            .execute();
        res.json({ message: 'School registration successful' });
    } catch (error) {
        return res.status(400).json({ error: 'School registration failed' });
    }
});

router.post('/school-password-reset', auth.adminAuth, async function (req, res) {
    const { school, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    try {
        await db
            .updateTable('schools')
            .set({ password_hash: passwordHash })
            .where('id', '=', school)
            .execute();
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        return res.status(400).json({ error: 'Password reset failed' });
    }
});

export default router;
