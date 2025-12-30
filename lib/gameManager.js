import { Game } from './domain/game.js';
import crypto from 'crypto';

export const activeGames = new Map(); // gameId -> Game instance

export function createGame(playerSenteId, playerGoteId) {
    const gameId = crypto.randomUUID();
    const newGame = new Game(gameId, playerSenteId, playerGoteId);
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