#!/bin/bash
# PM2でアプリを本番モードで起動

cd "$(dirname "$0")/.."

sudo pm2 start ecosystem.config.cjs --env production

sudo pm2 status
