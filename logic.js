/* =========================================
   TOPDOG ENGINE V20
   CODENAME: INFINITE AI
   DESCRIPTION: Réserve infinie. Génération contextuelle stricte.
   ========================================= */

/* --- CONFIGURATION --- */
const CONFIG = {
    gridSize: 8,
    // Plus de "initialReserve". C'est infini.
    timeLimit: 120, 
    dogNames: ["SPARTACUS", "TITAN", "HURRICANE", "VIPER", "GHOST", "BANDIT", "REX", "CHAOS", "ZEUS", "TANK"]
};

/* --- ÉTAT DU JEU --- */
let gameState = {
    grid: [], 
    bankroll: 0, 
    // reserve: 0, // Supprimé
    shuffleLeft: 1,
    dogs: [], status: 'idle', timer: null, timeLeft: 0
};

/* --- L'INTELLIGENCE ARTIFICIELLE (GÉNÉRATEUR) --- */

/**
 * Cette fonction est le CŒUR de la V20.
 * Elle regarde une case (r, c) et retourne un chiffre [1-8]
 * qui ne touche AUCUN voisin identique.
 */
function generatePerfectNumber(r, c, currentGrid) {
    let forbidden = new Set(); // Utilisation d'un Set pour unicité

    // 1. Scan des voisins immédiats sur la grille actuelle
    // HAUT
    if (r > 0 && currentGrid[r-1][c].val !== 0 && currentGrid[r-1][c].val !== 9) forbidden.add(currentGrid[r-1][c].val);
    // BAS
    if (r < 7 && currentGrid[r+1][c] && currentGrid[r+1][c].val !== 0 && currentGrid[r+1][c].val !== 9) forbidden.add(currentGrid[r+1][c].val);
    // GAUCHE
    if (c > 0 && currentGrid[r][c-1].val !== 0 && currentGrid[r][c-1].val !== 9) forbidden.add(currentGrid[r][c-1].val);
    // DROITE
    if (c < 7 && currentGrid[r][c+1] && currentGrid[r][c+1].val !== 0 && currentGrid[r][c+1].val !== 9) forbidden.add(currentGrid[r][c+1].val);

    // 2. Calcul des candidats possibles (1 à 8)
    let candidates = [];
    for(let i=1; i<=8; i++) {
        if(!forbidden.has(i)) {
            candidates.push(i);
        }
    }

    // 3. Choix aléatoire parmi les candidats valides
    // Comme il y a max 4 voisins et 8 chiffres, candidates.length est toujours >= 4.
    // Impossible de bloquer.
    return candidates[Math.floor(Math.random() * candidates.length)];
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
    console.log("%c --- TOPDOG V20 (INFINITE AI) --- ", "background: #000; color: #00ffff; font-size:16px; font-weight:bold;");
    
    gameState.dogs = [];
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
    
    // Placement Chiens
    gameState.dogs.forEach((dog, i) => {
        let c = startCols[i];
        let r = Math.floor(Math.random() * 2); 
        newGrid[r][c] = { val: 9, dogId: dog.id };
    });

    // Remplissage Initial avec l'IA
    for(let c=0; c<8; c++) {
        for(let r=0; r<8; r++) {
            if(!newGrid[r][c] || newGrid[r][c] === 0) {
                // L'IA décide du chiffre parfait ici
                let num = generatePerfectNumber(r, c, newGrid);
                newGrid[r][c] = { val: num, dogId: null };
            }
        }
    }

    gameState.grid = newGrid;
    injectStrategicKeys();

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

/* --- GRAVITÉ V20 : L'IA DE REMPLISSAGE --- */
function applyGravityLogic() {
    for(let c=0; c<8; c++) {
        // 1. On extrait les items solides de la colonne
        let colItems = [];
        for(let r=0; r<8; r++) {
            if(gameState.grid[r][c].val !== 0) {
                colItems.push({...gameState.grid[r][c]});
            }
        }
        
        // 2. On calcule combien il manque
        let missing = 8 - colItems.length;
        
        // 3. On génère les nouveaux items pour combler les trous
        let newItems = [];
        for(let i=0; i<missing; i++) {
            // Pour l'instant, on met des placeholders. 
            // On calculera leur valeur exacte une fois qu'ils seront placés dans la grille temporaire
            // pour avoir le contexte exact des voisins.
            newItems.unshift({ val: -1, dogId: null }); // -1 = "A Calculer"
        }
        
        // 4. On reconstitue la colonne complète
        colItems = newItems.concat(colItems);

        // 5. On met à jour la grille (avec les -1)
        for(let r=0; r<8; r++) gameState.grid[r][c] = colItems[r];
    }

    // 6. PASSAGE DE L'IA : On remplace les -1 par les valeurs parfaites
    // On le fait ligne par ligne (du bas vers le haut ou haut vers bas, peu importe ici)
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(gameState.grid[r][c].val === -1) {
                // L'IA regarde autour et décide
                let perfectNum = generatePerfectNumber(r, c, gameState.grid);
                gameState.grid[r][c].val = perfectNum;
            }
        }
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

/* --- BRASSAGE V20 --- */
function shuffleBoardLogic() {
    console.log("--- BRASSAGE V20 ---");
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    // On garde juste les chiens, on jette les chiffres (car on a une réserve infinie)
    let dogs = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        if(gameState.grid[r][c].val === 9) dogs.push(gameState.grid[r][c]);
    }

    // Nouvelle Grille
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    
    // Positionnement aléatoire des chiens
    let possibleSets = [[0, 2, 4, 6], [1, 3, 5, 7], [0, 2, 5, 7]];
    let chosenCols = possibleSets[Math.floor(Math.random() * possibleSets.length)];
    chosenCols.sort(() => Math.random() - 0.5);
    
    let dogMap = {};
    dogs.forEach((dog, i) => { dogMap[chosenCols[i]] = dog; });

    // On reconstruit tout avec l'IA
    for(let c=0; c<8; c++) {
        let hasDog = dogMap[c] !== undefined;
        let dogRow = hasDog ? Math.floor(Math.random() * 2) : -1;
        
        for(let r=0; r<8; r++) {
            if (hasDog && r === dogRow) {
                newGrid[r][c] = dogMap[c];
            } else {
                // Génération intelligente
                let num = generatePerfectNumber(r, c, newGrid);
                newGrid[r][c] = { val: num, dogId: null };
            }
        }
    }

    gameState.grid = newGrid;
    injectStrategicKeys();
    return true;
}
