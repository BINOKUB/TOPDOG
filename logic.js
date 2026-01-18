/* --- CONFIGURATION DU JEU --- */
const CONFIG = {
    gridSize: 8,
    initialReserve: 40,
    timeLimit: 120, 
    dogNames: ["SPARTACUS", "TITAN", "HURRICANE", "VIPER", "GHOST", "BANDIT", "REX", "CHAOS", "ZEUS", "TANK"]
};

/* --- ÉTAT DU JEU --- */
let gameState = {
    grid: [], score: 0, reserve: 0, shuffleLeft: 1,
    dogs: [], status: 'idle', timer: null, timeLeft: 0, reserveQueue: []
};

/* --- MOTEUR --- */
function initGameEngine() {
    console.log("%c --- TOPDOG V7 (STRATEGIC) CHARGÉ --- ", "background: #6600cc; color: #fff; font-size:20px; padding: 5px;");
    
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

    // Setup Grille (Départ sécurisé : Espacé)
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    // Espacement forcé
    let startCols = Math.random() > 0.5 ? [0, 2, 4, 6] : [1, 3, 5, 7];
    
    gameState.dogs.forEach((dog, i) => {
        let c = startCols[i];
        let r = Math.floor(Math.random() * 2); // Ligne 0 ou 1
        newGrid[r][c] = { val: 9, dogId: dog.id };
    });

    // Remplir le reste
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(!newGrid[r][c]) newGrid[r][c] = { val: Math.floor(Math.random()*8)+1, dogId: null };
        }
    }

    gameState.grid = newGrid;
    
    // LA TOUCHE MAGIQUE : On force des solutions dès le début
    injectStrategicKeys();

    gameState.score = 0;
    gameState.reserve = CONFIG.initialReserve;
    gameState.shuffleLeft = 1;
    gameState.status = 'playing';
    gameState.timeLeft = CONFIG.timeLimit;
    gameState.reserveQueue = Array(60).fill(0).map(() => Math.floor(Math.random()*8)+1);

    return gameState;
}

/* --- L'INTELLIGENCE STRATÉGIQUE (NOUVEAU) --- */
function injectStrategicKeys() {
    // Cette fonction parcourt la grille, trouve les chiens bloqués,
    // et change un chiffre voisin pour qu'il soit le complémentaire (la clé).
    
    for(let r=0; r<7; r++) { // Pas besoin de checker la dernière ligne
        for(let c=0; c<8; c++) {
            // Si c'est un chien
            if(gameState.grid[r][c].val === 9) {
                // Regarder juste en dessous (le Bloqueur)
                let blocker = gameState.grid[r+1][c];
                
                // Si le bloqueur est un chiffre (pas un chien, pas vide)
                if(blocker.val > 0 && blocker.val < 9) {
                    let needed = 9 - blocker.val;
                    
                    // On cherche si le 'needed' est déjà autour du bloqueur (gauche/droite/diagonales bas)
                    let hasKey = false;
                    
                    // Check Gauche (r+1, c-1)
                    if(c > 0 && gameState.grid[r+1][c-1].val === needed) hasKey = true;
                    // Check Droite (r+1, c+1)
                    if(c < 7 && gameState.grid[r+1][c+1].val === needed) hasKey = true;
                    // Check Bas (r+2, c) - Parfois utile
                    if(r < 6 && gameState.grid[r+2][c].val === needed) hasKey = true;

                    // SI PAS DE CLÉ, ON EN CRÉE UNE !
                    if(!hasKey) {
                        // On choisit un voisin au hasard (Gauche ou Droite) pour le transformer
                        let neighbors = [];
                        if(c > 0 && gameState.grid[r+1][c-1].val !== 9) neighbors.push({r: r+1, c: c-1});
                        if(c < 7 && gameState.grid[r+1][c+1].val !== 9) neighbors.push({r: r+1, c: c+1});
                        
                        if(neighbors.length > 0) {
                            let target = neighbors[Math.floor(Math.random() * neighbors.length)];
                            // Transformation Divine
                            gameState.grid[target.r][target.c] = { val: needed, dogId: null };
                            // console.log(`Stratégie injectée pour le chien en ${r},${c}: Clé ${needed} placée en ${target.r},${target.c}`);
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

    // Ligne de vue
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
                newVal = gameState.reserveQueue.shift() || Math.floor(Math.random()*8)+1;
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

/* --- LE BRASSAGE V7 (ESPACEMENT + STRATÉGIE) --- */
function shuffleBoardLogic() {
    console.log("--- BRASSAGE V7 ---");
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    // 1. Récupérer les items
    let dogs = [], numbers = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        let item = gameState.grid[r][c];
        if(item.val === 9) dogs.push(item);
        else if (item.val !== 0) numbers.push(item);
    }

    // 2. Mélange
    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
    shuffle(dogs);
    shuffle(numbers);

    // 3. Créer 8 colonnes
    let columns = Array(8).fill().map(() => []);

    // 4. Remplir socle
    let colIdx = 0;
    numbers.forEach(num => {
        if(columns[colIdx].length < 7) columns[colIdx].push(num);
        colIdx = (colIdx + 1) % 8;
    });

    // 5. Sélection Colonnes Espacées
    let possibleSets = [[0, 2, 4, 6], [1, 3, 5, 7], [0, 2, 5, 7], [0, 3, 5, 7]];
    let chosenCols = possibleSets[Math.floor(Math.random() * possibleSets.length)];
    shuffle(chosenCols);

    dogs.forEach((dog, i) => {
        let targetCol = chosenCols[i];
        while(columns[targetCol].length < 3) { // Sécurité hauteur
            let filler = Math.floor(Math.random() * 8) + 1;
            columns[targetCol].unshift({val: filler, dogId: null});
        }
        columns[targetCol].push(dog);
    });

    // 6. Reconstruction
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    for(let c=0; c<8; c++) {
        let stack = columns[c];
        for(let i=0; i<stack.length; i++) {
            let row = 7 - i; 
            if(row >= 0) newGrid[row][c] = stack[i];
        }
    }

    gameState.grid = newGrid;
    
    // 7. INJECTION DE STRATÉGIE (Le Fix pour ton problème)
    // Après avoir mélangé, on s'assure que les chiens ne sont pas bloqués bêtement
    injectStrategicKeys();
    
    return true;
}
