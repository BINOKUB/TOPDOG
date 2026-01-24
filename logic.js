/* =========================================
   TOPDOG ENGINE V25 (SYNC FIX)
   CODENAME: THE SWAPPER + WALLET SYNC
   ========================================= */

const CONFIG = {
    gridSize: 8,
    timeLimit: 120, 

   dogNames: [
        // --- ORIGINAUX ---
        "SPARTACUS", "TITAN", "HURRICANE", "VIPER", "GHOST", 
        "BANDIT", "REX", "CHAOS", "ZEUS", "TANK", 
        "TORNADO", "MERCURY", "BALTO", "MAXIMUS", "THOR", 
        "COMET", "FLASH", "ECLAIR", "APOLLO", "CYCLONE", 
        "PHANTOM", "STORM", "TEPPY",
        
        // --- NOUVEAUX (MYTHOLOGIE & GUERRE) ---
        "ARES", "HADES", "ODIN", "HERCULES", "CERBERUS", 
        "CAESAR", "BRUTUS", "GOLIATH", "SAMURAI", "NINJA",
        "VIKING", "SPARTAN", "GENERAL", "MAJOR", "SNIPER",

        // --- NOUVEAUX (VITESSE & PUISSANCE) ---
        "NITRO", "TURBO", "DIESEL", "ROCKET", "JET", 
        "SONIC", "VOLT", "MAGNUM", "BULLET", "DOZER", 
        "KONG", "GODZILLA", "JAX", "SPIKE", "BUTCH",

        // --- NOUVEAUX (NATURE & ÉLÉMENTS) ---
        "THUNDER", "BLIZZARD", "PYRO", "AVALANCHE", "SHADOW", 
        "VENOM", "COBRA", "DRACO", "BLAZE", "FROST",

        // --- NOUVEAUX (PRESTIGE) ---
        "LEGEND", "CHAMP", "BOSS", "KING", "ACE", 
        "JOKER", "DUKE", "BARON", "PRINCE", "LUCKY"
    ]
};
  
let gameState = {
    grid: [], 
    bankroll: 0, 
    shuffleLeft: 1,
    dogs: [], status: 'idle', timer: null, timeLeft: 0,
    gravityBag: []
};

/* --- 1. LE DECK PARFAIT --- */
function createPerfectDeck() {
    let deck = [];
    let counts = [8, 8, 8, 8, 7, 7, 7, 7];
    let values = [1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5); 
    for (let i = 0; i < 8; i++) {
        let val = values[i];
        let count = counts[i];
        for (let k = 0; k < count; k++) deck.push(val);
    }
    return deck.sort(() => Math.random() - 0.5); 
}

/* --- 2. OUTILS DE VÉRIFICATION --- */
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

function countConflicts(r, c, grid) {
    let val = getSafeVal(r, c, grid);
    if (!val || val === 9) return 0;
    let conflicts = 0;
    let neighbors = [getSafeVal(r-1, c, grid), getSafeVal(r+1, c, grid), getSafeVal(r, c-1, grid), getSafeVal(r, c+1, grid)];
    neighbors.forEach(n => { if (n === val) conflicts++; });
    return conflicts;
}

/* --- 3. LE SWAPPER (ALGORITHME) --- */
function solveGridBySwapping(grid) {
    let maxPasses = 1000; let hasConflicts = true; let pass = 0;
    let numberPositions = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) if(grid[r][c].val !== 9 && grid[r][c].val !== 0) numberPositions.push({r, c});

    while (hasConflicts && pass < maxPasses) {
        hasConflicts = false; pass++;
        numberPositions.sort(() => Math.random() - 0.5);
        for (let pos of numberPositions) {
            let r = pos.r; let c = pos.c;
            if (countConflicts(r, c, grid) > 0) {
                hasConflicts = true;
                for(let k=0; k<10; k++) {
                    let randIdx = Math.floor(Math.random() * numberPositions.length);
                    let partner = numberPositions[randIdx];
                    if (partner.r === r && partner.c === c) continue;
                    let valA = grid[r][c].val; let valB = grid[partner.r][partner.c].val;
                    if (valA === valB) continue;
                    grid[r][c].val = valB; grid[partner.r][partner.c].val = valA;
                    let conflictsA = countConflicts(r, c, grid); let conflictsB = countConflicts(partner.r, partner.c, grid);
                    if (conflictsA === 0 && conflictsB === 0) { break; } 
                    else { grid[r][c].val = valA; grid[partner.r][partner.c].val = valB; }
                }
            }
        }
    }
    console.log(`Grid solved in ${pass} swaps.`);
}

/* --- 4. PERSISTANCE (CORRIGÉE : LOADWALLET / SAVEWALLET) --- */
// C'est ICI que ça bloquait. Maintenant on utilise les bons noms.

function loadWallet() {
    // On utilise 'topdog_wallet' pour être synchro avec l'Index et la Boutique
    let saved = localStorage.getItem('topdog_wallet');
    return saved ? parseInt(saved) : 0;
}

function saveWallet(amount) {
    localStorage.setItem('topdog_wallet', amount);
}

// Fonction pour payer le gagnant (nécessaire pour Logic.js)
function payoutWinner(winningDogId) {
    let winner = gameState.dogs.find(d => d.id === winningDogId);
    if(winner) {
        console.log("💰 VICTOIRE ! Gain pour", winner.name, ":", winner.bet);
        // On ne sauvegarde pas ici, c'est UI.js qui gère l'animation et la sauvegarde finale
        // Mais on prépare le terrain.
        return winner.bet;
    }
    return 0;
}

/* --- 5. INITIALISATION --- */
function initGameEngine() {
    console.log("%c --- TOPDOG V25 (SYNC WALLET) --- ", "background: #fff; color: #000; font-size:16px; font-weight:bold;");
    
    gameState.dogs = [];
    
    // IMPORTANT : On charge avec la nouvelle fonction !
    gameState.bankroll = loadWallet();
    
    gameState.gravityBag = []; 
    for(let i=1; i<=8; i++) for(let k=0; k<5; k++) gameState.gravityBag.push(i);
    gameState.gravityBag.sort(() => Math.random() - 0.5);

    let usedNames = [];
    const misesPossibles = [500, 1000, 2500, 5000, 7500, 75000, 80000, 10000, 25000, 50000, 100000, 150000];

   // --- NOUVEAU SYSTÈME DE NOMS ALÉATOIRES (MÉLANGEUR) ---
    
    // 1. On mélange la liste complète des 60 noms
    let nomsMelanges = [...CONFIG.dogNames].sort(() => 0.5 - Math.random());

    // 2. On génère les 4 Chiens de la partie (Boucle remise à 4 !)
    for(let i=1; i<=4; i++) {
        
        // On choisit une mise au hasard
        let bet = misesPossibles[Math.floor(Math.random() * misesPossibles.length)];
        
        gameState.dogs.push({ 
            id: i, 
            name: nomsMelanges[i-1], // On prend les 4 premiers du paquet mélangé
            bet: bet 
        });
    }

    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    let startCols = Math.random() > 0.5 ? [0, 2, 4, 6] : [1, 3, 5, 7];
    gameState.dogs.forEach((dog, i) => {
        let c = startCols[i]; let r = Math.floor(Math.random() * 2); 
        newGrid[r][c] = { val: 9, dogId: dog.id };
    });

    let deck = createPerfectDeck();
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(!newGrid[r][c] || newGrid[r][c] === 0) {
                let val = deck.pop(); newGrid[r][c] = { val: val, dogId: null };
            }
        }
    }

    solveGridBySwapping(newGrid);
    gameState.grid = newGrid;
    injectStrategicKeys();
    gameState.shuffleLeft = 1; gameState.status = 'playing'; gameState.timeLeft = CONFIG.timeLimit;
    
    return gameState;
}

/* --- 6. LOGIQUE JEU (Standard) --- */
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

function pickForGravity(r, c, grid) {
    if(gameState.gravityBag.length < 5) {
         for(let i=1; i<=8; i++) for(let k=0; k<5; k++) gameState.gravityBag.push(i);
         gameState.gravityBag.sort(() => Math.random() - 0.5);
    }
    let forbidden = new Set();
    let n = [getSafeVal(r-1, c, grid), getSafeVal(r+1, c, grid), getSafeVal(r, c-1, grid), getSafeVal(r, c+1, grid)];
    n.forEach(v => { if(v) forbidden.add(v); });
    let idx = -1;
    for(let i=0; i<Math.min(gameState.gravityBag.length, 20); i++) {
        if(!forbidden.has(gameState.gravityBag[i])) { idx = i; break; }
    }
    if(idx !== -1) return gameState.gravityBag.splice(idx, 1)[0];
    let val = gameState.gravityBag.shift();
    if(forbidden.has(val)) {
        let candidates = [1,2,3,4,5,6,7,8].filter(x => !forbidden.has(x));
        if(candidates.length > 0) val = candidates[Math.floor(Math.random()*candidates.length)];
    }
    return val;
}

function applyGravityLogic() {
    for(let c=0; c<8; c++) {
        let colItems = [];
        for(let r=0; r<8; r++) if(gameState.grid[r][c].val !== 0) colItems.push({...gameState.grid[r][c]});
        let missing = 8 - colItems.length;
        let newItems = [];
        for(let i=0; i<missing; i++) newItems.unshift({ val: -1, dogId: null });
        colItems = newItems.concat(colItems);
        for(let r=0; r<8; r++) gameState.grid[r][c] = colItems[r];
    }
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(gameState.grid[r][c].val === -1) {
                gameState.grid[r][c].val = pickForGravity(r, c, gameState.grid);
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

function shuffleBoardLogic() {
    console.log("--- BRASSAGE V25 ---");
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;
    let dogs = [];
    let deck = createPerfectDeck(); 
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) { if(gameState.grid[r][c].val === 9) dogs.push(gameState.grid[r][c]); }
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    let possibleSets = [[0, 2, 4, 6], [1, 3, 5, 7], [0, 2, 5, 7]];
    let chosenCols = possibleSets[Math.floor(Math.random() * possibleSets.length)];
    chosenCols.sort(() => Math.random() - 0.5);
    let dogMap = {};
    dogs.forEach((dog, i) => { dogMap[chosenCols[i]] = dog; });
    for(let c=0; c<8; c++) { if(dogMap[c]) { let r = Math.floor(Math.random() * 2); newGrid[r][c] = dogMap[c]; } }
    for(let r=0; r<8; r++) { for(let c=0; c<8; c++) { if(!newGrid[r][c] || newGrid[r][c] === 0) { let val = deck.pop(); if(val === undefined) val = Math.floor(Math.random()*8)+1; newGrid[r][c] = { val: val, dogId: null }; } } }
    solveGridBySwapping(newGrid);
    gameState.grid = newGrid;
    injectStrategicKeys();
    return true;
}
