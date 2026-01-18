/* --- LE CORRECTIF DU BRASSAGE (V4 - AVEC TRACEUR) --- */
function shuffleBoardLogic() {
    console.log("--- BRASSAGE TACTIQUE ACTIVÉ (V4) ---"); // PREUVE QUE LE CODE EST À JOUR

    if(gameState.shuffleLeft <= 0) return false;
    gameState.shuffleLeft--;

    // 1. Collecter tous les éléments vivants
    let dogs = [];
    let numbers = [];

    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            let item = gameState.grid[r][c];
            if(item.val === 9) dogs.push(item);
            else if (item.val !== 0) numbers.push(item);
        }
    }

    // 2. Mélanger les listes
    const shuffleArray = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    };
    shuffleArray(dogs);
    shuffleArray(numbers);

    // 3. Préparer 8 colonnes vides
    let columns = Array(8).fill().map(() => []);

    // 4. RÉPARTITION INTELLIGENTE
    // A. On distribue les chiffres en premier (pour faire le socle)
    let colIndex = 0;
    numbers.forEach(num => {
        if(columns[colIndex].length < 7) { 
            columns[colIndex].push(num);
        }
        colIndex = (colIndex + 1) % 8; 
    });

    // B. On distribue les chiens (qu'on posera AU DESSUS des chiffres)
    // On trie les colonnes pour mettre les chiens sur les piles les plus hautes
    let bestColumns = [0,1,2,3,4,5,6,7].sort((a,b) => columns[b].length - columns[a].length);

    dogs.forEach((dog, i) => {
        let targetCol = bestColumns[i % 8];
        
        // SÉCURITÉ : Remplissage forcé si la colonne est trop vide
        // On veut MINIMUM 2 chiffres sous le chien pour éviter la victoire immédiate
        while(columns[targetCol].length < 2) { 
            let fillerVal = Math.floor(Math.random() * 8) + 1;
            // On insère le chiffre EN DESSOUS (au début du tableau colonne) pour faire tampon
            columns[targetCol].unshift({val: fillerVal, dogId: null});
        }

        // On pose le chien SUR la pile (à la fin du tableau)
        columns[targetCol].push(dog);
    });

    // 5. RECONSTRUIRE LA GRILLE
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));

    for(let c=0; c<8; c++) {
        let stack = columns[c]; 
        // On remplit la grille en partant du BAS (Ligne 7) avec le début du stack
        for(let i=0; i<stack.length; i++) {
            // Le stack est construit [BAS, ..., HAUT]
            // Donc item 0 va à la ligne 7
            let item = stack[i]; 
            let row = 7 - i;     
            if(row >= 0) {
                newGrid[row][c] = item;
            }
        }
    }

    gameState.grid = newGrid;
    return true;
}

    // 2. Mélanger les listes séparément
    const shuffleArray = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    };
    shuffleArray(dogs);
    shuffleArray(numbers);

    // 3. Reconstruire la grille (Mode "Gravité Compacte")
    // On efface tout d'abord
    let newGrid = Array(8).fill().map(() => Array(8).fill(0));

    // A. PLACER LES CHIENS (Priorité : HAUT DE L'ÉCRAN - Lignes 0, 1, 2)
    // On cherche des places libres aléatoires dans les lignes du haut
    let topSlots = [];
    for(let r=0; r<3; r++) { // Seulement lignes 0, 1, 2
        for(let c=0; c<8; c++) topSlots.push({r,c});
    }
    shuffleArray(topSlots); // Mélanger les positions possibles

    dogs.forEach(dog => {
        if(topSlots.length > 0) {
            let pos = topSlots.pop();
            newGrid[pos.r][pos.c] = dog;
        } else {
            // Sécurité si le haut est saturé (très rare), on met n'importe où sauf ligne 7
            // Mais avec 4 chiens et 24 places en haut, ça n'arrivera jamais.
        }
    });

    // B. PLACER LES CHIFFRES (On remplit le reste de bas en haut pour la stabilité)
    // On récupère toutes les cases vides restantes dans toute la grille
    let emptySlots = [];
    for(let r=0; r<7; r++) { // On évite STRICTEMENT la ligne 7 (Fin)
        for(let c=0; c<8; c++) {
            // Si la case est vide (pas de chien déjà posé)
            if(newGrid[r][c] === 0 || (typeof newGrid[r][c] === 'number' && newGrid[r][c] === 0)) {
                emptySlots.push({r,c});
            }
        }
    }
    
    // On remplit les cases vides avec les chiffres
    shuffleArray(emptySlots);
    
    numbers.forEach(num => {
        if(emptySlots.length > 0) {
            let pos = emptySlots.pop();
            newGrid[pos.r][pos.c] = num;
        }
    });

    // 4. Appliquer la nouvelle grille
    gameState.grid = newGrid;

    // Petite astuce : On force une "Gravité" immédiate pour tout tasser vers le bas proprement
    // ça évite d'avoir des chiffres qui flottent dans le vide
    applyGravityLogic();

    return true;
}

