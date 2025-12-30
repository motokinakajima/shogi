import {
    addOnlineUser,
    removeOnlineUser,
    getOnlineUserIds,
    getOnlineSockets,
    getSocketByUserId
} from './onlineUsers.js';
import { randomUUID } from 'crypto';

const challenges = new Map();
const CHALLENGE_EXPIRY_MS = 60000;

function broadcastOnlineUsers() {
    const payload = JSON.stringify({
        type: 'lobby:update',
        users: getOnlineUserIds(),
    });

    for (const ws of getOnlineSockets()) {
        if (ws.readyState === ws.OPEN) {
            ws.send(payload);
        }
    }
}

function cleanupExpiredChallenges() {
    const now = Date.now();
    for (const [challengeId, challenge] of challenges.entries()) {
        if (now - challenge.timestamp > CHALLENGE_EXPIRY_MS) {
            const targetWs = getSocketByUserId(challenge.toUserId);
            const fromWs = getSocketByUserId(challenge.fromUserId);
            
            if (targetWs) {
                targetWs.send(JSON.stringify({
                    type: 'challenge:expired',
                    challengeId
                }));
            }
            
            if (fromWs) {
                fromWs.send(JSON.stringify({
                    type: 'challenge:expired',
                    challengeId
                }));
            }
            
            challenges.delete(challengeId);
        }
    }
}

setInterval(cleanupExpiredChallenges, 10000);

export function joinLobby(ws, userId, displayName) {
    addOnlineUser(userId, ws);
    broadcastOnlineUsers();

    ws.on('message', (raw) => {
        const msg = JSON.parse(raw);

        if (msg.type === 'challenge:send') {
            const targetWs = getSocketByUserId(msg.targetUserId);
            if (!targetWs) return;

            const challengeId = randomUUID();
            challenges.set(challengeId, {
                fromUserId: userId,
                fromDisplayName: displayName,
                toUserId: msg.targetUserId,
                timestamp: Date.now()
            });

            targetWs.send(JSON.stringify({
                type: 'challenge:received',
                challengeId,
                fromUserId: userId,
                fromDisplayName: displayName,
            }));

            ws.send(JSON.stringify({
                type: 'challenge:sent',
                challengeId,
                targetUserId: msg.targetUserId
            }));
        }

        if (msg.type === 'challenge:accept') {
            const challenge = challenges.get(msg.challengeId);
            if (!challenge) return;

            const challengerWs = getSocketByUserId(challenge.fromUserId);
            if (!challengerWs) return;

            challengerWs.send(JSON.stringify({
                type: 'challenge:accepted',
                challengeId: msg.challengeId
            }));

            ws.send(JSON.stringify({
                type: 'challenge:accepted',
                challengeId: msg.challengeId
            }));

            challenges.delete(msg.challengeId);
        }

        if (msg.type === 'challenge:decline') {
            const challenge = challenges.get(msg.challengeId);
            if (!challenge) return;

            const challengerWs = getSocketByUserId(challenge.fromUserId);
            if (challengerWs) {
                challengerWs.send(JSON.stringify({
                    type: 'challenge:declined',
                    challengeId: msg.challengeId,
                    byUserId: userId
                }));
            }

            challenges.delete(msg.challengeId);
        }

        if (msg.type === 'challenge:cancel') {
            const challenge = challenges.get(msg.challengeId);
            if (!challenge) return;

            const targetWs = getSocketByUserId(challenge.toUserId);
            if (targetWs) {
                targetWs.send(JSON.stringify({
                    type: 'challenge:cancelled',
                    challengeId: msg.challengeId
                }));
            }

            challenges.delete(msg.challengeId);
        }
    });

    ws.on('close', () => {
        for (const [challengeId, challenge] of challenges.entries()) {
            if (challenge.fromUserId === userId || challenge.toUserId === userId) {
                const otherUserId = challenge.fromUserId === userId ? challenge.toUserId : challenge.fromUserId;
                const otherWs = getSocketByUserId(otherUserId);
                
                if (otherWs) {
                    otherWs.send(JSON.stringify({
                        type: 'challenge:cancelled',
                        challengeId
                    }));
                }
                
                challenges.delete(challengeId);
            }
        }

        removeOnlineUser(userId);
        broadcastOnlineUsers();
    });
}
