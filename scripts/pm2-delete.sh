#!/bin/bash
# PM2からアプリを完全削除（プロセスリストから消す）

sudo pm2 delete shogi-app

sudo pm2 status
