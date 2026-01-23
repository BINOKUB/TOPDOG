/* =========================================
   TOPDOG COSMETICS MANAGER
   Gère l'apparence, les skins et les meutes.
   ========================================= */

const Cosmetics = {
    // Charge tout au démarrage
    init: function() {
        console.log("💄 COSMETICS: Initialisation...");
        this.applyActiveSkin();
        this.applyActiveDog();
        
        // Écouteur pour la synchro automatique
        window.addEventListener('focus', () => {
            this.checkSync();
        });
    },

    // Applique le Skin (CSS)
    applyActiveSkin: function() {
        const activeId = localStorage.getItem('topdog_active_bg') || 'bg_default';
        const linkEl = document.getElementById('skin-stylesheet');
        const skinItem = CATALOG.skins.find(s => s.id === activeId);
        
        if (skinItem && skinItem.file) {
            if (!linkEl.href.includes(skinItem.file.split('?')[0])) {
                linkEl.href = skinItem.file;
            }
        } else {
            linkEl.href = ""; // Retour au défaut
        }
    },

    // Applique le Chien (Emoji) - VERSION FORCÉE AVEC !IMPORTANT
    applyActiveDog: function() {
        const activeId = localStorage.getItem('topdog_active_dog') || 'dog_default';
        console.log("🐕 COSMETICS: Chien actif ->", activeId);
        
        const dogItem = CATALOG.dogs.find(d => d.id === activeId);
        const emoji = dogItem ? dogItem.emoji : '🐶';

        let style = document.getElementById('dog-pack-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'dog-pack-style';
            document.head.appendChild(style);
        }
        
        // CSS "NUCLÉAIRE" : On cible #game-grid pour être prioritaire
        style.innerHTML = `
            #game-grid .tile.nine::before { 
                content: '${emoji}' !important; 
                background: none !important;
                visibility: visible !important;
                opacity: 1 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 1.6em !important; 
                width: 100% !important;
                height: 100% !important;
            }
            /* Cache l'ancien texte/contenu */
            #game-grid .tile.nine { color: transparent !important; }
            /* Rend l'émoji visible */
            #game-grid .tile.nine::before { color: #fff !important; text-shadow: none !important; }
        `;
    },

    // Vérifie si quelque chose a changé
    checkSync: function() {
        this.applyActiveSkin();
        this.applyActiveDog();
        if(typeof gameState !== 'undefined' && typeof updateHUD === 'function') {
            const savedMoney = parseInt(localStorage.getItem('topdog_wallet')) || 0;
            if(savedMoney !== gameState.bankroll) {
                gameState.bankroll = savedMoney;
                updateHUD();
            }
        }
    }
};

// Lancement
document.addEventListener('DOMContentLoaded', () => {
    if(typeof CATALOG !== 'undefined') Cosmetics.init();
});

