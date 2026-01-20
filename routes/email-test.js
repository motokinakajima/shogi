import express from 'express';
const router = express.Router();
import auth from '../lib/middlewares.js';
import { 
    sendStudentRegistrationEmail,
    sendPasswordResetEmail,
    sendEmail
} from '../lib/emailManager.js';

// メールテストページ（管理者認証必須）
router.get('/test', auth.adminAuth, function(req, res) {
    res.render('email-test', {
        layout: false
    });
});

// テストメール送信（管理者認証必須）
router.post('/test/send', auth.adminAuth, async function(req, res) {
    const { to, type, subject, message } = req.body;
    
    try {
        let result;
        
        if (type === 'custom') {
            // カスタムメッセージ送信
            const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #4D5D70;
            color: #FFE498;
            padding: 20px;
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 2px;
        }
        .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #ddd;
            white-space: pre-wrap;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">KiNote</div>
    <div class="content">${message}</div>
    <div class="footer">
        KiNote 将棋システム<br>
        <a href="https://kinote.app">https://kinote.app</a>
    </div>
</body>
</html>
            `.trim();
            
            result = await sendEmail({
                to,
                subject: subject || 'KiNoteからのお知らせ',
                text: message,
                html
            });
        } else if (type === 'student-registration') {
            result = await sendStudentRegistrationEmail({
                email: to,
                displayName: 'テスト太郎',
                resetUrl: 'http://localhost:3000/login/reset-password/test-token-12345',
                schoolName: 'テスト小学校'
            });
        } else if (type === 'password-reset') {
            result = await sendPasswordResetEmail({
                email: to,
                displayName: 'テスト太郎',
                resetUrl: 'http://localhost:3000/login/reset-password/test-token-67890'
            });
        } else {
            return res.status(400).json({ error: '不明なメールタイプです' });
        }
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'メール送信成功',
                messageId: result.messageId 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (error) {
        console.error('Email test error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Etherealテストアカウント作成 (削除 - SES使用のため不要)

export default router;
