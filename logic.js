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
    // PREUVE DE MISE A JOUR : Change le titre temporairement
    // Si tu ne vois pas ce log, le fichier est vieux
    console.log("%c --- TOPDOG V5 CHARGÉ --- ", "background: #222; color: #bada55; font-size:20px");
    
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

    // Setup Grille (Départ sécurisé : Chiens en haut)
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    let columns = [0, 2, 4, 6]; // On espace les chiens au départ
    
    // Placer les chiens Ligne 0 ou 1
    gameState.dogs.forEach((dog, i) => {
        let c = columns[i] !== undefined ? columns[i] : i; // Fallback
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
    gameState.score = 0;
    gameState.reserve = CONFIG.initialReserve;
    gameState.shuffleLeft = 1;
    gameState.status = 'playing';
    gameState.timeLeft = CONFIG.timeLimit;
    gameState.reserveQueue = Array(60).fill(0).map(() => Math.floor(Math.random()*8)+1);

    return gameState;
}

function checkMoveValidity(r1, c1, r2, c2) {
    let dr = Math.abs(r1 - r2), dc = Math.abs(c1 - c2);
    if(dr <= 1 && dc <= 1) return true; // Adjacents

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
        let cell = gameState.grid[7][c]; // Ligne du bas
        if(cell.val === 9) {
            gameState.status = 'won';
            return { won: true, dogId: cell.dogId };
        }
    }
    return { won: false };
}

/* --- LE BRASSAGE V5 (BUNKER LOGIC) --- */
function shuffleBoardLogic() {
    console.log("--- BRASSAGE V5 ACTIVÉ ---");
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

    // 4. Remplir avec les chiffres d'abord
    let colIdx = 0;
    numbers.forEach(num => {
        if(columns[colIdx].length < 7) columns[colIdx].push(num);
        colIdx = (colIdx + 1) % 8;
    });

    // 5. Placer les Chiens (1 PAR COLONNE MAX)
    // On choisit 4 colonnes distinctes qui sont les plus remplies (pour mettre les chiens haut)
    // On crée un tableau d'index [0,1,2...7], on le trie par taille de colonne, on prend les 4 premiers
    let bestCols = [0,1,2,3,4,5,6,7]
        .sort((a,b) => columns[b].length - columns[a].length)
        .slice(0, dogs.length); // On prend juste assez de colonnes pour les chiens
    
    // On mélange ces colonnes pour ne pas que le chien 1 aille toujours colonne 0
    shuffle(bestCols);

    dogs.forEach((dog, i) => {
        let targetCol = bestCols[i]; // Colonne unique garantie
        
        // SÉCURITÉ ANTI-WIN : Il faut au moins 3 items sous le chien
        while(columns[targetCol].length < 3) {
            let filler = Math.floor(Math.random() * 8) + 1;
            // On ajoute SOUS le chien (au début du tableau stack)
            columns[targetCol].unshift({val: filler, dogId: null});
        }
        // On pose le chien SUR le stack
        columns[targetCol].push(dog);
    });

    // 6. Reconstruction Grille (Bas vers Haut)
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    for(let c=0; c<8; c++) {
        let stack = columns[c];
        for(let i=0; i<stack.length; i++) {
            let row = 7 - i; // Index 0 = Ligne 7 (Fond)
            if(row >= 0) newGrid[row][c] = stack[i];
        }
    }

    gameState.grid = newGrid;
    return true;
}
