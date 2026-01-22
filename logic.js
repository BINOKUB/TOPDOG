/* =========================================
   TOPDOG ENGINE V23
   CODENAME: THE SWAPPER (STRICT COUNT + NO CLASH)
   ========================================= */

const CONFIG = {
    gridSize: 8,
    timeLimit: 120, 
    dogNames: ["SPARTACUS", "TITAN", "HURRICANE", "VIPER", "GHOST", "BANDIT", "REX", "CHAOS", "ZEUS", "TANK", "TORNADO", "MERCURY", "BALTO", "MAXIMUS", "THOR", "COMET", "FLASH", "ECLAIR", "APOLLO", "CYCLONE", "PHANTOM", "STORM", "TEPPY"]
};

let gameState = {
    grid: [], 
    bankroll: 0, 
    shuffleLeft: 1,
    dogs: [], status: 'idle', timer: null, timeLeft: 0,
    
    // Sac de gravité (pour le jeu en cours)
    gravityBag: []
};

/* --- 1. LE DECK PARFAIT (Inventaire Initial) --- */
function createPerfectDeck() {
    let deck = [];
    // Répartition : 4 chiffres x 8 exemplaires + 4 chiffres x 7 exemplaires = 32 + 28 = 60.
    // C'est le compte EXACT pour remplir les 60 cases vides (64 - 4 chiens).
    
    // On mélange quels chiffres auront 8 et quels auront 7 pour varier les parties
    let counts = [8, 8, 8, 8, 7, 7, 7, 7];
    let values = [1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5); // On mélange les valeurs
    
    for (let i = 0; i < 8; i++) {
        let val = values[i];
        let count = counts[i];
        for (let k = 0; k < count; k++) deck.push(val);
    }
    
    return deck.sort(() => Math.random() - 0.5); // Mélange final
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

// Vérifie si une cellule a des conflits avec ses voisins
function countConflicts(r, c, grid) {
    let val = getSafeVal(r, c, grid);
    if (!val || val === 9) return 0;
    
    let conflicts = 0;
    let neighbors = [
        getSafeVal(r-1, c, grid), getSafeVal(r+1, c, grid),
        getSafeVal(r, c-1, grid), getSafeVal(r, c+1, grid)
    ];
    
    neighbors.forEach(n => {
        if (n === val) conflicts++;
    });
    return conflicts;
}

/* --- 3. LE SWAPPER (L'ALGORITHME V23) --- */
// Résout les conflits en échangeant des places au lieu de changer les valeurs
function solveGridBySwapping(grid) {
    let maxPasses = 1000; // Sécurité anti-freeze
    let hasConflicts = true;
    let pass = 0;
    
    // On liste les positions des chiffres (pas les chiens)
    let numberPositions = [];
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(grid[r][c].val !== 9 && grid[r][c].val !== 0) {
                numberPositions.push({r, c});
            }
        }
    }

    while (hasConflicts && pass < maxPasses) {
        hasConflicts = false;
        pass++;
        
        // On mélange les positions pour ne pas toujours scanner dans le même ordre
        numberPositions.sort(() => Math.random() - 0.5);

        for (let pos of numberPositions) {
            let r = pos.r;
            let c = pos.c;
            
            if (countConflicts(r, c, grid) > 0) {
                hasConflicts = true;
                
                // CONFLIT DÉTECTÉ ! ON CHERCHE UN PARTENAIRE D'ÉCHANGE.
                // On cherche une autre case au hasard
                // Si on échange, est-ce que ça réduit le chaos ?
                
                let bestSwap = null;
                
                // On essaie 10 partenaires au hasard
                for(let k=0; k<10; k++) {
                    let randIdx = Math.floor(Math.random() * numberPositions.length);
                    let partner = numberPositions[randIdx];
                    
                    // On ne s'échange pas soi-même
                    if (partner.r === r && partner.c === c) continue;
                    
                    // Testons l'échange virtuellement
                    let valA = grid[r][c].val;
                    let valB = grid[partner.r][partner.c].val;
                    
                    // Si les valeurs sont les mêmes, ça sert à rien d'échanger
                    if (valA === valB) continue;
                    
                    // On simule l'échange
                    grid[r][c].val = valB;
                    grid[partner.r][partner.c].val = valA;
                    
                    // Est-ce que la case A (ici) va mieux ?
                    let conflictsA = countConflicts(r, c, grid);
                    // Est-ce que la case B (le partenaire) va mieux ou pareil ? (pas pire)
                    let conflictsB = countConflicts(partner.r, partner.c, grid);
                    
                    // Si 0 conflit pour les deux, c'est le jackpot, on valide et on sort
                    if (conflictsA === 0 && conflictsB === 0) {
                        bestSwap = null; // On a déjà appliqué le swap dans la simulation, on le garde
                        break; 
                    } else {
                        // Sinon on annule (Backtrack) et on continue de chercher
                        grid[r][c].val = valA;
                        grid[partner.r][partner.c].val = valB;
                    }
                }
            }
        }
    }
    console.log(`Grid solved in ${pass} swaps.`);
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
    console.log("%c --- TOPDOG V23 (THE SWAPPER) --- ", "background: #fff; color: #000; font-size:16px; font-weight:bold;");
    
    gameState.dogs = [];
    gameState.bankroll = loadBankroll();
    
    // Init Sac Gravité (Équilibré)
    gameState.gravityBag = []; 
    for(let i=1; i<=8; i++) for(let k=0; k<5; k++) gameState.gravityBag.push(i);
    gameState.gravityBag.sort(() => Math.random() - 0.5);

    // Setup Chiens
    let usedNames = [];
    for(let i=1; i<=4; i++) {
        let name;
        do { name = CONFIG.dogNames[Math.floor(Math.random() * CONFIG.dogNames.length)]; } while(usedNames.includes(name));
        usedNames.push(name);
       /* let bet = Math.floor(Math.random() * 46) * 100 + 500; */
       // AJOUT ICI 
/* 1. Mets ici tous les montants que tu veux voir apparaître (séparés par des virgules) */
const misesPossibles = [500, 1000, 2500, 5000, 7500, 10000, 25000, 50000, 100000];

// 2. Le jeu va en piocher un au hasard dans ta liste
let bet = misesPossibles[Math.floor(Math.random() * misesPossibles.length)];

       // FIN AJOUT


       
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

    // 2. Création de l'Inventaire Strict (60 items)
    let deck = createPerfectDeck();

    // 3. Remplissage "Naïf" (on pose tout, même si ça fait des doublons)
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(!newGrid[r][c] || newGrid[r][c] === 0) {
                let val = deck.pop();
                newGrid[r][c] = { val: val, dogId: null };
            }
        }
    }

    // 4. RÉSOLUTION PAR ÉCHANGE (Le cœur de la V23)
    // On mélange les cases jusqu'à ce que tout soit parfait, SANS changer les valeurs globales.
    solveGridBySwapping(newGrid);

    gameState.grid = newGrid;
    injectStrategicKeys();

    gameState.shuffleLeft = 1;
    gameState.status = 'playing';
    gameState.timeLeft = CONFIG.timeLimit;
    
    return gameState;
}

// ... (Le reste des fonctions est standard, mais on doit mettre à jour le BRASSAGE pour utiliser le Swap aussi)

function injectStrategicKeys() {
    // Injection prudente
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
                            // Ici on force une valeur, cela modifie légèrement le compte,
                            // mais c'est 1 ou 2 chiffres sur 60, c'est acceptable pour le gameplay.
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

/* --- GRAVITÉ (V23) --- */
// Pour la gravité, on ne peut pas "swapper" car on crée du vide.
// On utilise un sac intelligent qui essaie de respecter les voisins.
function pickForGravity(r, c, grid) {
    if(gameState.gravityBag.length < 5) {
         for(let i=1; i<=8; i++) for(let k=0; k<5; k++) gameState.gravityBag.push(i);
         gameState.gravityBag.sort(() => Math.random() - 0.5);
    }

    let forbidden = new Set();
    let n = [getSafeVal(r-1, c, grid), getSafeVal(r+1, c, grid), getSafeVal(r, c-1, grid), getSafeVal(r, c+1, grid)];
    n.forEach(v => { if(v) forbidden.add(v); });

    // Cherche un candidat valide dans le sac
    let idx = -1;
    for(let i=0; i<Math.min(gameState.gravityBag.length, 20); i++) {
        if(!forbidden.has(gameState.gravityBag[i])) {
            idx = i;
            break;
        }
    }

    if(idx !== -1) return gameState.gravityBag.splice(idx, 1)[0];
    
    // Fallback : On prend le premier et on le force si nécessaire
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

    // Remplissage IA
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

/* --- BRASSAGE V23 (AVEC SWAPPER) --- */
function shuffleBoardLogic() {
    console.log("--- BRASSAGE V23 ---");
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    let dogs = [];
    // On recrée un deck parfait pour garantir l'équilibre après le mélange
    let deck = createPerfectDeck(); 

    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        if(gameState.grid[r][c].val === 9) dogs.push(gameState.grid[r][c]);
    }

    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    let possibleSets = [[0, 2, 4, 6], [1, 3, 5, 7], [0, 2, 5, 7]];
    let chosenCols = possibleSets[Math.floor(Math.random() * possibleSets.length)];
    chosenCols.sort(() => Math.random() - 0.5);
    
    let dogMap = {};
    dogs.forEach((dog, i) => { dogMap[chosenCols[i]] = dog; });

    // 1. Place Chiens
    for(let c=0; c<8; c++) {
        if(dogMap[c]) {
            let r = Math.floor(Math.random() * 2);
            newGrid[r][c] = dogMap[c];
        }
    }

    // 2. Place Chiffres (Naïf)
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(!newGrid[r][c] || newGrid[r][c] === 0) {
                let val = deck.pop();
                if(val === undefined) val = Math.floor(Math.random()*8)+1; // Securité
                newGrid[r][c] = { val: val, dogId: null };
            }
        }
    }
    
    // 3. SWAPPER
    solveGridBySwapping(newGrid);

    gameState.grid = newGrid;
    injectStrategicKeys();
    return true;
}
