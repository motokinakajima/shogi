import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// AWS SES クライアント設定
const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kinote.app';
const FROM_NAME = process.env.FROM_NAME || 'KiNote 将棋システム';

/**
 * AWS SES経由でメール送信（SMTP不要）
 */
export async function sendEmailViaSES({ to, subject, text, html }) {
    try {
        const params = {
            Source: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            Destination: {
                ToAddresses: [to]
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: 'UTF-8'
                },
                Body: {
                    Text: {
                        Data: text,
                        Charset: 'UTF-8'
                    },
                    Html: {
                        Data: html,
                        Charset: 'UTF-8'
                    }
                }
            }
        };
        
        const command = new SendEmailCommand(params);
        const response = await sesClient.send(command);
        
        console.log('✓ Email sent via SES:', response.MessageId);
        
        return { success: true, messageId: response.MessageId };
    } catch (error) {
        console.error('✗ SES email send failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 新規生徒登録通知メール（SES版）
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
    
    return sendEmailViaSES({ to: email, subject, text, html });
}

/**
 * パスワードリセット通知メール（SES版）
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
    
    return sendEmailViaSES({ to: email, subject, text, html });
}

export default {
    sendEmailViaSES,
    sendStudentRegistrationEmail,
    sendPasswordResetEmail
};
