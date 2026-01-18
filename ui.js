/* --- UI & AUDIO --- */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const gridElement = document.getElementById('game-grid');
let selectedTile = null;
let isProcessing = false;
let timerInterval = null;

// --- SONS ---
const SoundFX = {
    click: () => playTone(800, 'sine', 0.05),
    match: () => playTone(440, 'triangle', 0.1),
    win: () => {
        [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.1), i*100));
    },
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

// --- BOUTONS ---
document.getElementById('btn-reset').onclick = startGame;
document.getElementById('btn-rules').onclick = () => showMessage("RÈGLES", "Amenez un chien en bas.<br>Associez les chiffres (Somme = 9).<br>Gagnez la mise du chien x10.");
document.getElementById('btn-hint').onclick = showHint;
document.getElementById('btn-shuffle').onclick = () => {
    if(shuffleBoardLogic()) {
        renderGrid();
        document.getElementById('shuffle-count').innerText = gameState.shuffleLeft;
        document.getElementById('btn-shuffle').disabled = true;
        document.getElementById('btn-shuffle').style.opacity = 0.5;
    }
};

// --- INITIALISATION ---
function startGame() {
    initGameEngine();
    renderBettingBoard();
    updateHUD();
    renderGrid();
    startTimer();
    hideMessage();
    document.getElementById('btn-shuffle').disabled = false;
    document.getElementById('btn-shuffle').style.opacity = 1;
    document.getElementById('shuffle-count').innerText = 1;
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
            <div class="bet-amount">$${dog.bet}</div>
        `;
        board.appendChild(div);
    });
}

function updateHUD() {
    document.getElementById('score-display').innerText = gameState.score;
    document.getElementById('reserve-count').innerText = gameState.reserve;
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
                tile.appendChild(badge);
            } else if(cell.val > 0) {
                tile.innerText = cell.val;
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
        renderGrid(); // Refresh selection visual
    } else {
        // Même tuile ? Désélectionner
        if(selectedTile.r === r && selectedTile.c === c) {
            selectedTile = null;
            renderGrid();
            return;
        }

        // Tenter match
        let prevCell = gameState.grid[selectedTile.r][selectedTile.c];
        
        // Règle de base : Somme = 9 (et pas deux chiens)
        let isSumNine = (clickedCell.val + prevCell.val === 9) && (clickedCell.val !== 9 && prevCell.val !== 9);
        
        if(isSumNine && checkMoveValidity(selectedTile.r, selectedTile.c, r, c)) {
            // MATCH !
            doMatch(selectedTile.r, selectedTile.c, r, c);
        } else {
            // Changer sélection
            selectedTile = {r, c};
            renderGrid();
        }
    }
}

function doMatch(r1, c1, r2, c2) {
    isProcessing = true;
    SoundFX.match();
    
    // Animation (Ajoute classe CSS)
    let t1 = document.querySelector(`.tile[data-r="${r1}"][data-c="${c1}"]`);
    let t2 = document.querySelector(`.tile[data-r="${r2}"][data-c="${c2}"]`);
    if(t1) t1.classList.add('anim-match');
    if(t2) t2.classList.add('anim-match');

    selectedTile = null;

    setTimeout(() => {
        processMatch(r1, c1, r2, c2); // Vide les cases logique
        applyGravityLogic();          // Fait tomber
        let winInfo = checkWinCondition();
        
        updateHUD();
        renderGrid();
        
        if(winInfo.won) {
            handleWin(winInfo.dogId);
        } else {
            isProcessing = false;
        }
    }, 300);
}

function handleWin(dogId) {
    clearInterval(timerInterval);
    SoundFX.win();
    let dog = gameState.dogs.find(d => d.id === dogId);
    let points = dog.bet * 10;
    
    // Highlight winner in bet board
    document.getElementById(`bet-dog-${dogId}`).classList.add('winner');
    
    showMessage(
        "VICTOIRE !", 
        `<span style="color:#27ae60">${dog.name} a gagné !</span><br>
         Gain: $${dog.bet} x 10<br>
         <h1 style="color:#fff">${points} PTS</h1>`
    );
}

function showHint() {
    // Cherche un move simple
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        if(gameState.grid[r][c].val > 0 && gameState.grid[r][c].val < 9) {
            // Scan voisins
            // (Logique simplifiée pour l'indice)
        }
    }
    // Pour l'instant, simple feedback visuel
    document.getElementById('btn-hint').style.color = 'red';
    setTimeout(() => document.getElementById('btn-hint').style.color = '', 500);
}

function showMessage(title, content) {
    document.getElementById('message-overlay').style.display = 'flex';
    document.getElementById('msg-title').innerHTML = title;
    document.getElementById('msg-content').innerHTML = content;
    document.getElementById('overlay-buttons').innerHTML = `<button onclick="startGame()">NOUVELLE COURSE</button>`;
}

function hideMessage() {
    document.getElementById('message-overlay').style.display = 'none';
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameState.timeLeft--;
        let m = Math.floor(gameState.timeLeft/60);
        let s = gameState.timeLeft%60;
        document.getElementById('timer-container').innerText = `${m}:${s<10?'0'+s:s}`;
        
        if(gameState.timeLeft <= 0) {
            clearInterval(timerInterval);
            SoundFX.lose();
            showMessage("TEMPS ÉCOULÉ", "Les paris sont fermés.");
        }
    }, 1000);
}

// Lancer au chargement
startGame();
