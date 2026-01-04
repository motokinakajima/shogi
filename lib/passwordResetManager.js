import crypto from 'crypto';

const passwordResetTokens = new Map();

const rateLimitMap = new Map();

const CONFIG = {
    TOKEN_EXPIRY_MS: 60 * 60 * 1000, // 1時間
    RATE_LIMIT_MS: 60 * 1000, // 1分（同じメールアドレスからの再リクエスト制限）
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000 // 5分ごとにクリーンアップ
};

const cleanupInterval = setInterval(() => {
    const now = Date.now();
    
    for (const [token, data] of passwordResetTokens.entries()) {
        if (data.expiresAt < now) {
            passwordResetTokens.delete(token);
        }
    }
    
    for (const [email, lastTime] of rateLimitMap.entries()) {
        if (now - lastTime > CONFIG.RATE_LIMIT_MS * 10) {
            rateLimitMap.delete(email);
        }
    }
}, CONFIG.CLEANUP_INTERVAL_MS);

process.on('SIGTERM', () => {
    clearInterval(cleanupInterval);
});


export function generateResetToken(userId, email) {
    const lastRequestTime = rateLimitMap.get(email);
    const now = Date.now();
    
    if (lastRequestTime && (now - lastRequestTime) < CONFIG.RATE_LIMIT_MS) {
        const remainingSeconds = Math.ceil((CONFIG.RATE_LIMIT_MS - (now - lastRequestTime)) / 1000);
        return {
            success: false,
            error: `しばらく待ってから再度お試しください（あと${remainingSeconds}秒）`
        };
    }
    for (const [token, data] of passwordResetTokens.entries()) {
        if (data.userId === userId) {
            passwordResetTokens.delete(token);
        }
    }
    const token = crypto.randomUUID();
    const expiresAt = now + CONFIG.TOKEN_EXPIRY_MS;
    
    passwordResetTokens.set(token, {
        userId,
        email,
        expiresAt,
        createdAt: now
    });
    
    rateLimitMap.set(email, now);
    
    return {
        success: true,
        token
    };
}


export function validateResetToken(token) {
    const data = passwordResetTokens.get(token);
    
    if (!data) {
        return {
            valid: false,
            error: 'トークンが無効です'
        };
    }
    
    if (data.expiresAt < Date.now()) {
        passwordResetTokens.delete(token);
        return {
            valid: false,
            error: 'トークンの有効期限が切れています。もう一度リクエストしてください。'
        };
    }
    
    return {
        valid: true,
        userId: data.userId,
        email: data.email
    };
}


export function consumeResetToken(token) {
    const result = validateResetToken(token);
    
    if (result.valid) {
        passwordResetTokens.delete(token);
    }
    
    return result;
}



export function getStats() {
    return {
        activeTokens: passwordResetTokens.size,
        rateLimitedEmails: rateLimitMap.size
    };
}


export function clearAllTokens() {
    passwordResetTokens.clear();
    rateLimitMap.clear();
}
