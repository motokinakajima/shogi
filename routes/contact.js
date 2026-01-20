import express from 'express';
var router = express.Router();
import { db } from '../lib/db.js';
import auth from '../lib/middlewares.js';
import { sendEmail } from '../lib/emailManager.js';
import { apiLimiter } from '../lib/rateLimiter.js';

router.get('/', async function (req, res) {
    // ログインしているかどうかで表示を変える
    const userToken = req.cookies.userToken;
    let userName = null;
    let userEmail = null;
    
    if (userToken) {
        try {
            const jwt = await import('jsonwebtoken');
            const decoded = jwt.default.verify(userToken, process.env.JWT_SECRET);
            const user = await db
                .selectFrom('users')
                .select(['display_name', 'email_address'])
                .where('id', '=', decoded.userId)
                .executeTakeFirst();
            
            if (user) {
                userName = user.display_name;
                userEmail = user.email_address;
            }
        } catch (error) {
            // トークンが無効な場合は無視
        }
    }
    
    res.render('contact', { 
        layout: false, 
        title: 'お問い合わせ',
        userName,
        userEmail
    });
});

router.post('/', apiLimiter, async function (req, res) {
    const { name, email, subject, message } = req.body;
    
    // バリデーション
    if (!name || !email || !subject || !message) {
        return res.render('contact', {
            layout: false,
            title: 'お問い合わせ',
            error: 'すべての項目を入力してください',
            userName: name,
            userEmail: email
        });
    }
    
    // メールアドレスの簡単なバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.render('contact', {
            layout: false,
            title: 'お問い合わせ',
            error: '有効なメールアドレスを入力してください',
            userName: name,
            userEmail: email
        });
    }
    
    try {
        // 管理者のメールアドレスを取得
        const admins = await db
            .selectFrom('users')
            .select(['email_address', 'display_name'])
            .where('is_admin', '=', true)
            .execute();
        
        if (admins.length === 0) {
            console.error('No admin users found');
            return res.render('contact', {
                layout: false,
                title: 'お問い合わせ',
                error: 'お問い合わせの送信に失敗しました。しばらくしてから再度お試しください。',
                userName: name,
                userEmail: email
            });
        }
        
        // 各管理者にメール送信
        const emailPromises = admins.map(admin => {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4D5D70; border-bottom: 2px solid #FFE498; padding-bottom: 10px;">
                        お問い合わせ通知
                    </h2>
                    
                    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <p><strong>件名:</strong> ${subject}</p>
                        <p><strong>送信者:</strong> ${name}</p>
                        <p><strong>メールアドレス:</strong> ${email}</p>
                    </div>
                    
                    <div style="background: white; padding: 20px; margin: 20px 0; border: 1px solid #ddd; border-radius: 5px;">
                        <h3 style="color: #333; margin-top: 0;">お問い合わせ内容:</h3>
                        <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                        <p>このメールに直接返信することで、送信者（${email}）に返信できます。</p>
                        <p style="margin-top: 10px;">
                            KiNote 将棋システム<br>
                            <a href="${process.env.BASE_URL || 'http://localhost:3000'}" style="color: #4D5D70;">${process.env.BASE_URL || 'http://localhost:3000'}</a>
                        </p>
                    </div>
                </div>
            `;
            
            return sendEmail({
                to: admin.email_address,
                replyTo: email, // 送信者のメールアドレスを返信先に設定
                subject: `[KiNote] お問い合わせ: ${subject}`,
                html: emailHtml
            });
        });
        
        // すべてのメール送信を待つ
        const results = await Promise.all(emailPromises);
        
        // 少なくとも1つ成功すればOK
        const hasSuccess = results.some(result => result.success);
        
        if (hasSuccess) {
            console.log(`✓ Contact form submitted by ${name} (${email})`);
            res.render('contact', {
                layout: false,
                title: 'お問い合わせ',
                success: 'お問い合わせを受け付けました。担当者から追って返信いたします。',
                userName: null,
                userEmail: null
            });
        } else {
            console.error('All admin notification emails failed');
            res.render('contact', {
                layout: false,
                title: 'お問い合わせ',
                error: 'お問い合わせの送信に失敗しました。しばらくしてから再度お試しください。',
                userName: name,
                userEmail: email
            });
        }
    } catch (error) {
        console.error('Contact form error:', error);
        res.render('contact', {
            layout: false,
            title: 'お問い合わせ',
            error: 'お問い合わせの送信中にエラーが発生しました。',
            userName: name,
            userEmail: email
        });
    }
});

export default router;
