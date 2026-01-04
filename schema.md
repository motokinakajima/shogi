# Database Schema

## users
ユーザーアカウント情報

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | ユーザーID（主キー） |
| email_address | TEXT | メールアドレス（ログイン用） |
| display_name | TEXT | 表示名 |
| password | TEXT | ハッシュ化されたパスワード |
| rating | INTEGER | レーティング（デフォルト: 1500） |
| is_admin | BOOLEAN | 管理者フラグ |
| school_id | UUID | 所属学校ID |
| grade | TEXT | 学年（例：小1、中2、高3） |
| skill_level | TEXT | 棋力（例：初心者、初級、中級、上級、有段者） |
| gender | TEXT | 性別 |

## schools
学校情報

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 学校ID（主キー） |
| display_name | TEXT | 学校名 |
| password | TEXT | ハッシュ化された学校パスワード |

## games
対局記録

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | BIGSERIAL | 対局ID（主キー） |
| sente_id | UUID | 先手のユーザーID |
| gote_id | UUID | 後手のユーザーID |
| winner | TEXT | 勝者（'sente' または 'gote'） |
| finish_reason | TEXT | 終局理由（例：'checkmate'） |
| created_at | TIMESTAMP | 対局開始日時 |

## moves
指し手記録

| カラム名 | 型 | 説明 |
|---------|-----|------|
| game_id | BIGINT | 対局ID |
| move_number | INTEGER | 手番 |
| player | TEXT | 指し手のプレイヤー（'sente' または 'gote'） |
| from_x | INTEGER | 移動元X座標（駒打ちの場合はnull） |
| from_y | INTEGER | 移動元Y座標（駒打ちの場合はnull） |
| to_x | INTEGER | 移動先X座標 |
| to_y | INTEGER | 移動先Y座標 |
| piece_kind | TEXT | 駒の種類（例：'fu', 'kin', 'ou'） |
| promoting | BOOLEAN | 成り判定 |

+time stamp, default: now()

## rating_history
レーティング履歴

| カラム名 | 型 | 説明 |
|---------|-----|------|
| user_id | UUID | ユーザーID |
| game_id | BIGINT | 対局ID |
| rating_before | INTEGER | 対局前レーティング |
| rating_after | INTEGER | 対局後レーティング |
| created_at | TIMESTAMP | 記録日時 |
