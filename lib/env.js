/**
 * Environment variable validation
 * Validates all required environment variables on startup
 */

const requiredEnvVars = [
    'JWT_SECRET',
    'POSTGRES_HOST',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD'
];

const optionalEnvVars = {
    'NODE_ENV': 'development',
    'PORT': '3000',
    'BASE_URL': 'http://localhost:3000',
    'WS_URL': 'ws://localhost:3000',
    'AWS_REGION': 'us-east-2',
    'FROM_EMAIL': 'noreply@kinote.app',
    'FROM_NAME': 'KiNote 将棋システム'
};

export function validateEnv() {
    const missing = [];
    
    for (const varName of requiredEnvVars) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\nPlease set these variables in your .env file or environment.');
        process.exit(1);
    }
    
    // Set defaults for optional vars
    for (const [varName, defaultValue] of Object.entries(optionalEnvVars)) {
        if (!process.env[varName]) {
            process.env[varName] = defaultValue;
        }
    }
    
    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET.length < 32) {
        console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security.');
    }
    
    console.log('✓ Environment variables validated');
}
