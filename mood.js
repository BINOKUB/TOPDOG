/* =========================================
   TOPDOG MOOD ENGINE - V1.0
   Gère la dilapidation des milliards.
   ========================================= */

let wallet = parseInt(localStorage.getItem('topdog_wallet')) || 0;

// Niveaux actuels (Initialisation)
let levels = {
    green: parseFloat(localStorage.getItem('topdog_mood_green')) || 1,
    orange: parseFloat(localStorage.getItem('topdog_mood_orange')) || -1,
    red: parseFloat(localStorage.getItem('topdog_mood_red')) || -10
};

// --- CONFIGURATION DES COÛTS ---
const COSTS = {
    green: 100000000000, // 100 Milliards par niveau
    orange: 100000,      // 100 k par niveau
    red: 100             // 100 $ par niveau
};

function updateUI() {
    // Portefeuille (Formatage Court)
    let display = wallet;
    if (wallet >= 1000000000) display = (wallet / 1000000000).toFixed(1) + ' G';
    else if (wallet >= 1000000) display = (wallet / 1000000).toFixed(1) + ' M';
    document.getElementById('wallet-display').innerText = display + " $";

    // Thermomètres
    document.getElementById('val-green').innerText = levels.green.toFixed(1);
    document.getElementById('fill-green').style.height = (levels.green * 10) + "%";

    document.getElementById('val-orange').innerText = levels.orange.toFixed(1);
    document.getElementById('fill-orange').style.height = (Math.abs(levels.orange) * 10) + "%";

    document.getElementById('val-red').innerText = levels.red.toFixed(1);
    // On mappe -10 à -20 sur une barre de 0 à 100%
    let redPercent = (Math.abs(levels.red) - 10) * 10;
    document.getElementById('fill-red').style.height = redPercent + "%";

    saveAll();
}

function invest(type) {
    let cost = 0;
    let nextLevel = 0;
    let desc = document.getElementById('mood-desc');

    // 1. Vérification du plafond avant tout calcul
    if (type === 'green' && levels.green >= 10) {
        desc.innerText = "Niveau de ZEN maximum atteint. Vous êtes en paix.";
        return;
    }
    if (type === 'orange' && levels.orange <= -10) {
        desc.innerText = "Tristesse absolue atteinte. Impossible de descendre plus bas.";
        return;
    }
    if (type === 'red' && levels.red <= -20) {
        desc.innerText = "Rage totale atteinte. Le thermomètre explose !";
        return;
    }

    // 2. Calcul des coûts si le plafond n'est pas atteint
    if (type === 'green') {
        cost = levels.green * COSTS.green;
        nextLevel = 0.1;
    } else if (type === 'orange') {
        cost = Math.abs(levels.orange) * COSTS.orange;
        nextLevel = -0.5;
    } else if (type === 'red') {
        cost = Math.abs(levels.red) * COSTS.red;
        nextLevel = -1.0;
    }

    // 3. Tentative d'achat
    if (wallet >= cost) {
        wallet -= cost;
        levels[type] += nextLevel;
        
        // Bornage de sécurité
        if (levels.green > 10) levels.green = 10;
        if (levels.orange < -10) levels.orange = -10;
        if (levels.red < -20) levels.red = -20;

        desc.innerText = `Investissement réussi : -$${cost.toLocaleString()}`;
        updateUI();
    } else {
        desc.innerText = "Fonds insuffisants pour cet état d'esprit.";
    }
}



function saveAll() {
    localStorage.setItem('topdog_wallet', wallet);
    localStorage.setItem('topdog_mood_green', levels.green);
    localStorage.setItem('topdog_mood_orange', levels.orange);
    localStorage.setItem('topdog_mood_red', levels.red);
}

// --- LE DRAIN DE BONHEUR (S'évapore au fil du temps) ---
setInterval(() => {
    if (levels.green > 1) {
        levels.green -= 0.01;
        updateUI();
    }
}, 60000); // Perd un peu chaque minute

updateUI();
