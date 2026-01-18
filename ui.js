/* --- UI & AUDIO (V11 - NEW SOUNDS) --- */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const gridElement = document.getElementById('game-grid');
let selectedTile = null;
let isProcessing = false;
let timerInterval = null;

const SoundFX = {
    click: () => playTone(800, 'sine', 0.05),
    match: () => playTone(440, 'triangle', 0.1),
    // NOUVEAU SON : Shuffle (Bruit de souffle/cartes)
    shuffle: () => {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 secondes
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // Bruit blanc
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        noise.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
    },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.1), i*100)); },
    lose: () => playTone(150, 'sawtooth', 0.3)
};

function playTone(freq, type, dur) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
}

document.getElementById('btn-reset').onclick = startGame;
document.getElementById('btn-rules').onclick = () => showMessage("RÈGLES", "Amenez un chien en bas.<br>Associez les chiffres (Somme = 9).");
document.getElementById('btn-hint').onclick = showHint;

// BOUTON SHUFFLE AVEC SON
document.getElementById('btn-shuffle').onclick = () => {
    // On joue le son AVANT la logique pour un feedback immédiat
    SoundFX.shuffle();
    
    if(shuffleBoardLogic()) {
        renderGrid();
        document.getElementById('shuffle-count').innerText = gameState.shuffleLeft;
        document.getElementById('btn-shuffle').style.opacity = 0.5;
    }
};

function startGame() {
    initGameEngine();
    renderBettingBoard();
    updateHUD();
    renderGrid();
    startTimer();
    hideMessage();
    document.getElementById('btn-shuffle').style.opacity = 1;
    document.getElementById('shuffle-count').innerText = 1;
    isProcessing = false; selectedTile = null;
}

function renderBettingBoard() {
    const board = document.getElementById('betting-board');
    board.innerHTML = '';
    gameState.dogs.forEach(dog => {
        let div = document.createElement('div');
        div.className = 'bet-card';
        div.id = `bet-dog-${dog.id}`;
        div.innerHTML = `
            <div class="dog-name"><div class="dog-badge">${dog.id}</div> ${dog.name}</div>
            <div class="bet-amount">$${dog.bet}</div>
        `;
        board.appendChild(div);
    });
}

function updateHUD() {
    document.getElementById('score-display').innerText = gameState.score;
    // Ajout visuel d'alerte quand la réserve est basse (<10)
    const reserveEl = document.getElementById('reserve-count');
    reserveEl.innerText = gameState.reserve;
    if(gameState.reserve < 10) reserveEl.style.color = '#e74c3c';
    else reserveEl.style.color = '#fff';
}

function renderGrid() {
    gridElement.innerHTML = '';
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            let cell = gameState.grid[r][c];
            let tile = document.createElement('div');
            
            tile.className = 'tile';
            tile.dataset.r = r; tile.dataset.c = c;
            
            if(cell.val === 9) {
                tile.classList.add('nine');
                let badge = document.createElement('div');
                badge.className = 'dog-id-badge';
                badge.innerText = cell.dogId;
                // Style badge inline pour être sûr
                Object.assign(badge.style, {
                    position: 'absolute', top: '2px', right: '2px',
                    background: '#000', color: '#fff', border: '1px solid #fff',
                    borderRadius: '50%', width: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 'bold'
                });
                tile.appendChild(badge);
            } else if(cell.val > 0) {
                tile.innerText = cell.val;
                tile.classList.add(`val-${cell.val}`);
            } else {
                // Gestion du VIDE (0)
                tile.classList.add('empty');
                // Optionnel : Ajouter un petit point ou motif pour montrer que c'est un trou
            }

            if(selectedTile && selectedTile.r === r && selectedTile.c === c) {
                tile.classList.add('selected');
            }

            tile.onclick = () => onTileClick(r, c);
            gridElement.appendChild(tile);
        }
    }
}

function onTileClick(r, c) {
    if(isProcessing || gameState.status !== 'playing') return;
    let clickedCell = gameState.grid[r][c];
    if(clickedCell.val === 0) return;

    SoundFX.click();

    if(!selectedTile) {
        selectedTile = {r, c};
        renderGrid();
    } else {
        if(selectedTile.r === r && selectedTile.c === c) {
            selectedTile = null; renderGrid(); return;
        }

        let prevCell = gameState.grid[selectedTile.r][selectedTile.c];
        let isSumNine = (clickedCell.val + prevCell.val === 9) && (clickedCell.val !== 9 && prevCell.val !== 9);
        
        if(isSumNine && checkMoveValidity(selectedTile.r, selectedTile.c, r, c)) {
            doMatch(selectedTile.r, selectedTile.c, r, c);
        } else {
            selectedTile = {r, c}; renderGrid();
        }
    }
}

function doMatch(r1, c1, r2, c2) {
    isProcessing = true; SoundFX.match();
    
    let t1 = document.querySelector(`.tile[data-r="${r1}"][data-c="${c1}"]`);
    let t2 = document.querySelector(`.tile[data-r="${r2}"][data-c="${c2}"]`);
    if(t1) t1.classList.add('anim-match');
    if(t2) t2.classList.add('anim-match');

    selectedTile = null;

    setTimeout(() => {
        processMatch(r1, c1, r2, c2); 
        applyGravityLogic();          
        let winInfo = checkWinCondition();
        updateHUD(); renderGrid();
        
        if(winInfo.won) {
            handleWin(winInfo.dogId);
        } else {
            isProcessing = false;
        }
    }, 250);
}

function handleWin(dogId) {
    clearInterval(timerInterval);
    SoundFX.win();
    let dog = gameState.dogs.find(d => d.id === dogId);
    let points = dog.bet * 10;
    
    document.getElementById(`bet-dog-${dogId}`).classList.add('winner');
    
    showMessage(
        "VICTOIRE !", 
        `<div style="font-size:1.5em; color:#fff; margin-bottom:10px;">${dog.name}</div>
         <div style="color:#2ecc71; font-family:'Courier New'">GAIN: $${dog.bet} x 10</div>
         <h1 style="color:#f1c40f; font-size:3em; margin:10px 0;">${points}</h1>`
    );
}

function showHint() {
    document.getElementById('btn-hint').style.color = 'red';
    setTimeout(() => document.getElementById('btn-hint').style.color = '', 500);
}

function showMessage(title, content) {
    const overlay = document.getElementById('message-overlay');
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <h2 style="color:#fff; letter-spacing:3px;">${title}</h2>
        <div style="color:#ccc; line-height:1.5;">${content}</div>
        <button onclick="startGame()" style="margin-top:20px; background:#2ecc71; color:#000;">NOUVELLE PARTIE</button>
    `;
}

function hideMessage() { document.getElementById('message-overlay').style.display = 'none'; }

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameState.timeLeft--;
        let m = Math.floor(gameState.timeLeft/60);
        let s = gameState.timeLeft%60;
        document.getElementById('timer-container').innerText = `${m}:${s<10?'0'+s:s}`;
        
        if(gameState.timeLeft <= 0) {
            clearInterval(timerInterval); SoundFX.lose();
            showMessage("TEMPS ÉCOULÉ", "Les paris sont fermés.");
        }
    }, 1000);
}

startGame();
