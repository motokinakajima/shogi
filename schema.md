# Database Schema

## users
ユーザーアカウント情報

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, default: gen_random_uuid() | ユーザーID |
| created_at | TIMESTAMPTZ | NOT NULL, default: NOW() | 作成日時 |
| email_address | TEXT | NOT NULL, UNIQUE | メールアドレス（ログイン用） |
| display_name | TEXT | NOT NULL | 表示名 |
| password_hash | TEXT | NOT NULL | ハッシュ化されたパスワード |
| rating | INTEGER | NOT NULL, default: 1500 | レーティング |
| is_admin | BOOLEAN | nullable | 管理者フラグ |
| school_id | UUID | nullable, FK → schools.id | 所属学校ID |
| grade | TEXT | nullable | 学年（例：小1、中2、高3） |
| skill_level | TEXT | nullable | 棋力（例：初心者、初級、中級、上級、有段者） |
| gender | TEXT | nullable | 性別 |

## schools
学校情報

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, default: gen_random_uuid() | 学校ID |
| created_at | TIMESTAMPTZ | NOT NULL, default: NOW() | 作成日時 |
| display_name | TEXT | NOT NULL | 学校名 |
| password_hash | TEXT | NOT NULL | ハッシュ化された学校パスワード |

## games
対局記録

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, default: gen_random_uuid() | 対局ID |
| created_at | TIMESTAMPTZ | NOT NULL, default: NOW() | 対局開始日時 |
| sente_id | UUID | NOT NULL, FK → users.id | 先手のユーザーID |
| gote_id | UUID | NOT NULL, FK → users.id | 後手のユーザーID |
| winner | TEXT | nullable, CHECK ('sente', 'gote') | 勝者（'sente' または 'gote'） |
| finish_reason | TEXT | nullable | 終局理由（例：'checkmate', 'timeout', 'resign'） |
| finished_at | TIMESTAMPTZ | nullable | 終局日時 |
| time_control | TEXT | nullable | 持ち時間設定 |
| is_finished | BOOLEAN | NOT NULL, default: false | 終局フラグ |

## moves
指し手記録

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | BIGSERIAL | PK | move id |
| created_at | TIMESTAMPTZ | NOT NULL, default: NOW() | 作成日時 |
| game_id | UUID | NOT NULL, FK → games.id ON DELETE CASCADE | 対局ID |
| move_number | INTEGER | NOT NULL | 手番 |
| player | TEXT | NOT NULL | 指し手のプレイヤー（'sente' または 'gote'） |
| from_x | INTEGER | nullable | 移動元X座標（駒打ちの場合はnull） |
| from_y | INTEGER | nullable | 移動元Y座標（駒打ちの場合はnull） |
| to_x | INTEGER | NOT NULL | 移動先X座標 |
| to_y | INTEGER | NOT NULL | 移動先Y座標 |
| piece_kind | TEXT | nullable | 駒の種類（例：'fu', 'kin', 'ou'） |
| promoting | BOOLEAN | NOT NULL, default: false | 成り判定 |

## rating_history
レーティング履歴

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | BIGSERIAL | PK | rating history id |
| created_at | TIMESTAMPTZ | NOT NULL, default: NOW() | 作成日時 |
| user_id | UUID | NOT NULL, FK → users.id | ユーザーID |
| game_id | UUID | NOT NULL, FK → games.id ON DELETE CASCADE | 対局ID |
| rating_before | INTEGER | NOT NULL | 対局前レーティング |
| rating_after | INTEGER | NOT NULL | 対局後レーティング |

---

## Indexes

| テーブル | インデックス名 | カラム | 説明 |
|---------|---------------|--------|------|
| users | idx_users_school_id | school_id | 学校ごとのユーザー検索用 |
| games | idx_games_sente_id | sente_id | 先手ユーザーの対局検索用 |
| games | idx_games_gote_id | gote_id | 後手ユーザーの対局検索用 |
| moves | idx_moves_game_id | game_id | 対局ごとの指し手検索用 |
| rating_history | idx_rating_history_user_id | user_id | ユーザーのレーティング履歴検索用 |
| rating_history | idx_rating_history_game_id | game_id | 対局ごとのレーティング変動検索用 |
