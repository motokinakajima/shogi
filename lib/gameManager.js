import { Game } from '../domain/Game.js';
import { db } from './db.js';
import { Player } from '../domain/Player.js';
import { Rating } from '../domain/Rating.js';

export const activeGames = new Map(); // gameId -> Game instance
const gameTimers = new Map(); // gameId -> timeout ID

function scheduleTimeout(game) {
    if (game.isFinished) return;
    
    // 既存のタイマーをクリア
    const existingTimer = gameTimers.get(game.id);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }
    
    const timeState = game.timeManager.getState();
    const currentPlayer = game.currentTurn;
    const timeLeft = currentPlayer === Player.SENTE 
        ? timeState.senteTimeLeft 
        : timeState.goteTimeLeft;
    const inByoyomi = currentPlayer === Player.SENTE
        ? timeState.senteInByoyomi
        : timeState.goteInByoyomi;
    
    if (timeLeft <= 0) {
        // 既に時間切れ
        handleTimeout(game);
        return;
    }
    
    // 残り時間+100msマージンでタイムアウトをスケジュール
    const timeoutId = setTimeout(() => {
        console.log(`[scheduleTimeout] Timeout fired for game ${game.id}, player ${currentPlayer}`);
        handleTimeout(game);
    }, timeLeft + 100);
    
    gameTimers.set(game.id, timeoutId);
    console.log(`[scheduleTimeout] Scheduled timeout for game ${game.id} in ${timeLeft}ms`);
}

async function handleTimeout(game) {
    if (game.isFinished) return;
    
    const opponent = game.currentTurn === Player.SENTE ? Player.GOTE : Player.SENTE;
    console.log(`[handleTimeout] Game ${game.id} timed out. Winner: ${opponent}`);
    
    game.isFinished = true;
    game.winner = opponent;
    game.finishReason = 'timeout';
    
    try {
        await finishGame(game, opponent, 'timeout');
    } catch (error) {
        console.error('[handleTimeout] Failed to finish game:', error);
    }
}

export async function createGame(playerSenteId, playerGoteId, timeConfig = {}) {
    const timeControlStr = timeConfig.initialTime 
        ? `${timeConfig.initialTime}+${timeConfig.byoyomi || 0}`
        : null;
    
    const gameRecord = await db.insertInto('games').values({
        sente_id: playerSenteId,
        gote_id: playerGoteId,
        time_control: timeControlStr,
        is_finished: false
    }).returning('id').executeTakeFirst();

    const gameId = gameRecord.id;
    const newGame = new Game(gameId, playerSenteId, playerGoteId, timeConfig);
    activeGames.set(gameId, newGame);
    
    // 時間制限がある場合はタイマーを開始
    if (timeConfig.initialTime) {
        scheduleTimeout(newGame);
    }
    
    return newGame;
}

export function getGame(gameId) {
    return activeGames.get(gameId);
}

export function deleteGame(gameId) {
    activeGames.delete(gameId);
}

export function getAllActiveGames() {
    return Array.from(activeGames.values());
}

export function scheduleGameTimeout(game) {
    scheduleTimeout(game);
}

export async function finishGame(game, winner, finishReason = 'checkmate') {
    console.log(`[finishGame] Called for game ${game.id}, winner: ${winner}, reason: ${finishReason}, isFinished: ${game.isFinished}`);
    
    if (!game.isFinished) {
        throw new Error('Game is not finished yet');
    }

    const winnerId = winner === Player.SENTE ? game.senteId : game.goteId;
    const loserId = winner === Player.SENTE ? game.goteId : game.senteId;
    
    console.log(`[finishGame] Winner ID: ${winnerId}, Loser ID: ${loserId}`);

    // レーティング取得
    const winnerData = await db
        .selectFrom('users')
        .select('rating')
        .where('id', '=', winnerId)
        .executeTakeFirst();
    const loserData = await db
        .selectFrom('users')
        .select('rating')
        .where('id', '=', loserId)
        .executeTakeFirst();

    const winnerRating = winnerData?.rating ?? Rating.DEFAULT_RATING;
    const loserRating = loserData?.rating ?? Rating.DEFAULT_RATING;
    const { winnerNewRating, loserNewRating } = Rating.calculateMatch(winnerRating, loserRating);

    try {
        // ゲームレコードを更新
        await db.updateTable('games')
            .set({
                winner: winner,
                finish_reason: finishReason,
                finished_at: new Date(),
                is_finished: true
            })
            .where('id', '=', game.id)
            .execute();

        // レーティング履歴を保存
        await db.insertInto('rating_history').values([
            { user_id: winnerId, game_id: game.id, rating_before: winnerRating, rating_after: winnerNewRating },
            { user_id: loserId, game_id: game.id, rating_before: loserRating, rating_after: loserNewRating }
        ]).execute();

        // ユーザーのレーティングを更新
        await db.updateTable('users').set({ rating: winnerNewRating }).where('id', '=', winnerId).execute();
        await db.updateTable('users').set({ rating: loserNewRating }).where('id', '=', loserId).execute();

        // タイマーをクリア
        const timerId = gameTimers.get(game.id);
        if (timerId) {
            clearTimeout(timerId);
            gameTimers.delete(game.id);
        }
        
        // activeGamesから削除
        deleteGame(game.id);
    } catch (error) {
        console.error('Failed to finish game:', error);
        throw error;
    }
}