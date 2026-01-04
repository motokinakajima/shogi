// Game configuration variables - passed from server via EJS template
// These must be defined before this script loads:
// const gameId, currentUserId, senteId, goteId

const isSpectator = currentUserId !== senteId && currentUserId !== goteId;
const myPlayer = isSpectator ? 'sente' : (currentUserId === senteId ? 'sente' : 'gote');

const KANJI = { fu:'歩', kyosha:'香', keima:'桂', gin:'銀', kin:'金', kaku:'角', hisha:'飛', ou:'王' };

const VECTORS = {
    fu: [[1,0]],
    kin: [[1,0],[1,1],[1,-1],[0,1],[0,-1],[-1,0]],
    gin: [[1,0],[1,1],[1,-1],[-1,1],[-1,-1]],
    keima: [[2,1],[2,-1]],
    kyosha: Array.from({length:8},(_,i)=>[i+1,0]),
    kaku: [...Array.from({length:8},(_,i)=>[i+1,i+1]),...Array.from({length:8},(_,i)=>[i+1,-(i+1)]),...Array.from({length:8},(_,i)=>[-(i+1),i+1]),...Array.from({length:8},(_,i)=>[-(i+1),-(i+1)])],
    hisha: [...Array.from({length:8},(_,i)=>[i+1,0]),...Array.from({length:8},(_,i)=>[-(i+1),0]),...Array.from({length:8},(_,i)=>[0,i+1]),...Array.from({length:8},(_,i)=>[0,-(i+1)])],
    ou: [[1,0],[1,1],[1,-1],[-1,0],[-1,1],[-1,-1],[0,1],[0,-1]]
};

const state = { 
    board: null, 
    selected: null, 
    selectedDrop: null, 
    loading: false, 
    pollingId: null, 
    interacting: false, 
    targets: [], 
    pendingMove: null, 
    lastFullRender: 0,
    timeState: null,
    lastTimeSync: null
};

const setStatus = msg => document.getElementById('status').textContent = msg;

async function loadGameState(opts={}) {
    if (state.loading) return;
    state.loading = true;
    try {
        const res = await fetch(`/game/${gameId}/state`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        // 時間情報を更新
        if (data.timeState) {
            state.timeState = data.timeState;
            state.lastTimeSync = Date.now();
            updateTimerDisplay();
        }
        
        if (opts.diff && state.board) {
            applyDiff(data.board);
        } else {
            state.board = data.board;
            if (!opts.preserve) clearSelection();
            render();
        }
        
        if (data.isFinished) {
            const winnerName = data.winner === 'sente' ? '先手' : '後手';
            setStatus(`終局: ${winnerName}の勝ち！`);
            stopPolling();
        } else {
            const turnName = data.currentTurn === 'sente' ? '先手' : '後手';
            if (isSpectator) {
                setStatus(`${turnName}の手番 (観戦中)`);
            } else {
                const isMyTurn = data.currentTurn === myPlayer;
                setStatus(`${turnName}の手番` + (isMyTurn ? ' (あなた)' : ''));
            }
        }
    } catch(e) { 
        console.error(e);
        setStatus('Error loading game: ' + e.message);
    }
    state.loading = false;
}

function applyDiff(newBoard) {
    const flip = myPlayer==='gote';
    for (let y=0;y<9;y++) {
        for (let x=0;x<9;x++) {
            const oldCell = state.board.cells[y][x];
            const newCell = newBoard.cells[y][x];
            if (cellsEqual(oldCell, newCell)) continue;
            state.board.cells[y][x] = newCell;
            updateCell(x, y, newCell, flip);
        }
    }
    state.board.capturedPieces = newBoard.capturedPieces;
    renderCaptured();
}

function cellsEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.kind===b.kind && a.owner===b.owner && a.promoted===b.promoted;
}

function updateCell(x, y, cell, flip) {
    const r = flip ? 8-y : y;
    const c = flip ? 8-x : x;
    const table = document.getElementById('board');
    const td = table.rows[r]?.cells[c];
    if (!td) return;
    td.innerHTML = '';
    td.className = '';
    if (cell) {
        const span = document.createElement('span');
        span.className = 'piece';
        if (cell.promoted) span.classList.add('promoted');
        if (cell.owner !== myPlayer) span.classList.add('opponent');
        span.textContent = (cell.promoted?'成':'') + KANJI[cell.kind];
        td.appendChild(span);
    }
    if (state.selected?.x===x && state.selected?.y===y) td.classList.add('selected');
    if (state.targets.some(t=>t.x===x&&t.y===y)) td.classList.add('legal-target');
}

function startPolling() {
    loadGameState();
    state.pollingId = setInterval(() => {
        if (!state.loading && !state.interacting) {
            const now = Date.now();
            const fullRender = (now - state.lastFullRender) > 5000;
            loadGameState({preserve:true, diff:!fullRender});
            if (fullRender) state.lastFullRender = now;
        }
    }, 200);
    
    // タイマーのローカル更新（50msごと）
    setInterval(updateTimerDisplay, 50);
}

function stopPolling() {
    if (state.pollingId) {
        clearInterval(state.pollingId);
        state.pollingId = null;
    }
}

function clearSelection() {
    state.selected = null;
    state.selectedDrop = null;
    state.interacting = false;
    state.targets = [];
}

function getVectors(kind, promoted, owner) {
    let v = VECTORS[kind] || [];
    if (promoted) {
        if (['fu','kyosha','keima','gin'].includes(kind)) v = VECTORS.kin;
        else if (kind==='kaku') v = [...VECTORS.kaku,[1,0],[-1,0],[0,1],[0,-1]];
        else if (kind==='hisha') v = [...VECTORS.hisha,[1,1],[1,-1],[-1,1],[-1,-1]];
    }
    return owner==='gote' ? v : v.map(([dy,dx])=>[-dy,dx]);
}

function computeTargets(y, x, piece) {
    const targets = [];
    for (const [dy,dx] of getVectors(piece.kind, piece.promoted, piece.owner)) {
        const ny=y+dy, nx=x+dx;
        if (ny<0||ny>8||nx<0||nx>8) continue;
        const t = state.board.cells[ny][nx];
        if (t && t.owner===piece.owner) continue;
        if (['kyosha','kaku','hisha'].includes(piece.kind) && (Math.abs(dy)>1||Math.abs(dx)>1)) {
            let cy=y+Math.sign(dy), cx=x+Math.sign(dx), blocked=false;
            while(cy!==ny||cx!==nx) { 
                if(state.board.cells[cy][cx]){
                    blocked=true;
                    break;
                } 
                cy+=Math.sign(dy);
                cx+=Math.sign(dx); 
            }
            if (blocked) continue;
        }
        targets.push({y:ny,x:nx});
    }
    return targets;
}

function computeDropTargets(kind, owner) {
    const targets = [];
    for(let y=0;y<9;y++) {
        if (kind==='fu' || kind==='kyosha') {
            if ((owner==='sente' && y===0) || (owner==='gote' && y===8)) continue;
        }
        if (kind==='keima') {
            if ((owner==='sente' && y<=1) || (owner==='gote' && y>=7)) continue;
        }
        for(let x=0;x<9;x++) {
            if(!state.board.cells[y][x]) targets.push({y,x});
        }
    }
    return targets;
}

function render() {
    if (!state.board) return;
    const flip = myPlayer==='gote';
    const table = document.getElementById('board');
    table.innerHTML = '';

    for (let r=0;r<9;r++) {
        const y = flip ? 8-r : r;
        const tr = document.createElement('tr');
        for (let c=0;c<9;c++) {
            const x = flip ? 8-c : c;
            const cell = state.board.cells[y][x];
            const td = document.createElement('td');
            td.dataset.x = x;
            td.dataset.y = y;
            if (cell) {
                const span = document.createElement('span');
                span.className = 'piece';
                if (cell.promoted) span.classList.add('promoted');
                if (cell.owner !== myPlayer) span.classList.add('opponent');
                span.textContent = (cell.promoted?'成':'') + KANJI[cell.kind];
                td.appendChild(span);
            }
            if (state.selected?.x===x && state.selected?.y===y) td.classList.add('selected');
            if (state.targets.some(t=>t.x===x&&t.y===y)) td.classList.add('legal-target');
            td.onclick = () => onCell(x,y);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    renderCaptured();
}

function renderCaptured() {
    const leftOwner = myPlayer==='sente' ? 'gote' : 'sente';
    const rightOwner = myPlayer;
    document.getElementById('left-label').textContent = leftOwner==='gote' ? '後手 持ち駒' : '先手 持ち駒';
    document.getElementById('right-label').textContent = rightOwner==='gote' ? '後手 持ち駒' : '先手 持ち駒';
    [['left', leftOwner], ['right', rightOwner]].forEach(([side, owner]) => {
        const div = document.getElementById(side+'-pieces');
        div.innerHTML = '';
        const grouped = {};
        (state.board.capturedPieces||[]).filter(p=>p.owner===owner).forEach(p => grouped[p.kind]=(grouped[p.kind]||0)+1);
        for (const [kind,count] of Object.entries(grouped)) {
            const el = document.createElement('div');
            el.className = 'captured-piece';
            if (state.selectedDrop?.owner===owner && state.selectedDrop?.kind===kind) el.classList.add('selected');
            el.textContent = KANJI[kind] + (count>1?count:'');
            el.onclick = () => onCaptured(owner,kind);
            div.appendChild(el);
        }
    });
}

function onCaptured(owner, kind) {
    if (isSpectator) return;
    if (owner !== myPlayer) { setStatus('Not your piece'); return; }
    if (state.selectedDrop?.kind===kind) { clearSelection(); render(); return; }
    clearSelection();
    state.selectedDrop = {owner,kind};
    state.interacting = true;
    state.targets = computeDropTargets(kind, owner);
    render();
    setStatus('Select drop location');
}

function onCell(x, y) {
    if (isSpectator) return;
    const cell = state.board.cells[y][x];

    if (state.selectedDrop) {
        if (cell) { setStatus('Cell occupied'); return; }
        sendDrop(state.selectedDrop.kind, x, y);
        return;
    }

    if (!state.selected) {
        if (!cell) return;
        if (cell.owner !== myPlayer) { setStatus('Not your piece'); return; }
        state.selected = {x,y};
        state.interacting = true;
        state.targets = computeTargets(y,x,cell);
        render();
        setStatus('Select destination');
        return;
    }

    if (state.selected.x===x && state.selected.y===y) { clearSelection(); render(); return; }
    if (!state.targets.some(t=>t.x===x&&t.y===y)) { setStatus('Invalid'); return; }
    tryMove(state.selected, {x,y});
}

function canPromote(kind, promoted, owner, fromY, toY) {
    if (promoted) return false;
    if (['kin','ou'].includes(kind)) return false;
    const zone = owner==='sente' ? [0,1,2] : [6,7,8];
    return zone.includes(fromY) || zone.includes(toY);
}

function mustPromote(kind, promoted, owner, toY) {
    if (promoted) return false;
    if (kind==='fu' || kind==='kyosha') {
        return (owner==='sente' && toY===0) || (owner==='gote' && toY===8);
    }
    if (kind==='keima') {
        return (owner==='sente' && toY<=1) || (owner==='gote' && toY>=7);
    }
    return false;
}

function tryMove(from, to) {
    const piece = state.board.cells[from.y][from.x];
    const can = canPromote(piece.kind, piece.promoted, piece.owner, from.y, to.y);
    const must = mustPromote(piece.kind, piece.promoted, piece.owner, to.y);
    
    if (must) {
        sendMove(from, to, true);
    } else if (can) {
        showPromoteModal(from, to);
    } else {
        sendMove(from, to, false);
    }
}

function showPromoteModal(from, to) {
    state.pendingMove = {from, to};
    document.getElementById('promote-modal').classList.add('show');
}

function hidePromoteModal() {
    document.getElementById('promote-modal').classList.remove('show');
    state.pendingMove = null;
}

async function sendMove(from, to, promoting) {
    state.interacting = true;
    try {
        const res = await fetch(`/game/${gameId}/move`, {
            method:'POST', 
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({fromX:from.x,fromY:from.y,toX:to.x,toY:to.y,promoting})
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        clearSelection();
        loadGameState();
    } catch(e) { 
        setStatus('Error: ' + e.message);
        state.interacting = false;
    }
}

async function sendDrop(kind, x, y) {
    state.interacting = true;
    try {
        const res = await fetch(`/game/${gameId}/move`, {
            method:'POST', 
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({fromX:null,fromY:null,toX:x,toY:y,pieceKind:kind,promoting:false})
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        clearSelection();
        loadGameState();
    } catch(e) { 
        setStatus('Error: ' + e.message);
        state.interacting = false;
    }
}

function initGameControls() {
    document.getElementById('cancelBtn').onclick = () => { 
        clearSelection(); 
        render(); 
    };
    
    document.getElementById('promoteYes').onclick = () => {
        if (state.pendingMove) {
            const {from, to} = state.pendingMove;
            hidePromoteModal();
            sendMove(from, to, true);
        }
    };
    
    document.getElementById('promoteNo').onclick = () => {
        if (state.pendingMove) {
            const {from, to} = state.pendingMove;
            hidePromoteModal();
            sendMove(from, to, false);
        }
    };
    
    startPolling();
}

// 時間フォーマット関数
function formatTime(ms) {
    if (ms === null || ms === undefined) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// タイマー表示更新関数
function updateTimerDisplay() {
    if (!state.timeState || !state.lastTimeSync) return;
    
    const elapsed = Date.now() - state.lastTimeSync;
    const senteTimer = document.getElementById('sente-timer');
    const goteTimer = document.getElementById('gote-timer');
    const senteContainer = document.getElementById('sente-timer-container');
    const goteContainer = document.getElementById('gote-timer-container');
    
    if (!senteTimer || !goteTimer || !senteContainer || !goteContainer) return;
    
    // 現在のターン情報を取得
    const currentTurn = state.board ? state.board.currentTurn : 'sente';
    
    // 先手のタイマー更新
    let senteTime = state.timeState.senteTimeLeft;
    if (currentTurn === 'sente' && !state.board?.isFinished) {
        senteTime = Math.max(0, senteTime - elapsed);
    }
    senteTimer.textContent = formatTime(senteTime);
    
    // 後手のタイマー更新
    let goteTime = state.timeState.goteTimeLeft;
    if (currentTurn === 'gote' && !state.board?.isFinished) {
        goteTime = Math.max(0, goteTime - elapsed);
    }
    goteTimer.textContent = formatTime(goteTime);
    
    // CSSクラスの適用
    senteContainer.classList.toggle('active', currentTurn === 'sente' && !state.board?.isFinished);
    goteContainer.classList.toggle('active', currentTurn === 'gote' && !state.board?.isFinished);
    
    senteContainer.classList.toggle('byoyomi', state.timeState.senteInByoyomi);
    goteContainer.classList.toggle('byoyomi', state.timeState.goteInByoyomi);
    
    senteContainer.classList.toggle('warning', senteTime < 30000);
    goteContainer.classList.toggle('warning', goteTime < 30000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameControls);
} else {
    initGameControls();
}
