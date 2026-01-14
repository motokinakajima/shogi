#!/bin/bash
# デプロイスクリプト（git pull → npm install → pm2 reload）

set -e  # エラーで停止

cd "$(dirname "$0")/.."

echo "=== Git Pull ==="
git pull origin main

echo "=== NPM Install ==="
npm install --production

echo "=== PM2 Reload ==="
sudo pm2 reload ecosystem.config.cjs --env production

echo "=== Status ==="
sudo pm2 status

echo "=== Deploy Complete ==="
