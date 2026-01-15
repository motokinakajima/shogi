/**
 * Cookie helper with environment-aware security settings
 * Uses secure flag in production, allows HTTP in development
 */

export function getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
        httpOnly: true,
        sameSite: 'lax', // Can be changed to 'strict' if needed
        secure: isProduction, // Only secure in production (HTTPS required)
        // maxAge can be set per cookie if needed
    };
}
