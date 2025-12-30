import { WebSocketServer } from 'ws';
import { joinLobby } from './lobby.js';
import { authenticate } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws, req) => {
    const userId = authenticate(req);
    if (!userId) return ws.close();

    // Fetch user's display name from database
    const { data: user } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', userId)
      .single();

    const displayName = user?.display_name || 'Unknown';
    joinLobby(ws, userId, displayName);
  });
}
