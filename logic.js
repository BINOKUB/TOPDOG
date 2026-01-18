/* --- CONFIGURATION DU JEU --- */
const CONFIG = {
    gridSize: 8,
    initialReserve: 40,
    timeLimit: 120, // secondes
    dogNames: ["SPARTACUS", "TITAN", "HURRICANE", "VIPER", "GHOST", "BANDIT", "REX", "CHAOS", "ZEUS", "TANK"]
};

/* --- ÉTAT DU JEU (STATE) --- */
let gameState = {
    grid: [],           // La grille 8x8
    score: 0,
    reserve: 0,
    shuffleLeft: 1,
    dogs: [],           // Liste des 4 chiens actifs avec leurs mises
    status: 'idle',     // 'playing', 'won', 'lost', 'processing'
    timer: null,
    timeLeft: 0,
    reserveQueue: []    // La file d'attente des chiffres qui tombent
};

/* --- FONCTIONS PRINCIPALES DU MOTEUR --- */

function initGameEngine() {
    // 1. Préparer les chiens et les mises
    gameState.dogs = [];
    let usedNames = [];
    for(let i=1; i<=4; i++) {
        let name;
        do { name = CONFIG.dogNames[Math.floor(Math.random() * CONFIG.dogNames.length)]; } 
        while(usedNames.includes(name));
        usedNames.push(name);
        
        let bet = Math.floor(Math.random() * 46) * 100 + 500; // Entre $500 et $5000
        gameState.dogs.push({ id: i, name: name, bet: bet });
    }

    // 2. Générer la grille (Niveau gagnable)
    // On place 4 chiens aléatoirement sur les 3 premières lignes (pour ne pas gagner tout de suite)
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    let dogPositions = [];
    while(dogPositions.length < 4) {
        let c = Math.floor(Math.random() * 8);
        if(!dogPositions.includes(c)) dogPositions.push(c);
    }
    
    // Placer les chiens (Valeur 9)
    let dogIndex = 0;
    dogPositions.forEach(col => {
        let row = Math.floor(Math.random() * 3); // Lignes 0, 1 ou 2 seulement
        newGrid[row][col] = { val: 9, dogId: gameState.dogs[dogIndex].id };
        dogIndex++;
    });

    // Remplir le reste avec des chiffres 1-8
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(!newGrid[r][c]) {
                newGrid[r][c] = { val: Math.floor(Math.random()*8)+1, dogId: null };
            }
        }
    }

    // 3. Initialiser l'état
    gameState.grid = newGrid;
    gameState.score = 0;
    gameState.reserve = CONFIG.initialReserve;
    gameState.shuffleLeft = 1;
    gameState.status = 'playing';
    gameState.timeLeft = CONFIG.timeLimit;
    
    // Générer une file d'attente de réserve
    gameState.reserveQueue = [];
    for(let i=0; i<60; i++) gameState.reserveQueue.push(Math.floor(Math.random()*8)+1);

    return gameState;
}

function checkMoveValidity(r1, c1, r2, c2) {
    // Logique de connexion (Voisins ou ligne de vue)
    let dr = Math.abs(r1 - r2);
    let dc = Math.abs(c1 - c2);

    // Adjacents (Diagonales incluses)
    if(dr <= 1 && dc <= 1) return true;

    // Ligne de vue (Même ligne/colonne/diag sans obstacles)
    let stepR = 0, stepC = 0;
    if(r1 === r2) stepC = (c2 > c1) ? 1 : -1;
    else if(c1 === c2) stepR = (r2 > r1) ? 1 : -1;
    else if(dr === dc) {
        stepR = (r2 > r1) ? 1 : -1;
        stepC = (c2 > c1) ? 1 : -1;
    } else {
        return false; // Pas alignés
    }

    let cr = r1 + stepR, cc = c1 + stepC;
    while(cr !== r2 || cc !== c2) {
        if(gameState.grid[cr][cc].val !== 0) return false; // Obstacle
        cr += stepR; cc += stepC;
    }
    return true;
}

function processMatch(r1, c1, r2, c2) {
    // Vide les cases
    gameState.grid[r1][c1].val = 0; 
    gameState.grid[r1][c1].dogId = null;
    gameState.grid[r2][c2].val = 0;
    gameState.grid[r2][c2].dogId = null;
    return true;
}

function applyGravityLogic() {
    // Gravité : Les éléments tombent, on remplit par le haut
    for(let c=0; c<8; c++) {
        let colItems = [];
        // Récupérer ce qui n'est pas vide (0)
        for(let r=0; r<8; r++) {
            if(gameState.grid[r][c].val !== 0) colItems.push(gameState.grid[r][c]);
        }
        
        // Remplir le vide au dessus avec la réserve
        while(colItems.length < 8) {
            let newVal = 0;
            let newDog = null;
            if(gameState.reserve > 0) {
                gameState.reserve--;
                newVal = gameState.reserveQueue.shift() || Math.floor(Math.random()*8)+1;
            }
            // Ajouter au début (Haut)
            colItems.unshift({ val: newVal, dogId: newDog });
        }
        
        // Réappliquer à la colonne
        for(let r=0; r<8; r++) {
            gameState.grid[r][c] = colItems[r];
        }
    }
}

function checkWinCondition() {
    // Vérifier la dernière ligne (index 7) pour un chien (9)
    for(let c=0; c<8; c++) {
        let cell = gameState.grid[7][c]; // Ligne du bas
        if(cell.val === 9) {
            gameState.status = 'won';
            return { won: true, dogId: cell.dogId };
        }
    }
    return { won: false };
}

/* --- LE CORRECTIF DU BRASSAGE --- */
function shuffleBoardLogic() {
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    // 1. Collecter tous les éléments non vides
    let items = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        if(gameState.grid[r][c].val !== 0) {
            items.push(gameState.grid[r][c]);
        }
    }

    // 2. Mélanger (Fisher-Yates)
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }

    // 3. Redistribuer avec SÉCURITÉ
    // Règle : AUCUN chien (9) ne doit atterrir sur la ligne 7 (Indice 7)
    
    // On sépare les chiens des autres
    let dogs = items.filter(i => i.val === 9);
    let others = items.filter(i => i.val !== 9);
    
    // On remplit la grille
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    let cellCoords = [];
    
    // Créer liste de toutes les coords possibles
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) cellCoords.push({r,c});

    // A. PLACER LES CHIENS D'ABORD (Sécurisé)
    dogs.forEach(dog => {
        // Choisir une coordonnée aléatoire qui N'EST PAS sur la ligne 7
        let safeCoords = cellCoords.filter(coord => coord.r < 7);
        // Si par miracle la grille est si pleine qu'il n'y a pas de place safe (rare), on prend n'importe quoi
        if(safeCoords.length === 0) safeCoords = cellCoords;

        let idx = Math.floor(Math.random() * safeCoords.length);
        let pos = safeCoords[idx];
        
        newGrid[pos.r][pos.c] = dog;
        
        // Retirer cette coord de la liste des dispos
        cellCoords = cellCoords.filter(c => c.r !== pos.r || c.c !== pos.c);
    });

    // B. PLACER LE RESTE (Les chiffres)
    others.forEach(item => {
        if(cellCoords.length > 0) {
            let idx = Math.floor(Math.random() * cellCoords.length);
            let pos = cellCoords[idx];
            newGrid[pos.r][pos.c] = item;
            cellCoords.splice(idx, 1);
        }
    });

    // Si on avait moins d'items que de cases, le reste reste à 0 (vide)
    gameState.grid = newGrid;
    return true;
}
