import { WebSocketServer } from 'ws';
import { joinLobby } from './lobby.js';
import { authenticate } from '../lib/auth.js';
import { db } from '../lib/db.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws, req) => {
    const userId = authenticate(req);
    if (!userId) return ws.close();

    // Fetch user's display name from database
    const user = await db
      .selectFrom('users')
      .select('display_name')
      .where('id', '=', userId)
      .executeTakeFirst();

    const displayName = user?.display_name || 'Unknown';
    joinLobby(ws, userId, displayName);
  });
}
