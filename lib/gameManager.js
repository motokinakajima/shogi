import { Game } from '../domain/Game.js';
import { db } from './db.js';

export const activeGames = new Map(); // gameId -> Game instance

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