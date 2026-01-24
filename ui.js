/* =========================================
   TOPDOG UI ENGINE V29 - SAFETY LOCK - release ver 1.3
   FIX: ANTI-SKIP VICTOIRE (COOLDOWN 1.5s)
   ========================================= */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const gridElement = document.getElementById('game-grid');
let selectedTile = null;
let isProcessing = false;
let timerInterval = null;

// GESTION DU MUTE
let isMuted = localStorage.getItem('topdog_muted') === 'true';

/* --- FORMATTER D'ARGENT --- */
function formatMoney(num) {
    if (!num) return "0"; 
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'G'; 
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num;
}

/* --- MOTEUR SONORE --- */
const SoundFX = {
    click: () => {
        if(isMuted) return;
        resumeAudio();
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'square'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
        gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t); osc.stop(t + 0.05);
    },
    match: () => {
        if(isMuted) return;
        resumeAudio();
        const t = audioCtx.currentTime;
        playNote(523.25, 'sine', 0.1, t); playNote(659.25, 'triangle', 0.1, t + 0.05); playNote(783.99, 'sine', 0.2, t + 0.1);
    },
    shuffle: () => {
        if(isMuted) return;
        resumeAudio();
        const bufferSize = audioCtx.sampleRate * 0.4; 
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, audioCtx.currentTime); filter.frequency.linearRampToValueAtTime(3000, audioCtx.currentTime + 0.2); filter.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.4);
        const gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start();
    },
    win: () => {
        if(isMuted) return;
        resumeAudio();
        const now = audioCtx.currentTime;
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => { playNote(f, 'square', 0.1, now + i * 0.15); });
        let coinCount = 0;
        const coinLoop = setInterval(() => { playCoinSound(); coinCount++; if(coinCount > 10) clearInterval(coinLoop); }, 100);
    },
    lose: () => {
        if(isMuted) return;
        resumeAudio();
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, t); osc.frequency.linearRampToValueAtTime(50, t + 1);
        gain.gain.setValueAtTime(0.2, t); gain.gain.linearRampToValueAtTime(0, t + 1);
        osc.start(t); osc.stop(t + 1);
    }
};

function playNote(freq, type, dur, time) {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, time); gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
    osc.start(time); osc.stop(time + dur);
}
function playCoinSound() {
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(2000 + Math.random()*500, t);
    gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.start(t); osc.stop(t + 0.1);
}
function resumeAudio() { if(audioCtx.state === 'suspended') audioCtx.resume(); }

/* --- GESTION DU MUTE --- */
function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('topdog_muted', isMuted);
    updateMuteIcon();
}

function updateMuteIcon() {
    const btn = document.getElementById('btn-sound');
    if(isMuted) {
        btn.innerHTML = '🔇'; btn.style.opacity = '0.5';
    } else {
        btn.innerHTML = '🔊'; btn.style.opacity = '1';
    }
}

/* --- LOGIQUE UI --- */
document.getElementById('btn-reset').onclick = startGame;
document.getElementById('btn-rules').onclick = () => showMessage("RÈGLES", "Amenez un chien en bas.<br>Associez les chiffres (Somme = 9).<br>Réserve ILLIMITÉE !");
document.getElementById('btn-hint').onclick = showHint;
document.getElementById('btn-sound').onclick = toggleMute;

document.getElementById('btn-shuffle').onclick = () => {
    SoundFX.shuffle();
    if(shuffleBoardLogic()) {
        renderGrid();
        document.getElementById('shuffle-count').innerText = gameState.shuffleLeft;
        document.getElementById('btn-shuffle').style.opacity = 0.5;
    }
};

/* --- FONCTION DE DÉMARRAGE BLINDÉE --- */
function startGame() {
    console.log("🔄 REDÉMARRAGE DU JEU...");

    // 0. FIX MOBILE
    document.body.style.height = window.innerHeight + 'px';

    // 1. ARGENT
    let disqueArgent = localStorage.getItem('topdog_wallet');
    let vraieArgent = disqueArgent ? parseInt(disqueArgent) : 0;
    
    // 2. MOTEUR
    initGameEngine();
    
    // 3. FORCE VALEUR
    if(typeof gameState !== 'undefined') {
        gameState.bankroll = vraieArgent;
    }

    // 4. UI
    updateHUD(); 
    renderBettingBoard();
    renderGrid();
    startTimer();
    hideMessage();
    updateMuteIcon();
    
    let btnShuffle = document.getElementById('btn-shuffle');
    if(btnShuffle) {
        btnShuffle.style.opacity = 1;
        document.getElementById('shuffle-count').innerText = 1;
    }
    
    isProcessing = false; 
    selectedTile = null;
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
            <div class="bet-amount">$${formatMoney(dog.bet)}</div>
        `;
        board.appendChild(div);
    });
}

function updateHUD() {
    const scoreEl = document.getElementById('score-display');
    if(scoreEl) {
        scoreEl.innerText = formatMoney(gameState.bankroll);
        scoreEl.style.transition = "color 0.3s";
        scoreEl.style.color = "#fff";
    }
    
    const reserveEl = document.getElementById('reserve-count');
    reserveEl.innerHTML = "&infin;"; 
    reserveEl.style.color = '#00f3ff';
    reserveEl.style.fontSize = "1.5em";
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
                tile.classList.add('empty');
            }
            if(selectedTile && selectedTile.r === r && selectedTile.c === c) {
                tile.classList.add('selected');
            }
            
            tile.onpointerdown = (e) => {
                e.preventDefault(); 
                onTileClick(r, c);
            };
            
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
    }, 50); 
}

function fireConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150, spread: 70, origin: { y: 0.6 },
            colors: ['#00f3ff', '#f1c40f', '#e74c3c', '#2ecc71']
        });
    }
}

function handleWin(dogId) {
    clearInterval(timerInterval);
    SoundFX.win();
    fireConfetti();

    let dog = gameState.dogs.find(d => d.id === dogId);
    let bonusAmount = dog.bet * 9; 
    let totalWin = dog.bet * 10;

    gameState.bankroll += bonusAmount;
    
    if(typeof saveWallet === 'function') {
        saveWallet(gameState.bankroll);
    } else {
        localStorage.setItem('topdog_wallet', gameState.bankroll);
    }
    
    updateHUD(); 
    document.getElementById(`bet-dog-${dogId}`).classList.add('winner');
    
    showMessage(
        "VICTOIRE !", 
        `<div style="font-size:1.5em; color:#fff; margin-bottom:5px;">${dog.name}</div>
         <div style="color:#2ecc71; font-family:'Courier New'; margin-bottom:10px;">GAIN: +$${formatMoney(totalWin)}</div>
         <div style="color:#ccc; font-size:0.8em; margin-top:10px;">BANQUE TOTALE</div>
         <h1 style="color:#f1c40f; font-size:2.5em; margin:5px 0;">$${formatMoney(gameState.bankroll)}</h1>`
    );
}

/* --- SYSTÈME D'INDICE --- */
function showHint() {
    let dogCols = [];
    let dogsPositions = [];
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(gameState.grid[r][c].val === 9) {
                dogCols.push(c);
                dogsPositions.push({r:r, c:c});
            }
        }
    }

    let possibleMoves = [];
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            let cell = gameState.grid[r][c];
            if(cell.val === 0 || cell.val === 9) continue;
            if(c < 7) {
                let neighbor = gameState.grid[r][c+1];
                if(neighbor.val !== 0 && neighbor.val !== 9) {
                    if(cell.val + neighbor.val === 9) {
                        possibleMoves.push({ r1:r, c1:c, r2:r, c2:c+1, score: 0 });
                    }
                }
            }
            if(r < 7) {
                let neighbor = gameState.grid[r+1][c];
                if(neighbor.val !== 0 && neighbor.val !== 9) {
                    if(cell.val + neighbor.val === 9) {
                        possibleMoves.push({ r1:r, c1:c, r2:r+1, c2:c, score: 0 });
                    }
                }
            }
        }
    }

    if(possibleMoves.length === 0) {
        let btn = document.getElementById('btn-hint');
        btn.style.background = 'red';
        setTimeout(() => btn.style.background = '', 500);
        return;
    }

    possibleMoves.forEach(move => {
        if(dogCols.includes(move.c1) || dogCols.includes(move.c2)) {
            move.score += 50;
        }
        dogsPositions.forEach(dog => {
            if(dog.c === move.c1 && dog.r === move.r1 - 1) move.score += 1000;
            if(dog.c === move.c2 && dog.r === move.r2 - 1) move.score += 1000;
        });
        move.score += move.r1; 
    });

    possibleMoves.sort((a, b) => b.score - a.score);
    let bestMove = possibleMoves[0];

    let t1 = document.querySelector(`.tile[data-r="${bestMove.r1}"][data-c="${bestMove.c1}"]`);
    let t2 = document.querySelector(`.tile[data-r="${bestMove.r2}"][data-c="${bestMove.c2}"]`);

    if(t1 && t2) {
        SoundFX.click(); 
        t1.classList.add('hint-flash');
        t2.classList.add('hint-flash');
        setTimeout(() => {
            t1.classList.remove('hint-flash');
            t2.classList.remove('hint-flash');
        }, 1000);
    }
}

/* --- LE MESSAGE BOX AVEC VERROU DE SÉCURITÉ --- */
function showMessage(title, content) {
    const overlay = document.getElementById('message-overlay');
    overlay.style.display = 'flex';
    
    // 1. Bouton "Éteint" par défaut (Gris + Non cliquable)
    let buttonsHtml = `
        <button id="btn-replay-action" onclick="startGame()" style="
            margin-top:20px; 
            background:#555; /* GRIS */
            color:#888; 
            font-size:1.2em; 
            padding:15px 30px; 
            border:none; 
            border-radius:50px; 
            font-weight:bold; 
            cursor:not-allowed; 
            box-shadow: none; 
            pointer-events: none; /* BLOQUE LES CLICS */
            transition: all 0.3s;">
            REJOUER
        </button>`;
    
    overlay.innerHTML = `
        <h2 style="color:#fff; letter-spacing:3px; margin-bottom:20px;">${title}</h2>
        <div style="color:#ccc; line-height:1.5; font-size:1.2em;">${content}</div>
        ${buttonsHtml}
    `;

    // 2. Le Timer de 1.5 Secondes
    setTimeout(() => {
        let btn = document.getElementById('btn-replay-action');
        if(btn) {
            // ACTIVATION ! (Devient Vert et Cliquable)
            btn.style.background = '#2ecc71';
            btn.style.color = '#000';
            btn.style.cursor = 'pointer';
            btn.style.pointerEvents = 'auto'; // DÉBLOQUE LES CLICS
            btn.style.boxShadow = '0 0 15px rgba(46, 204, 113, 0.4)';
            
            // Petite animation "Pop" pour dire qu'il est prêt
            btn.style.transform = 'scale(1.05)';
            setTimeout(() => btn.style.transform = 'scale(1)', 150);
        }
    }, 1500); // 1.5 Secondes de pause
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

// Initialise si le DOM est prêt
if(document.readyState === 'complete') {
    // startGame() est appelé par topdog.html via launchApp()
}
