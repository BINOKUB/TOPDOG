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

/* --- SYSTÈME DE GÉNÉRATION GÉOMÉTRIQUE (LE COEUR DE LA V18) --- */

// Crée un sac de chiffres équilibré
function createRandomBag() {
    let bag = [];
    for(let i=1; i<=8; i++) for(let j=0; j<5; j++) bag.push(i);
    return bag.sort(() => Math.random() - 0.5);
}

// Fonction magique : Trouve un chiffre dans la file qui n'est PAS dans les interdits
function pickValidNumber(forbiddenValues, queue) {
    // Si la file est vide ou presque, on la remplit
    if (queue.length < 10) {
        queue.push(...createRandomBag());
    }

    // 1. On cherche le premier candidat valide dans la file
    let foundIndex = -1;
    // On regarde les 20 prochains chiffres pour garder l'équilibre du sac
    for(let i=0; i<Math.min(queue.length, 20); i++) {
        if (!forbiddenValues.includes(queue[i])) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex !== -1) {
        // On a trouvé un chiffre qui respecte les règles ! On le prend.
        return queue.splice(foundIndex, 1)[0];
    }

    // 2. Cas de Secours (Si le sac est malchanceux)
    // On génère un chiffre aléatoire qui n'est pas interdit
    let candidates = [1,2,3,4,5,6,7,8].filter(n => !forbiddenValues.includes(n));
    
    if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
    } else {
        // Impossible mathématiquement (on ne peut pas être entouré de 8 chiffres différents sur une grille carrée)
        return Math.floor(Math.random() * 8) + 1;
    }
}

/* --- SAUVEGARDE --- */
function loadBankroll() {
    let saved = localStorage.getItem('topdog_bankroll');
    return saved ? parseInt(saved) : 0;
}
function saveBankroll(amount) {
    localStorage.setItem('topdog_bankroll', amount);
}

/* --- MOTEUR --- */
function initGameEngine() {
    console.log("%c --- TOPDOG V18 (GRIDLOCK GEOMETRY) --- ", "background: #000; color: #00ff00; font-size:20px; font-weight:bold;");
    
    gameState.dogs = [];
    gameState.bankroll = loadBankroll();
    gameState.reserveQueue = createRandomBag().concat(createRandomBag()); // Double sac

    let usedNames = [];
    for(let i=1; i<=4; i++) {
        let name;
        do { name = CONFIG.dogNames[Math.floor(Math.random() * CONFIG.dogNames.length)]; } while(usedNames.includes(name));
        usedNames.push(name);
        let bet = Math.floor(Math.random() * 46) * 100 + 500;
        gameState.dogs.push({ id: i, name: name, bet: bet });
    }

    // Création de la grille vide
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    
    // 1. Placement des Chiens
    let startCols = Math.random() > 0.5 ? [0, 2, 4, 6] : [1, 3, 5, 7];
    gameState.dogs.forEach((dog, i) => {
        let c = startCols[i];
        let r = Math.floor(Math.random() * 2); 
        newGrid[r][c] = { val: 9, dogId: dog.id };
    });

    // 2. Remplissage Intelligent (Case par case)
    for(let c=0; c<8; c++) {
        for(let r=0; r<8; r++) {
            // Si la case est vide
            if(!newGrid[r][c] || newGrid[r][c] === 0) {
                
                // LISTE DES INTERDITS (Voisins existants)
                let forbidden = [];
                
                // Voisin du HAUT (r-1)
                if (r > 0 && newGrid[r-1][c].val !== 0 && newGrid[r-1][c].val !== 9) forbidden.push(newGrid[r-1][c].val);
                // Voisin du BAS (r+1) - (Rare au démarrage mais possible si chien)
                if (r < 7 && newGrid[r+1][c] && newGrid[r+1][c].val !== 0 && newGrid[r+1][c].val !== 9) forbidden.push(newGrid[r+1][c].val);
                // Voisin de GAUCHE (c-1)
                if (c > 0 && newGrid[r][c-1].val !== 0 && newGrid[r][c-1].val !== 9) forbidden.push(newGrid[r][c-1].val);
                // Voisin de DROITE (c+1) - (Rare au démarrage)
                if (c < 7 && newGrid[r][c+1] && newGrid[r][c+1].val !== 0 && newGrid[r][c+1].val !== 9) forbidden.push(newGrid[r][c+1].val);

                // On pioche un chiffre qui n'est PAS interdit
                let num = pickValidNumber(forbidden, gameState.reserveQueue);
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
                    // On vérifie si la clé existe déjà autour
                    if(c > 0 && gameState.grid[r+1][c-1].val === needed) hasKey = true;
                    if(c < 7 && gameState.grid[r+1][c+1].val === needed) hasKey = true;
                    if(r < 6 && gameState.grid[r+2][c].val === needed) hasKey = true;
                    
                    if(!hasKey) {
                        // Injection forcée
                        let neighbors = [];
                        if(c > 0 && gameState.grid[r+1][c-1].val !== 9) neighbors.push({r: r+1, c: c-1});
                        if(c < 7 && gameState.grid[r+1][c+1].val !== 9) neighbors.push({r: r+1, c: c+1});
                        
                        if(neighbors.length > 0) {
                            let target = neighbors[Math.floor(Math.random() * neighbors.length)];
                            // IMPORTANT : On change la valeur, mais on doit vérifier qu'on ne crée pas de doublon
                            // (Pour la clé stratégique, on accepte un petit risque de doublon temporaire pour favoriser le gameplay,
                            // ou on pourrait raffiner, mais la priorité est de débloquer le chien).
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

/* --- GRAVITÉ V18 : LE NETTOYEUR --- */
function applyGravityLogic() {
    // 1. Faire tomber les éléments existants
    for(let c=0; c<8; c++) {
        let colItems = [];
        for(let r=0; r<8; r++) {
            if(gameState.grid[r][c].val !== 0) {
                colItems.push({...gameState.grid[r][c]});
            }
        }
        
        // 2. Remplir le vide au sommet
        // On remplit du BAS vers le HAUT de la zone vide (pour vérifier le voisin du dessous)
        
        // Combien de trous à combler ?
        let missing = 8 - colItems.length;
        
        // On prépare les nouveaux items à ajouter
        let newItems = [];
        
        for(let i=0; i<missing; i++) {
            let newVal = 0;
            
            if(gameState.reserve > 0) {
                gameState.reserve--;
                
                // LISTE DES INTERDITS
                let forbidden = [];
                
                // 1. Interdit du DESSOUS (Le plus important pour la gravité)
                // Si c'est le premier item ajouté, son "dessous" est le premier item de colItems (sommet de la pile existante)
                // Si c'est le 2e item ajouté, son "dessous" est le 1er item qu'on vient de générer.
                let itemBelow = (i === 0) ? colItems[0] : newItems[0]; // newItems[0] car on unshift, donc le dernier généré est en haut
                
                // Attends, logique de tableau :
                // colItems contient [Bas, ..., Haut] ? Non, on a pushé r=0..7. Donc colItems[0] est en HAUT.
                // Donc colItems[0] est l'item sur lequel le nouveau va tomber.
                
                if (itemBelow && itemBelow.val !== 9) forbidden.push(itemBelow.val);

                // 2. Interdits LATERAUX (Gauche/Droite)
                // C'est plus dur car la gravité change les lignes.
                // On va essayer d'éviter les voisins de la ligne "cible" (row = missing - 1 - i)
                let targetRow = missing - 1 - i; 
                
                // Gauche
                if (c > 0 && gameState.grid[targetRow][c-1].val !== 0 && gameState.grid[targetRow][c-1].val !== 9) {
                    forbidden.push(gameState.grid[targetRow][c-1].val);
                }
                // Droite
                if (c < 7 && gameState.grid[targetRow][c+1].val !== 0 && gameState.grid[targetRow][c+1].val !== 9) {
                    forbidden.push(gameState.grid[targetRow][c+1].val);
                }

                newVal = pickValidNumber(forbidden, gameState.reserveQueue);
            }
            
            // On ajoute au DÉBUT de newItems (car on empile vers le haut)
            // Non, on veut construire la pile qui va au dessus.
            // newItems sera [ItemDuFondDuTrou, ..., ItemDuCiel]
            newItems.unshift({ val: newVal, dogId: null });
        }
        
        // On fusionne : [Nouveaux] + [Anciens]
        colItems = newItems.concat(colItems);

        // Appliquer à la grille
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

/* --- BRASSAGE V18 : RECONSTRUCTION TOTALE --- */
function shuffleBoardLogic() {
    console.log("--- BRASSAGE V18 ---");
    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    // On récupère tout le monde
    let dogs = [];
    let numbers = [];
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        if(gameState.grid[r][c].val === 9) dogs.push(gameState.grid[r][c]);
        else if (gameState.grid[r][c].val !== 0) numbers.push(gameState.grid[r][c].val); // On garde juste les valeurs
    }

    // On remet les nombres dans la file d'attente pour les recycler proprement
    gameState.reserveQueue = numbers.concat(gameState.reserveQueue);
    // On mélange la file
    gameState.reserveQueue.sort(() => Math.random() - 0.5);

    // Nouvelle Grille Vide
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));
    
    // 1. Placer les Chiens (Espacés)
    let possibleSets = [[0, 2, 4, 6], [1, 3, 5, 7], [0, 2, 5, 7]];
    let chosenCols = possibleSets[Math.floor(Math.random() * possibleSets.length)];
    chosenCols.sort(() => Math.random() - 0.5); // Mélange positions
    
    // On place les chiens sur des colonnes, mais haut (pour laisser de la place au jeu)
    // Disons Ligne 0 ou 1, supportés par des chiffres.
    
    // Pour simplifier le brassage et garantir zéro doublon, on va remplir la grille ligne par ligne
    // Et on insère les chiens aux endroits prévus.
    
    // Map pour savoir où vont les chiens : { colIndex: dogObj }
    let dogMap = {};
    dogs.forEach((dog, i) => {
        let targetCol = chosenCols[i];
        dogMap[targetCol] = dog;
    });

    // Remplissage case par case
    for(let c=0; c<8; c++) {
        let hasDog = dogMap[c] !== undefined;
        let dogRow = hasDog ? Math.floor(Math.random() * 2) : -1; // Chien en ligne 0 ou 1
        
        for(let r=0; r<8; r++) {
            // Est-ce la place du chien ?
            if (hasDog && r === dogRow) {
                newGrid[r][c] = dogMap[c];
            } else {
                // C'est un chiffre
                // LISTE INTERDITE
                let forbidden = [];
                // Haut
                if (r > 0 && newGrid[r-1][c].val !== 0 && newGrid[r-1][c].val !== 9) forbidden.push(newGrid[r-1][c].val);
                // Gauche
                if (c > 0 && newGrid[r][c-1].val !== 0 && newGrid[r][c-1].val !== 9) forbidden.push(newGrid[r][c-1].val);
                
                // On pioche
                let num = pickValidNumber(forbidden, gameState.reserveQueue);
                newGrid[r][c] = { val: num, dogId: null };
            }
        }
        
        // Petite correction : Si on a mis un chien, il faut s'assurer qu'il a au moins 2 chiffres SOUS lui
        // Avec notre boucle r=0->7, on a rempli dessous.
        // Mais si le chien est en r=7 (impossible ici car on a dit r=0 ou 1), ou r=6...
        // On a forcé r=0 ou 1, donc il y a plein de chiffres dessous. C'est bon.
    }

    gameState.grid = newGrid;
    injectStrategicKeys();
    return true;
}
