/* =========================================
   TOPDOG UI ENGINE V25
   FEATURES: CASH OUT BUTTON (PSYCHOLOGY UPDATE)
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
    },
    cashout: () => {
        if(isMuted) return;
        resumeAudio();
        // Son de caisse enregistreuse "Cha-Ching"
        const t = audioCtx.currentTime;
        playNote(1200, 'square', 0.1, t);
        playNote(1600, 'square', 0.3, t + 0.1);
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

function startGame() {
    initGameEngine();
    renderBettingBoard();
    updateHUD();
    renderGrid();
    startTimer();
    hideMessage();
    updateMuteIcon();
    document.getElementById('btn-shuffle').style.opacity = 1;
    document.getElementById('shuffle-count').innerText = 1;
    isProcessing = false; selectedTile = null;
}

/* --- LE CASH OUT (NOUVEAU V25) --- */
function cashOut() {
    let oldAmount = gameState.bankroll;
    if (oldAmount <= 0) return;

    SoundFX.cashout();
    
    // Reset Banque
    gameState.bankroll = 0;
    saveBankroll(0); // Sauvegarde à 0
    updateHUD();

    // Feedback visuel immédiat
    showMessage(
        "ENCAISSÉ !",
        `<div style="color:#f1c40f; font-size:1.2em; margin-bottom:10px;">Vous avez sécurisé</div>
         <h1 style="color:#fff; font-size:3em; margin:0;">$${formatMoney(oldAmount)}</h1>
         <div style="color:#ccc; font-size:0.9em; margin-top:15px;">La banque est remise à zéro.<br>Prêt pour un nouveau départ ?</div>`
    );
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
    document.getElementById('score-display').innerText = formatMoney(gameState.bankroll);
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
    let winAmount = dog.bet * 10;
    gameState.bankroll += winAmount;
    saveBankroll(gameState.bankroll);
    
    document.getElementById(`bet-dog-${dogId}`).classList.add('winner');
    
    showMessage(
        "VICTOIRE !", 
        `<div style="font-size:1.5em; color:#fff; margin-bottom:5px;">${dog.name}</div>
         <div style="color:#2ecc71; font-family:'Courier New'; margin-bottom:10px;">GAIN: +$${formatMoney(winAmount)}</div>
         <div style="color:#ccc; font-size:0.8em; margin-top:10px;">BANQUE TOTALE</div>
         <h1 style="color:#f1c40f; font-size:2.5em; margin:5px 0;">$${formatMoney(gameState.bankroll)}</h1>`
    );
}

function showHint() {
    document.getElementById('btn-hint').style.color = 'red';
    setTimeout(() => document.getElementById('btn-hint').style.color = '', 500);
}

/* --- LE MESSAGE BOX DYNAMIQUE (Modifié V25) --- */
function showMessage(title, content) {
    const overlay = document.getElementById('message-overlay');
    overlay.style.display = 'flex';
    
    // Bouton de base
    let buttonsHtml = `<button onclick="startGame()" style="margin-top:20px; background:#2ecc71; color:#000; font-size:1.2em; padding:15px 30px; border:none; border-radius:50px; font-weight:bold; cursor:pointer;">CONTINUER</button>`;
    
    // Bouton CASH OUT (Seulement si argent > 0 et qu'on n'est pas déjà dans le message "Encaissé")
    // On vérifie le titre pour ne pas mettre le bouton "Encaisser" dans le message de confirmation "Encaissé !"
    if (gameState.bankroll > 0 && title !== "ENCAISSÉ !") {
        buttonsHtml += `
            <div style="margin-top:15px;">
                <button onclick="cashOut()" style="background:transparent; border:2px solid #e74c3c; color:#e74c3c; font-size:0.9em; padding:10px 20px; border-radius:50px; font-weight:bold; cursor:pointer; opacity:0.8;">
                    ENCAISSER $${formatMoney(gameState.bankroll)}
                </button>
            </div>
        `;
    }

    overlay.innerHTML = `
        <h2 style="color:#fff; letter-spacing:3px;">${title}</h2>
        <div style="color:#ccc; line-height:1.5;">${content}</div>
        ${buttonsHtml}
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
