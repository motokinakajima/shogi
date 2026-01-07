import { Game } from '/domain/Game.js';

const KANJI = { fu:'歩', kyosha:'香', keima:'桂', gin:'銀', kin:'金', kaku:'角', hisha:'飛', ou:'王' };

let moves = [];
let currentMove = 0;
let isPlaying = false;
let playInterval = null;

async function loadMoves() {
    const res = await fetch(`/api/games/${gameId}/moves`);
    const movesJSON = await res.json();
    
    moves = movesJSON.map(m => ({
        player: m.player,
        fromX: m.from_x,
        fromY: m.from_y,
        toX: m.to_x,
        toY: m.to_y,
        pieceKind: m.piece_kind,
        promoting: m.promoting
    }));
    
    document.getElementById('move-slider').max = moves.length;
    renderBoard();
}

function renderBoard() {
    const board = Game.replayToMove(moves, currentMove);
    
    const boardTable = document.getElementById('board');
    boardTable.innerHTML = '';
    
    for (let y = 0; y < 9; y++) {
        const row = document.createElement('tr');
        for (let x = 0; x < 9; x++) {
            const cell = document.createElement('td');
            const piece = board.getPieceAtPosition(x, y);
            
            if (piece) {
                const div = document.createElement('div');
                div.className = 'piece';
                div.classList.add(piece.owner === 'sente' ? 'sente' : 'gote');
                
                let kanji = KANJI[piece.kind] || piece.kind;
                if (piece.promoted) {
                    kanji = '成' + kanji.charAt(kanji.length - 1);
                }
                div.textContent = kanji;
                cell.appendChild(div);
            }
            
            row.appendChild(cell);
        }
        boardTable.appendChild(row);
    }
    
    renderCapturedPieces(board);
    updateMoveInfo();
    updateButtons();
}

function renderCapturedPieces(board) {
    const leftPieces = document.getElementById('left-pieces');
    const rightPieces = document.getElementById('right-pieces');
    
    leftPieces.innerHTML = '';
    rightPieces.innerHTML = '';
    
    const capturedByPlayer = { sente: {}, gote: {} };
    
    for (const piece of board.getCapturedPieces) {
        const owner = piece.owner;
        const kind = piece.kind;
        capturedByPlayer[owner][kind] = (capturedByPlayer[owner][kind] || 0) + 1;
    }
    
    for (const [kind, count] of Object.entries(capturedByPlayer.sente)) {
        const div = document.createElement('div');
        div.className = 'captured-piece';
        div.textContent = `${KANJI[kind] || kind} × ${count}`;
        rightPieces.appendChild(div);
    }
    
    for (const [kind, count] of Object.entries(capturedByPlayer.gote)) {
        const div = document.createElement('div');
        div.className = 'captured-piece';
        div.textContent = `${KANJI[kind] || kind} × ${count}`;
        leftPieces.appendChild(div);
    }
}

function updateMoveInfo() {
    const info = document.getElementById('move-info');
    if (currentMove === 0) {
        info.textContent = '初期局面';
    } else {
        info.textContent = `${currentMove}手目`;
    }
    document.getElementById('move-slider').value = currentMove;
}

function updateButtons() {
    document.getElementById('firstBtn').disabled = currentMove === 0;
    document.getElementById('prevBtn').disabled = currentMove === 0;
    document.getElementById('nextBtn').disabled = currentMove >= moves.length;
    document.getElementById('lastBtn').disabled = currentMove >= moves.length;
    document.getElementById('playBtn').textContent = isPlaying ? '⏸ 停止' : '▶ 再生';
}

document.getElementById('firstBtn').onclick = () => {
    currentMove = 0;
    renderBoard();
};

document.getElementById('prevBtn').onclick = () => {
    if (currentMove > 0) {
        currentMove--;
        renderBoard();
    }
};

document.getElementById('nextBtn').onclick = () => {
    if (currentMove < moves.length) {
        currentMove++;
        renderBoard();
    }
};

document.getElementById('lastBtn').onclick = () => {
    currentMove = moves.length;
    renderBoard();
};

document.getElementById('playBtn').onclick = () => {
    if (isPlaying) {
        isPlaying = false;
        clearInterval(playInterval);
        updateButtons();
    } else {
        if (currentMove >= moves.length) {
            currentMove = 0;
        }
        isPlaying = true;
        playInterval = setInterval(() => {
            if (currentMove >= moves.length) {
                isPlaying = false;
                clearInterval(playInterval);
                updateButtons();
                return;
            }
            currentMove++;
            renderBoard();
        }, 1000);
        updateButtons();
    }
};

document.getElementById('move-slider').oninput = (e) => {
    currentMove = parseInt(e.target.value);
    renderBoard();
};

loadMoves();
