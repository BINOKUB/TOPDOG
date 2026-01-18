/* =========================================
   TOPDOG LOGIC ENGINE
   REVISION: V19
   CHANGELOG: 
   - Ajout du "Sanitizer" : Une passe finale qui corrige les doublons post-gravité.
   - Sécurisation des voisins mouvants.
   ========================================= */

/* --- CONFIGURATION --- */
const CONFIG = {
    gridSize: 8,
    initialReserve: 40, 
    timeLimit: 120, 
    dogNames: ["SPARTACUS", "TITAN", "HURRICANE", "VIPER", "GHOST", "BANDIT", "REX", "CHAOS", "ZEUS", "TANK"]
};

/* --- ÉTAT DU JEU --- */
let gameState = {
    grid: [], 
    bankroll: 0, 
    reserve: 0, shuffleLeft: 1,
    dogs: [], status: 'idle', timer: null, timeLeft: 0, reserveQueue: []
};

/* --- OUTILS GÉNÉRATEURS --- */
function createRandomBag() {
    let bag = [];
    for(let i=1; i<=8; i++) for(let j=0; j<5; j++) bag.push(i);
    return bag.sort(() => Math.random() - 0.5);
}

// Pioche un nombre qui n'est pas dans la liste 'forbidden'
function pickValidNumber(forbiddenValues, queue) {
    if (queue.length < 10) queue.push(...createRandomBag());

    let foundIndex = -1;
    for(let i=0; i<Math.min(queue.length, 20); i++) {
        if (!forbiddenValues.includes(queue[i])) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex !== -1) return queue.splice(foundIndex, 1)[0];

    // Fallback : Génération forcée si le sac bloque
    let candidates = [1,2,3,4,5,6,7,8].filter(n => !forbiddenValues.includes(n));
    if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
    return Math.floor(Math.random() * 8) + 1;
}

/* --- LE SANITIZER (NOUVEAU V19) --- */
// Cette fonction scanne la grille et corrige les doublons résiduels
function sanitizeGrid() {
    let changes = 0;
    // On fait 2 passes pour être sûr
    for(let pass=0; pass<2; pass++) {
        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                let cell = gameState.grid[r][c];
                if(cell.val === 9 || cell.val === 0) continue; // On ne touche pas aux chiens ni au vide

                let conflict = false;
                let forbidden = [];

                // Check Voisins pour détecter conflits ET préparer la liste d'interdits pour la correction
                
                // HAUT
                if(r > 0 && gameState.grid[r-1][c].val !== 0 && gameState.grid[r-1][c].val !== 9) {
                    forbidden.push(gameState.grid[r-1][c].val);
                    if(gameState.grid[r-1][c].val === cell.val) conflict = true;
                }
                // BAS
                if(r < 7 && gameState.grid[r+1][c].val !== 0 && gameState.grid[r+1][c].val !== 9) {
                    forbidden.push(gameState.grid[r+1][c].val);
                    if(gameState.grid[r+1][c].val === cell.val) conflict = true;
                }
                // GAUCHE
                if(c > 0 && gameState.grid[r][c-1].val !== 0 && gameState.grid[r][c-1].val !== 9) {
                    forbidden.push(gameState.grid[r][c-1].val);
                    if(gameState.grid[r][c-1].val === cell.val) conflict = true;
                }
                // DROITE
                if(c < 7 && gameState.grid[r][c+1].val !== 0 && gameState.grid[r][c+1].val !== 9) {
                    forbidden.push(gameState.grid[r][c+1].val);
                    if(gameState.grid[r][c+1].val === cell.val) conflict = true;
                }

                // SI CONFLIT DÉTECTÉ : ON MUTE !
                if(conflict) {
                    // On cherche une valeur qui n'est ni le conflit, ni aucun autre voisin
                    let candidates = [1,2,3,4,5,6,7,8].filter(n => !forbidden.includes(n));
                    if(candidates.length > 0) {
                        cell.val = candidates[Math.floor(Math.random() * candidates.length)];
                        changes++;
                    }
                }
            }
        }
        if(changes === 0) break; // Si grid propre, on arrête
    }
}

/* --- PERSISTANCE --- */
function loadBankroll() {
    let saved = localStorage.getItem('topdog_bankroll');
    return saved ? parseInt(saved) : 0;
}
function saveBankroll(amount) {
    localStorage.setItem('topdog_bankroll', amount);
}

/* --- INITIALISATION --- */
function initGameEngine() {
    console.log("%c --- TOPDOG REV 19 (SANITIZER) --- ", "background: #000; color: #00ff00; font-size:16px; font-weight:bold;");
    
    gameState.dogs = [];
    gameState.bankroll = loadBankroll();
    gameState.reserveQueue = createRandomBag().concat(createRandomBag());

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

    // Remplissage initial
    for(let c=0; c<8; c++) {
        for(let r=0; r<8; r++) {
            if(!newGrid[r][c] || newGrid[r][c] === 0) {
                let forbidden = [];
                if (r > 0 && newGrid[r-1][c].val !== 0 && newGrid[r-1][c].val !== 9) forbidden.push(newGrid[r-1][c].val);
                if (c > 0 && newGrid[r][c-1].val !== 0 && newGrid[r][c-1].val !== 9) forbidden.push(newGrid[r][c-1].val);
                
                let num = pickValidNumber(forbidden, gameState.reserveQueue);
                newGrid[r][c] = { val: num, dogId: null };
            }
        }
    }

    gameState.grid = newGrid;
    
    // NETTOYAGE V19
    sanitizeGrid(); 
    injectStrategicKeys();

    gameState.reserve = CONFIG.initialReserve;
    gameState.shuffleLeft = 1;
    gameState.status = 'playing';
    gameState.timeLeft = CONFIG.timeLimit;
    
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

/* --- GRAVITÉ --- */
function applyGravityLogic() {
    for(let c=0; c<8; c++) {
        let colItems = [];
        for(let r=0; r<8; r++) if(gameState.grid[r][c].val !== 0) colItems.push({...gameState.grid[r][c]});
        
        let missing = 8 - colItems.length;
        let newItems = [];
        
        for(let i=0; i<missing; i++) {
            let newVal = 0;
            if(gameState.reserve > 0) {
                gameState.reserve--;
                let forbidden = [];
                // Interdit dessous
                let itemBelow = (i === 0) ? colItems[0] : newItems[0];
                if (itemBelow && itemBelow.val !== 9) forbidden.push(itemBelow.val);

                // Tentative d'interdits latéraux (Estimation)
                let targetRow = missing - 1 - i; 
                if (c > 0 && gameState.grid[targetRow][c-1].val !== 0) forbidden.push(gameState.grid[targetRow][c-1].val);
                if (c < 7 && gameState.grid[targetRow][c+1].val !== 0) forbidden.push(gameState.grid[targetRow][c+1].val);

                newVal = pickValidNumber(forbidden, gameState.reserveQueue);
            }
            newItems.unshift({ val: newVal, dogId: null });
        }
        
        colItems = newItems.concat(colItems);
        for(let r=0; r<8; r++) gameState.grid[r][c] = colItems[r];
    }
    
    // NETTOYAGE V19 : On repasse une couche pour corriger ce que la gravité a raté
    sanitizeGrid();
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

/* --- BRASSAGE --- */
function shuffleBoardLogic() {
    console.log("--- BRASSAGE REV 19 ---");
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    let dogs = [];
    let numbers = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        if(gameState.grid[r][c].val === 9) dogs.push(gameState.grid[r][c]);
        else if (gameState.grid[r][c].val !== 0) numbers.push(gameState.grid[r][c].val);
    }

    gameState.reserveQueue = numbers.concat(gameState.reserveQueue);
    gameState.reserveQueue.sort(() => Math.random() - 0.5);

    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    let possibleSets = [[0, 2, 4, 6], [1, 3, 5, 7], [0, 2, 5, 7]];
    let chosenCols = possibleSets[Math.floor(Math.random() * possibleSets.length)];
    chosenCols.sort(() => Math.random() - 0.5);
    
    let dogMap = {};
    dogs.forEach((dog, i) => { dogMap[chosenCols[i]] = dog; });

    for(let c=0; c<8; c++) {
        let hasDog = dogMap[c] !== undefined;
        let dogRow = hasDog ? Math.floor(Math.random() * 2) : -1;
        
        for(let r=0; r<8; r++) {
            if (hasDog && r === dogRow) {
                newGrid[r][c] = dogMap[c];
            } else {
                let forbidden = [];
                if (r > 0 && newGrid[r-1][c].val !== 0 && newGrid[r-1][c].val !== 9) forbidden.push(newGrid[r-1][c].val);
                if (c > 0 && newGrid[r][c-1].val !== 0 && newGrid[r][c-1].val !== 9) forbidden.push(newGrid[r][c-1].val);
                
                let num = pickValidNumber(forbidden, gameState.reserveQueue);
                newGrid[r][c] = { val: num, dogId: null };
            }
        }
    }

    gameState.grid = newGrid;
    
    // NETTOYAGE V19
    sanitizeGrid();
    injectStrategicKeys();
    return true;
}
