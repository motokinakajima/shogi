import nodemailer from 'nodemailer';

// メール設定
const EMAIL_CONFIG = {
    // 開発環境: Ethereal Email (テスト用メールサービス)
    // 本番環境: SendGrid / AWS SES / Gmail SMTP などに切り替え
    development: {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
            pass: process.env.EMAIL_PASS || 'ethereal_password'
        }
    },
    production: {
        // SendGrid example
        host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER || 'apikey',
            pass: process.env.SMTP_PASS || ''
        }
    }
};

// トランスポーター作成
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    
    const env = process.env.NODE_ENV || 'development';
    const config = EMAIL_CONFIG[env];
    
    transporter = nodemailer.createTransport(config);
    
    return transporter;
}

// メールアドレスとテンプレート設定
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kinote.app';
const FROM_NAME = process.env.FROM_NAME || 'KiNote 将棋システム';

/**
 * メール送信の基本関数
 */
export async function sendEmail({ to, subject, text, html }) {
    try {
        const transporter = getTransporter();
        
        const info = await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to,
            subject,
            text,
            html
        });
        
        console.log('✓ Email sent:', info.messageId);
        
        // Ethereal Emailの場合はプレビューURLを出力
        if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('✗ Email send failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 新規生徒登録通知メール（パスワード設定URL付き）
 */
export async function sendStudentRegistrationEmail({ email, displayName, resetUrl, schoolName }) {
    const subject = `【KiNote】${schoolName}への登録が完了しました`;
    
    const text = `
${displayName} 様

${schoolName}の将棋システム「KiNote」に登録されました。

以下のリンクからパスワードを設定してください（24時間有効）：
${resetUrl}

ご不明な点がございましたら、学校の担当者にお問い合わせください。

---
KiNote 将棋システム
https://kinote.app
    `.trim();
    
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
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: #4D5D70;
            color: #ffffff !important;
            text-decoration: none;
            border: 1px solid #000000;
            margin: 20px 0;
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
    <div class="content">
        <p><strong>${displayName}</strong> 様</p>
        
        <p>${schoolName}の将棋システム「KiNote」に登録されました。</p>
        
        <p>以下のボタンからパスワードを設定してください：</p>
        
        <p style="text-align: center;">
            <a href="${resetUrl}" class="button">パスワードを設定する</a>
        </p>
        
        <p style="font-size: 12px; color: #666;">
            ※ このリンクは24時間有効です<br>
            ※ リンクが開けない場合は、以下のURLをコピーしてブラウザに貼り付けてください：<br>
            <code>${resetUrl}</code>
        </p>
        
        <p>ご不明な点がございましたら、学校の担当者にお問い合わせください。</p>
        
        <div class="footer">
            KiNote 将棋システム<br>
            <a href="https://kinote.app">https://kinote.app</a>
        </div>
    </div>
</body>
</html>
    `.trim();
    
    return sendEmail({ to: email, subject, text, html });
}

/**
 * パスワードリセット通知メール
 */
export async function sendPasswordResetEmail({ email, displayName, resetUrl }) {
    const subject = '【KiNote】パスワード再設定のご案内';
    
    const text = `
${displayName} 様

パスワード再設定のリクエストを受け付けました。

以下のリンクからパスワードを再設定してください（1時間有効）：
${resetUrl}

このリクエストに心当たりがない場合は、このメールを無視してください。

---
KiNote 将棋システム
https://kinote.app
    `.trim();
    
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
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: #4D5D70;
            color: #ffffff !important;
            text-decoration: none;
            border: 1px solid #000000;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }
        .warning {
            background: #fff8e1;
            padding: 12px;
            margin: 15px 0;
            border-left: 3px solid #FFE498;
        }
    </style>
</head>
<body>
    <div class="header">KiNote</div>
    <div class="content">
        <p><strong>${displayName}</strong> 様</p>
        
        <p>パスワード再設定のリクエストを受け付けました。</p>
        
        <p style="text-align: center;">
            <a href="${resetUrl}" class="button">パスワードを再設定する</a>
        </p>
        
        <p style="font-size: 12px; color: #666;">
            ※ このリンクは1時間有効です<br>
            ※ リンクが開けない場合は、以下のURLをコピーしてブラウザに貼り付けてください：<br>
            <code>${resetUrl}</code>
        </p>
        
        <div class="warning">
            <strong>このリクエストに心当たりがない場合</strong><br>
            このメールを無視してください。パスワードは変更されません。
        </div>
        
        <div class="footer">
            KiNote 将棋システム<br>
            <a href="https://kinote.app">https://kinote.app</a>
        </div>
    </div>
</body>
</html>
    `.trim();
    
    return sendEmail({ to: email, subject, text, html });
}

/**
 * テストメール送信（開発用）
 */
export async function sendTestEmail(to) {
    const subject = '【KiNote】テストメール';
    const text = 'これはテストメールです。メール送信機能が正常に動作しています。';
    const html = `
        <h1>KiNote テストメール</h1>
        <p>メール送信機能が正常に動作しています。</p>
        <p>送信時刻: ${new Date().toLocaleString('ja-JP')}</p>
    `;
    
    return sendEmail({ to, subject, text, html });
}

/**
 * Etherealメールのテストアカウント作成（開発用）
 */
export async function createTestEmailAccount() {
    try {
        const testAccount = await nodemailer.createTestAccount();
        console.log('\n=== Ethereal Test Email Account ===');
        console.log('User:', testAccount.user);
        console.log('Pass:', testAccount.pass);
        console.log('SMTP:', testAccount.smtp.host, ':', testAccount.smtp.port);
        console.log('\n.env に以下を追加してください:');
        console.log(`EMAIL_USER=${testAccount.user}`);
        console.log(`EMAIL_PASS=${testAccount.pass}`);
        console.log('=====================================\n');
        
        return testAccount;
    } catch (error) {
        console.error('Failed to create test account:', error);
        return null;
    }
}

export default {
    sendEmail,
    sendStudentRegistrationEmail,
    sendPasswordResetEmail,
    sendTestEmail,
    createTestEmailAccount
};
