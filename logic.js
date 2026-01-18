/* --- CONFIGURATION DU JEU --- */
const CONFIG = {
    gridSize: 8,
    initialReserve: 40, 
    timeLimit: 120, 
    dogNames: ["SPARTACUS", "TITAN", "HURRICANE", "VIPER", "GHOST", "BANDIT", "REX", "CHAOS", "ZEUS", "TANK"]
};

/* --- ÉTAT DU JEU --- */
let gameState = {
    grid: [], 
    bankroll: 0, // C'est ton argent CUMULÉ
    reserve: 0, shuffleLeft: 1,
    dogs: [], status: 'idle', timer: null, timeLeft: 0, reserveQueue: []
};

/* --- OUTILS --- */
function createRandomBag() {
    let bag = [];
    for(let i=1; i<=8; i++) for(let j=0; j<5; j++) bag.push(i);
    return bag.sort(() => Math.random() - 0.5);
}

let currentBag = [];
function getBalancedNumber() {
    if(currentBag.length === 0) currentBag = createRandomBag();
    return currentBag.pop();
}

/* --- GESTION SAUVEGARDE (NOUVEAU) --- */
function loadBankroll() {
    let saved = localStorage.getItem('topdog_bankroll');
    // On commence avec 0$ si c'est la première fois, ou le montant sauvegardé
    return saved ? parseInt(saved) : 0;
}

function saveBankroll(amount) {
    localStorage.setItem('topdog_bankroll', amount);
}

/* --- MOTEUR --- */
function initGameEngine() {
    console.log("%c --- TOPDOG V14 (TYCOON) --- ", "background: #ffd700; color: #000; font-size:20px; font-weight:bold;");
    
    currentBag = createRandomBag();
    gameState.dogs = [];
    
    // CHARGEMENT DE L'ARGENT CUMULÉ
    gameState.bankroll = loadBankroll();

    let usedNames = [];
    for(let i=1; i<=4; i++) {
        let name;
        do { name = CONFIG.dogNames[Math.floor(Math.random() * CONFIG.dogNames.length)]; } while(usedNames.includes(name));
        usedNames.push(name);
        let bet = Math.floor(Math.random() * 46) * 100 + 500;
        gameState.dogs.push({ id: i, name: name, bet: bet });
    }

    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    let startCols = Math.random() > 0.5 ? [0, 2, 4, 6] : [1, 3, 5, 7];
    
    gameState.dogs.forEach((dog, i) => {
        let c = startCols[i];
        let r = Math.floor(Math.random() * 2); 
        newGrid[r][c] = { val: 9, dogId: dog.id };
    });

    for(let c=0; c<8; c++) {
        for(let r=0; r<8; r++) {
            if(!newGrid[r][c]) {
                let num;
                let attempts = 0;
                do {
                    num = getBalancedNumber();
                    if(r > 0 && newGrid[r-1][c].val === num && attempts < 10) {
                        currentBag.unshift(num); 
                        currentBag.sort(() => Math.random() - 0.5);
                        num = null; attempts++;
                    }
                } while (num === null && attempts < 10);
                if(num === null) num = Math.floor(Math.random()*8)+1;
                newGrid[r][c] = { val: num, dogId: null };
            }
        }
    }

    gameState.grid = newGrid;
    injectStrategicKeys();

    gameState.reserve = CONFIG.initialReserve;
    gameState.shuffleLeft = 1;
    gameState.status = 'playing';
    gameState.timeLeft = CONFIG.timeLimit;
    
    gameState.reserveQueue = [];
    for(let k=0; k<10; k++) gameState.reserveQueue = gameState.reserveQueue.concat(createRandomBag());

    return gameState;
}

// (Les fonctions injectStrategicKeys, checkMoveValidity, processMatch sont inchangées, je les garde pour que le fichier soit complet)
function injectStrategicKeys() {
    for(let r=0; r<7; r++) { 
        for(let c=0; c<8; c++) {
            if(gameState.grid[r][c].val === 9) {
                let blocker = gameState.grid[r+1][c];
                if(blocker.val > 0 && blocker.val < 9) {
                    let needed = 9 - blocker.val;
                    let hasKey = false;
                    if(c > 0 && gameState.grid[r+1][c-1].val === needed) hasKey = true;
                    if(c < 7 && gameState.grid[r+1][c+1].val === needed) hasKey = true;
                    if(r < 6 && gameState.grid[r+2][c].val === needed) hasKey = true;
                    if(!hasKey) {
                        let neighbors = [];
                        if(c > 0 && gameState.grid[r+1][c-1].val !== 9) neighbors.push({r: r+1, c: c-1});
                        if(c < 7 && gameState.grid[r+1][c+1].val !== 9) neighbors.push({r: r+1, c: c+1});
                        if(neighbors.length > 0) {
                            let target = neighbors[Math.floor(Math.random() * neighbors.length)];
                            gameState.grid[target.r][target.c] = { val: needed, dogId: null };
                        }
                    }
                }
            }
        }
    }
}

function checkMoveValidity(r1, c1, r2, c2) {
    let dr = Math.abs(r1 - r2), dc = Math.abs(c1 - c2);
    if(dr <= 1 && dc <= 1) return true; 
    let stepR = 0, stepC = 0;
    if(r1 === r2) stepC = (c2 > c1) ? 1 : -1;
    else if(c1 === c2) stepR = (r2 > r1) ? 1 : -1;
    else if(dr === dc) { stepR = (r2 > r1) ? 1 : -1; stepC = (c2 > c1) ? 1 : -1; }
    else return false;
    let cr = r1 + stepR, cc = c1 + stepC;
    while(cr !== r2 || cc !== c2) {
        if(gameState.grid[cr][cc].val !== 0) return false;
        cr += stepR; cc += stepC;
    }
    return true;
}

function processMatch(r1, c1, r2, c2) {
    gameState.grid[r1][c1].val = 0; gameState.grid[r1][c1].dogId = null;
    gameState.grid[r2][c2].val = 0; gameState.grid[r2][c2].dogId = null;
    return true;
}

function applyGravityLogic() {
    for(let c=0; c<8; c++) {
        let colItems = [];
        for(let r=0; r<8; r++) {
            if(gameState.grid[r][c].val !== 0) {
                colItems.push({...gameState.grid[r][c]});
            }
        }
        while(colItems.length < 8) {
            let newVal = 0;
            if(gameState.reserve > 0) {
                gameState.reserve--;
                if(gameState.reserveQueue.length < 5) gameState.reserveQueue = gameState.reserveQueue.concat(createRandomBag());
                let topValue = colItems.length > 0 ? colItems[0].val : -1;
                let foundIdx = -1;
                for(let i=0; i<Math.min(gameState.reserveQueue.length, 8); i++) {
                    if(gameState.reserveQueue[i] !== topValue) { foundIdx = i; break; }
                }
                if(foundIdx !== -1) newVal = gameState.reserveQueue.splice(foundIdx, 1)[0];
                else newVal = gameState.reserveQueue.shift();
            }
            colItems.unshift({ val: newVal, dogId: null });
        }
        for(let r=0; r<8; r++) gameState.grid[r][c] = colItems[r];
    }
}

function checkWinCondition() {
    for(let c=0; c<8; c++) {
        let cell = gameState.grid[7][c]; 
        if(cell.val === 9) {
            gameState.status = 'won';
            return { won: true, dogId: cell.dogId };
        }
    }
    return { won: false };
}

function shuffleBoardLogic() {
    console.log("--- BRASSAGE V14 ---");
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    let dogs = [], numbers = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        let item = gameState.grid[r][c];
        if(item.val === 9) dogs.push(item);
        else if (item.val !== 0) numbers.push(item);
    }
    numbers.sort(() => Math.random() - 0.5);
    let columns = Array(8).fill().map(() => []);
    let colPtr = 0;
    numbers.forEach(num => {
        let attempts = 0;
        while (columns[colPtr].length > 0 && columns[colPtr][columns[colPtr].length-1].val === num && attempts < 8) {
             colPtr = (colPtr + 1) % 8; attempts++;
        }
        if(columns[colPtr].length < 7) columns[colPtr].push(num);
        colPtr = (colPtr + 1) % 8;
    });

    let possibleSets = [[0, 2, 4, 6], [1, 3, 5, 7], [0, 2, 5, 7]];
    let chosenCols = possibleSets[Math.floor(Math.random() * possibleSets.length)];
    chosenCols.sort(() => Math.random() - 0.5);
    dogs.forEach((dog, i) => {
        let targetCol = chosenCols[i];
        while(columns[targetCol].length < 3) { 
            let filler = Math.floor(Math.random() * 8) + 1;
            columns[targetCol].unshift({val: filler, dogId: null});
        }
        columns[targetCol].push(dog);
    });

    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    for(let c=0; c<8; c++) {
        let stack = columns[c];
        for(let i=0; i<stack.length; i++) {
            let row = 7 - i; 
            if(row >= 0) newGrid[row][c] = stack[i];
        }
    }
    gameState.grid = newGrid;
    injectStrategicKeys();
    return true;
}
