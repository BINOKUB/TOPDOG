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
    bankroll: 0, 
    reserve: 0, shuffleLeft: 1,
    dogs: [], status: 'idle', timer: null, timeLeft: 0, reserveQueue: []
};

/* --- OUTILS --- */
function createRandomBag() {
    let bag = [];
    for(let i=1; i<=8; i++) for(let j=0; j<5; j++) bag.push(i);
    return bag.sort(() => Math.random() - 0.5);
}

// Fonction utilitaire pour piocher intelligemment SANS doublon vertical
function getNextNonMatching(forbiddenValue, queue) {
    // Si la file est vide, on en recrée une
    if(queue.length === 0) return Math.floor(Math.random()*8)+1;
    
    // 1. Essai direct : le premier de la file
    if(queue[0] !== forbiddenValue) {
        return queue.shift();
    }
    
    // 2. Si ça match l'interdit, on cherche plus loin dans la file
    let foundIndex = -1;
    // On regarde les 12 prochains chiffres (large marge de sécurité)
    for(let i=1; i<Math.min(queue.length, 12); i++) {
        if(queue[i] !== forbiddenValue) {
            foundIndex = i;
            break;
        }
    }
    
    if(foundIndex !== -1) {
        // On a trouvé un candidat valide plus loin, on l'extrait
        return queue.splice(foundIndex, 1)[0];
    }
    
    // 3. Cas extrême (ne devrait pas arriver avec un Sac équilibré)
    // Si tout est pareil, on prend quand même pour ne pas crasher, 
    // ou on génère un random forcé différent.
    let fallback = queue.shift();
    if(fallback === forbiddenValue) {
        // Triche : on transforme le chiffre pour forcer la différence
        fallback = (fallback % 8) + 1; 
    }
    return fallback;
}

function loadBankroll() {
    let saved = localStorage.getItem('topdog_bankroll');
    return saved ? parseInt(saved) : 0;
}
function saveBankroll(amount) {
    localStorage.setItem('topdog_bankroll', amount);
}

/* --- MOTEUR --- */
function initGameEngine() {
    console.log("%c --- TOPDOG V15 (VERTICAL FIREWALL) --- ", "background: #fff; color: #000; font-size:20px; font-weight:bold;");
    
    gameState.dogs = [];
    gameState.bankroll = loadBankroll();
    gameState.reserveQueue = []; 
    // On prépare une GROSSE file d'attente dès le début
    for(let k=0; k<10; k++) gameState.reserveQueue = gameState.reserveQueue.concat(createRandomBag());

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
    
    // 1. Placement Chiens
    gameState.dogs.forEach((dog, i) => {
        let c = startCols[i];
        let r = Math.floor(Math.random() * 2); 
        newGrid[r][c] = { val: 9, dogId: dog.id };
    });

    // 2. Remplissage Initial AVEC PROTECTION VERTICALE STRICTE
    for(let c=0; c<8; c++) {
        for(let r=0; r<8; r++) { // On remplit de haut en bas
            if(!newGrid[r][c]) {
                // On regarde ce qu'il y a au-dessus (r-1)
                // Note: Au chargement initial, on remplit case par case, 
                // donc on doit vérifier avec la case PRÉCÉDENTE (r-1) pour ne pas créer de pile.
                let forbidden = -1;
                if(r > 0 && newGrid[r-1][c].val !== 0 && newGrid[r-1][c].val !== 9) {
                    forbidden = newGrid[r-1][c].val;
                }

                let num = getNextNonMatching(forbidden, gameState.reserveQueue);
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
    
    // On recharge la queue si elle a baissé
    if(gameState.reserveQueue.length < 20) gameState.reserveQueue = gameState.reserveQueue.concat(createRandomBag());

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

/* --- GRAVITÉ V15 : STRICT NO-DUPLICATE --- */
function applyGravityLogic() {
    // Recharger la file si nécessaire
    if(gameState.reserveQueue.length < 20) gameState.reserveQueue = gameState.reserveQueue.concat(createRandomBag());

    for(let c=0; c<8; c++) {
        let colItems = [];
        // 1. Récupérer les solides
        for(let r=0; r<8; r++) {
            if(gameState.grid[r][c].val !== 0) {
                colItems.push({...gameState.grid[r][c]});
            }
        }
        
        // 2. Remplir le vide au sommet
        while(colItems.length < 8) {
            let newVal = 0;
            
            if(gameState.reserve > 0) {
                gameState.reserve--;
                
                // --- LE FIREWALL ---
                // On regarde le chiffre qui est actuellement au sommet de la pile (index 0)
                // C'est celui sur lequel le nouveau chiffre va se poser.
                let valueBelow = -1;
                if(colItems.length > 0 && colItems[0].val !== 9) {
                    valueBelow = colItems[0].val;
                }
                
                // On demande à la file de nous donner un chiffre QUI N'EST PAS 'valueBelow'
                newVal = getNextNonMatching(valueBelow, gameState.reserveQueue);
            }
            
            // Ajout au sommet
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
    console.log("--- BRASSAGE V15 ---");
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    let dogs = [], numbers = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        let item = gameState.grid[r][c];
        if(item.val === 9) dogs.push(item);
        else if (item.val !== 0) numbers.push(item);
    }
    numbers.sort(() => Math.random() - 0.5);
    
    // Reconstitution des colonnes avec check anti-doublon
    let columns = Array(8).fill().map(() => []);
    let colPtr = 0;
    
    // On essaie de distribuer équitablement
    numbers.forEach(num => {
        let attempts = 0;
        // Si le sommet de la colonne actuelle est identique au num, on passe à la colonne suivante
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
