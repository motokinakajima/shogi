#!/bin/bash
# 全てのNodeプロセスを強制終了（PM2外で動いているプロセスも含む）
# stoppedなのにアクセスできる場合に使用

echo "=== 現在のNodeプロセス ==="
ps aux | grep node

echo ""
echo "=== 全Nodeプロセスを終了 ==="
sudo pkill -f node || true

echo ""
echo "=== PM2ステータス ==="
sudo pm2 status

echo ""
echo "=== 残っているNodeプロセス ==="
ps aux | grep node
