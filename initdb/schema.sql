-- =============================================
-- Database Schema for Shogi Application
-- PostgreSQL
-- =============================================

-- schools テーブル（usersより先に作成）
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL
);

-- users テーブル
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email_address TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 1500,
    is_admin BOOLEAN,
    school_id UUID REFERENCES schools(id),
    grade TEXT,
    skill_level TEXT,
    gender TEXT
);

-- games テーブル
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sente_id UUID NOT NULL REFERENCES users(id),
    gote_id UUID NOT NULL REFERENCES users(id),
    winner TEXT CHECK (winner IN ('sente', 'gote')),
    finish_reason TEXT NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_control TEXT
);

-- moves テーブル
CREATE TABLE moves (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    move_number INTEGER NOT NULL,
    player TEXT NOT NULL CHECK (player IN ('sente', 'gote')),
    from_x INTEGER,
    from_y INTEGER,
    to_x INTEGER NOT NULL,
    to_y INTEGER NOT NULL,
    piece_kind TEXT,
    promoting BOOLEAN NOT NULL DEFAULT false
);

-- rating_history テーブル
CREATE TABLE rating_history (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES users(id),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    rating_before INTEGER NOT NULL,
    rating_after INTEGER NOT NULL
);

-- =============================================
-- Indexes
-- =============================================

-- users
CREATE INDEX idx_users_school_id ON users(school_id);

-- games
CREATE INDEX idx_games_sente_id ON games(sente_id);
CREATE INDEX idx_games_gote_id ON games(gote_id);

-- moves
CREATE INDEX idx_moves_game_id ON moves(game_id);

-- rating_history
CREATE INDEX idx_rating_history_user_id ON rating_history(user_id);
CREATE INDEX idx_rating_history_game_id ON rating_history(game_id);
