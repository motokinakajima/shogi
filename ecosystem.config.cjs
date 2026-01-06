module.exports = {
  apps: [{
    name: 'shogi-app',
    script: './bin/www',
    instances: 1, // WebSocketを使うのでシングルインスタンス推奨
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 80
    },
    // ログ設定
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // 自動再起動設定
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s',
    // メモリ監視
    max_memory_restart: '1G',
    // クラッシュ時の遅延再起動
    restart_delay: 4000,
    // ヘルスチェック
    health_check: {
      enabled: true,
      max_restarts: 3,
      min_uptime: '5s'
    }
  }]
};