const onlineUsers = new Map();

function addOnlineUser(userId, ws) {
    onlineUsers.set(userId, ws);
}

function removeOnlineUser(userId) {
    onlineUsers.delete(userId);
}

function getOnlineUserIds() {
    return [...onlineUsers.keys()];
}

function getOnlineSockets() {
    return [...onlineUsers.values()];
}

function getSocketByUserId(userId) {
    return onlineUsers.get(userId);
}

export {
    onlineUsers,
    addOnlineUser,
    removeOnlineUser,
    getOnlineUserIds,
    getOnlineSockets,
    getSocketByUserId
};