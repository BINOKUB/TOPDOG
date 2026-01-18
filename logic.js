/* --- CONFIGURATION DU JEU --- */
const CONFIG = {
    gridSize: 8,
    initialReserve: 60, // Augmenté pour correspondre à ton ressenti
    timeLimit: 120, 
    dogNames: ["SPARTACUS", "TITAN", "HURRICANE", "VIPER", "GHOST", "BANDIT", "REX", "CHAOS", "ZEUS", "TANK"]
};

/* --- ÉTAT DU JEU --- */
let gameState = {
    grid: [], score: 0, reserve: 0, shuffleLeft: 1,
    dogs: [], status: 'idle', timer: null, timeLeft: 0, reserveQueue: []
};

/* --- OUTILS DE GÉNÉRATION (NOUVEAU) --- */
// Système de "Sac" pour éviter les répétitions (Tetris Style)
function createRandomBag() {
    let bag = [];
    // On met 5 exemplaires de chaque chiffre (1 à 8) dans le sac
    for(let i=1; i<=8; i++) {
        for(let j=0; j<5; j++) bag.push(i);
    }
    // Mélange du sac
    return bag.sort(() => Math.random() - 0.5);
}

let currentBag = [];
function getBalancedNumber() {
    if(currentBag.length === 0) currentBag = createRandomBag();
    return currentBag.pop();
}

/* --- MOTEUR --- */
function initGameEngine() {
    console.log("%c --- TOPDOG V8 (BALANCED) CHARGÉ --- ", "background: #008000; color: #fff; font-size:20px;");
    
    currentBag = createRandomBag(); // Reset du sac

    // Setup Chiens
    gameState.dogs = [];
    let usedNames = [];
    for(let i=1; i<=4; i++) {
        let name;
        do { name = CONFIG.dogNames[Math.floor(Math.random() * CONFIG.dogNames.length)]; } while(usedNames.includes(name));
        usedNames.push(name);
        let bet = Math.floor(Math.random() * 46) * 100 + 500;
        gameState.dogs.push({ id: i, name: name, bet: bet });
    }

    // Setup Grille
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    
    // 1. Placer les Chiens (Espacés)
    let startCols = Math.random() > 0.5 ? [0, 2, 4, 6] : [1, 3, 5, 7];
    gameState.dogs.forEach((dog, i) => {
        let c = startCols[i];
        let r = Math.floor(Math.random() * 2); 
        newGrid[r][c] = { val: 9, dogId: dog.id };
    });

    // 2. Remplir avec "Anti-Doublon Vertical"
    for(let c=0; c<8; c++) {
        for(let r=0; r<8; r++) {
            if(!newGrid[r][c]) {
                let num;
                let attempts = 0;
                // On essaie de piocher un nombre qui n'est pas identique à celui du dessus
                do {
                    num = getBalancedNumber();
                    // Remettre dans le sac si ça ne va pas (sauf si on tourne en rond)
                    if(r > 0 && newGrid[r-1][c].val === num && attempts < 5) {
                        currentBag.unshift(num); // On remet en bas du sac
                        currentBag.sort(() => Math.random() - 0.5); // On remélange un peu
                        num = null; // On recommence
                        attempts++;
                    }
                } while (num === null && attempts < 5);
                
                // Si après 5 essais on est bloqué, on prend le num quand même (rare)
                if(num === null) num = Math.floor(Math.random()*8)+1;

                newGrid[r][c] = { val: num, dogId: null };
            }
        }
    }

    gameState.grid = newGrid;
    
    // Injection des clés stratégiques pour aider les chiens
    injectStrategicKeys();

    gameState.score = 0;
    gameState.reserve = CONFIG.initialReserve;
    gameState.shuffleLeft = 1;
    gameState.status = 'playing';
    gameState.timeLeft = CONFIG.timeLimit;
    
    // Génération de la file d'attente (aussi équilibrée)
    gameState.reserveQueue = [];
    for(let k=0; k<8; k++) gameState.reserveQueue = gameState.reserveQueue.concat(createRandomBag());

    return gameState;
}

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
        for(let r=0; r<8; r++) if(gameState.grid[r][c].val !== 0) colItems.push(gameState.grid[r][c]);
        
        while(colItems.length < 8) {
            let newVal = 0;
            if(gameState.reserve > 0) {
                gameState.reserve--;
                // Utilisation de la file équilibrée
                if(gameState.reserveQueue.length === 0) gameState.reserveQueue = createRandomBag();
                newVal = gameState.reserveQueue.shift();
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

/* --- BRASSAGE V8 (Anti-Doublon + Espacement) --- */
function shuffleBoardLogic() {
    console.log("--- BRASSAGE V8 ---");
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    let dogs = [], numbers = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        let item = gameState.grid[r][c];
        if(item.val === 9) dogs.push(item);
        else if (item.val !== 0) numbers.push(item);
    }

    // Mélange intelligent pour casser les répétitions dans la liste 'numbers'
    // On recrée un sac parfait pour la redistribution si possible
    numbers.sort(() => Math.random() - 0.5);

    let columns = Array(8).fill().map(() => []);

    // Remplissage équilibré (Distribution horizontale)
    // Au lieu de remplir une colonne puis l'autre, on remplit ligne par ligne
    // pour éviter les concentrations
    let colPtr = 0;
    numbers.forEach(num => {
        // Petit check pour éviter doublon vertical immédiat dans la colonne
        let stack = columns[colPtr];
        if(stack.length > 0 && stack[stack.length-1].val === num) {
             // Si doublon, on essaie la colonne suivante
             colPtr = (colPtr + 1) % 8;
        }
        
        if(columns[colPtr].length < 7) {
            columns[colPtr].push(num);
        }
        colPtr = (colPtr + 1) % 8;
    });

    // Placement Chiens (Espacés)
    let possibleSets = [[0, 2, 4, 6], [1, 3, 5, 7], [0, 2, 5, 7]];
    let chosenCols = possibleSets[Math.floor(Math.random() * possibleSets.length)];
    chosenCols.sort(() => Math.random() - 0.5); // Mélange

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
