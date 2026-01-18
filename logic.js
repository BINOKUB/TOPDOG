/* =========================================
   TOPDOG ENGINE V22
   CODENAME: PERFECT EQUITY (POOL SYSTEM)
   ========================================= */

/* --- CONFIGURATION --- */
const CONFIG = {
    gridSize: 8,
    timeLimit: 120, 
    dogNames: ["SPARTACUS", "TITAN", "HURRICANE", "VIPER", "GHOST", "BANDIT", "REX", "CHAOS", "ZEUS", "TANK"]
};

/* --- ÉTAT DU JEU --- */
let gameState = {
    grid: [], 
    bankroll: 0, 
    shuffleLeft: 1,
    dogs: [], status: 'idle', timer: null, timeLeft: 0,
    
    // NOUVEAU : Le "Sac Global" pour la gravité (assure l'équité sur la durée)
    globalBag: []
};

/* --- SYSTÈME DE DISTRIBUTION ÉQUITABLE --- */

// 1. Créer un "Deck" parfait pour le démarrage (60 cartes)
function createInitialDeck() {
    let deck = [];
    // Base : 7 exemplaires de chaque chiffre (1-8) => 56 cartes
    for (let i = 1; i <= 8; i++) {
        for (let k = 0; k < 7; k++) deck.push(i);
    }
    // Comblement : 4 cartes restantes (3, 4, 5, 6) pour atteindre 60
    deck.push(3, 4, 5, 6);
    
    // Mélange initial
    return deck.sort(() => Math.random() - 0.5);
}

// 2. Créer un sac équilibré pour la gravité (40 cartes : 5 de chaque)
function refillGlobalBag() {
    let bag = [];
    for (let i = 1; i <= 8; i++) {
        for (let k = 0; k < 5; k++) bag.push(i);
    }
    return bag.sort(() => Math.random() - 0.5);
}

// Helper de lecture sécurisée
function getSafeVal(r, c, grid) {
    if (r < 0 || r >= 8 || c < 0 || c >= 8) return null;
    let cell = grid[r][c];
    if (!cell) return null;
    if (typeof cell === 'object') {
        if (cell.val === 9) return 9; 
        if (cell.val > 0) return cell.val;
    }
    return null;
}

/* --- LE SÉLECTEUR INTELLIGENT (HYBRIDE) --- */
// Il essaie de prendre un chiffre dans le Deck fourni (pour respecter les quotas)
// MAIS il vérifie qu'il ne crée pas de doublon.
// S'il ne trouve pas dans le deck, il fait un échange (swap).

function fillGridWithDeck(grid, deck) {
    // On parcourt la grille case par case
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            // Si c'est une case vide (pas un chien)
            if(!grid[r][c] || grid[r][c] === 0) {
                
                // 1. Identifier les interdits (Voisins)
                let forbidden = new Set();
                let neighbors = [
                    getSafeVal(r-1, c, grid), getSafeVal(r+1, c, grid),
                    getSafeVal(r, c-1, grid), getSafeVal(r, c+1, grid)
                ];
                neighbors.forEach(n => { if(n !== null && n !== 9) forbidden.add(n); });

                // 2. Chercher dans le deck un candidat valide
                let foundIndex = -1;
                // On scanne le deck jusqu'à trouver un chiffre compatible
                for(let i=0; i<deck.length; i++) {
                    if (!forbidden.has(deck[i])) {
                        foundIndex = i;
                        break;
                    }
                }

                let val;
                if (foundIndex !== -1) {
                    // On a trouvé un bon chiffre, on le prend
                    val = deck.splice(foundIndex, 1)[0];
                } else {
                    // CRISE : Aucun chiffre du deck ne matche (très rare avec ce volume)
                    // On prend le premier du deck quand même et on le "force" (mutation)
                    // OU on génère un random hors deck pour débloquer
                    val = deck.shift();
                    // Si par malheur il est interdit, on le change
                    while(forbidden.has(val)) {
                        val = (val % 8) + 1;
                    }
                }

                grid[r][c] = { val: val, dogId: null };
            }
        }
    }
}

// Fonction pour piocher dans le sac infini (Gravité) en respectant les voisins
function pickFromBagSmart(r, c, currentGrid) {
    // Si le sac est vide, on le remplit (5 de chaque)
    if (gameState.globalBag.length < 5) {
        gameState.globalBag = gameState.globalBag.concat(refillGlobalBag());
    }

    // Interdits
    let forbidden = new Set();
    let neighbors = [
        getSafeVal(r-1, c, currentGrid), getSafeVal(r+1, c, currentGrid),
        getSafeVal(r, c-1, currentGrid), getSafeVal(r, c+1, currentGrid)
    ];
    neighbors.forEach(n => { if(n !== null && n !== 9) forbidden.add(n); });

    // On cherche dans le sac
    let foundIndex = -1;
    for(let i=0; i<Math.min(gameState.globalBag.length, 20); i++) {
        if (!forbidden.has(gameState.globalBag[i])) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex !== -1) {
        return gameState.globalBag.splice(foundIndex, 1)[0];
    }

    // Fallback
    let fallback = gameState.globalBag.shift();
    if(forbidden.has(fallback)) {
        // Mutation locale pour éviter le blocage
        let candidates = [1,2,3,4,5,6,7,8].filter(x => !forbidden.has(x));
        if(candidates.length > 0) fallback = candidates[Math.floor(Math.random()*candidates.length)];
    }
    return fallback;
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
    console.log("%c --- TOPDOG V22 (PERFECT EQUITY) --- ", "background: #fff; color: #000; font-size:16px; font-weight:bold;");
    
    gameState.dogs = [];
    gameState.bankroll = loadBankroll();
    gameState.globalBag = refillGlobalBag(); // Initialisation sac gravité

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
    
    // 1. Chiens
    gameState.dogs.forEach((dog, i) => {
        let c = startCols[i];
        let r = Math.floor(Math.random() * 2); 
        newGrid[r][c] = { val: 9, dogId: dog.id };
    });

    // 2. Préparation du Deck Parfait (60 cartes équilibrées)
    let perfectDeck = createInitialDeck();

    // 3. Remplissage intelligent avec le Deck
    fillGridWithDeck(newGrid, perfectDeck);

    // 4. Nettoyage ultime (au cas où)
    bruteForceClean(newGrid);

    gameState.grid = newGrid;
    injectStrategicKeys();

    gameState.shuffleLeft = 1;
    gameState.status = 'playing';
    gameState.timeLeft = CONFIG.timeLimit;
    
    return gameState;
}

// Fonction de nettoyage (inchangée V21, elle est très bien)
function bruteForceClean(grid) {
    let attempts = 0; 
    let errors = true;
    while(errors && attempts < 50) {
        errors = false;
        attempts++;
        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                let v = getSafeVal(r, c, grid);
                if(!v || v === 9) continue;
                
                let n = [getSafeVal(r-1,c,grid), getSafeVal(r+1,c,grid), getSafeVal(r,c-1,grid), getSafeVal(r,c+1,grid)];
                if(n.includes(v)) {
                    errors = true;
                    // On change pour une valeur safe
                    let forbidden = new Set(n);
                    let candidates = [1,2,3,4,5,6,7,8].filter(x => !forbidden.has(x));
                    if(candidates.length > 0) grid[r][c].val = candidates[Math.floor(Math.random()*candidates.length)];
                }
            }
        }
    }
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

/* --- GRAVITÉ ÉQUITABLE (V22) --- */
function applyGravityLogic() {
    for(let c=0; c<8; c++) {
        let colItems = [];
        for(let r=0; r<8; r++) {
            if(gameState.grid[r][c].val !== 0) {
                colItems.push({...gameState.grid[r][c]});
            }
        }
        
        let missing = 8 - colItems.length;
        let newItems = [];
        for(let i=0; i<missing; i++) {
            newItems.unshift({ val: -1, dogId: null });
        }
        
        colItems = newItems.concat(colItems);
        for(let r=0; r<8; r++) gameState.grid[r][c] = colItems[r];
    }

    // Remplissage avec le Sac Global Équilibré
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(gameState.grid[r][c].val === -1) {
                gameState.grid[r][c].val = pickFromBagSmart(r, c, gameState.grid);
            }
        }
    }
    
    // Petite passe de nettoyage
    bruteForceClean(gameState.grid);
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

/* --- BRASSAGE V22 --- */
function shuffleBoardLogic() {
    console.log("--- BRASSAGE V22 ---");
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    let dogs = [];
    // Pour le brassage, on recrée un deck équilibré pour s'assurer qu'on ne dérive pas
    let numbersDeck = createInitialDeck(); 

    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        if(gameState.grid[r][c].val === 9) dogs.push(gameState.grid[r][c]);
    }

    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    
    let possibleSets = [[0, 2, 4, 6], [1, 3, 5, 7], [0, 2, 5, 7]];
    let chosenCols = possibleSets[Math.floor(Math.random() * possibleSets.length)];
    chosenCols.sort(() => Math.random() - 0.5);
    
    let dogMap = {};
    dogs.forEach((dog, i) => { dogMap[chosenCols[i]] = dog; });

    // 1. Placer les chiens
    for(let c=0; c<8; c++) {
        if(dogMap[c]) {
            let r = Math.floor(Math.random() * 2);
            newGrid[r][c] = dogMap[c];
        }
    }

    // 2. Remplir avec le deck parfait
    fillGridWithDeck(newGrid, numbersDeck);
    
    // 3. Nettoyer
    bruteForceClean(newGrid);

    gameState.grid = newGrid;
    injectStrategicKeys();
    return true;
}
