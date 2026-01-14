#!/bin/bash
# PM2でアプリをゼロダウンタイムリロード（コード更新時に使用）

cd "$(dirname "$0")/.."

sudo pm2 reload ecosystem.config.cjs --env production

sudo pm2 status
