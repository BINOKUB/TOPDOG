/* =========================================
   CATALOGUE OFFICIEL TOPDOG (V2)
   Base de données centrale des objets.
   ========================================= */

const CATALOG = {
    // 1. LES SKINS (Fichiers CSS)
    skins: [
        { 
            id: 'bg_default', 
            name: 'Original Dark', 
            price: 0, 
            desc: "L'ambiance classique du TopDog.",
            color: '#333', 
            file: '' // Pas de fichier, c'est le défaut
        },
        { 
            id: 'bg_night', 
            name: 'Néon City', 
            price: 1000000, 
            desc: "Le premier signe de richesse. Course nocturne.",
            color: '#ff00ff', 
            file: 'skin-neon.css?v=999' 
        },
        { 
            id: 'bg_gold', 
            name: 'Luxe Doré', 
            price: 10000000, 
            desc: "Le statut ultime. Tout est en or massif.",
            color: '#ffd700', 
            file: 'skin-gold.css?v=2000' 
        },
        { 
            id: 'bg_cyber', 
            name: 'Cyber Matrix', 
            price: 25000000, 
            desc: "Interface futuriste pour l'élite technologique.",
            color: '#00ff00', 
            file: 'skin-cyber.css?v=3000' 
        },
        { 
            id: 'bg_diamond', 
            name: 'Diamant Pur', 
            price: 1000000000, 
            desc: "Seuls les dieux du pari peuvent se l'offrir.",
            color: '#00e5ff', 
            file: 'skin-diamond.css?v=1000' 
        }
    ],

    // 2. LES MEUTES (Emojis)
    dogs: [
        { 
            id: 'dog_default', 
            name: 'Chien Fidèle', 
            price: 0, 
            desc: "Ton meilleur ami depuis le début.",
            emoji: '🐶' 
        },
        { 
            id: 'dog_poodle', 
            name: 'Meute Urbaine', 
            price: 10000000, 
            desc: "L'élégance et le style.",
            emoji: '🐩' 
        },
        { 
            id: 'dog_wolf', 
            name: 'Meute Sauvage', 
            price: 50000000, 
            desc: "Pour ceux qui chassent en solitaire.",
            emoji: '🐺' 
        },
        { 
            id: 'dog_lion', 
            name: 'Meute Royale', 
            price: 250000000, 
            desc: "Le Roi de la jungle sur ta grille.",
            emoji: '🦁' 
        },
        { 
            id: 'dog_robot', 
            name: 'Meute Cyber', 
            price: 1000000000, 
            desc: "L'intelligence artificielle supérieure.",
            emoji: '🤖' 
        }
    ], // <--- C'EST ICI QU'IL MANQUAIT LA VIRGULE !

    // 3. LES BADGES DE PRESTIGE
    badges: [
        { 
            id: 'badge_alpha', 
            name: 'Statut ALPHA', 
            price: 1000000000, 
            desc: "Quittez le troupeau. Devenez le chef.",
            class: 'badge-alpha',
            icon: '🐺'
        },
        { 
            id: 'badge_apex', 
            name: 'Statut APEX', 
            price: 10000000000, 
            desc: "Le sommet de la chaîne alimentaire.",
            class: 'badge-apex',
            icon: '👑'
        },
        { 
            id: 'badge_legend', 
            name: 'Statut LEGEND', 
            price: 100000000000, 
            desc: "Votre nom brillera pour l'éternité.",
            class: 'badge-legend',
            icon: '💎'
        },
        { 
            id: 'badge_goat', 
            name: 'Statut G.O.A.T.', 
            price: 500000000000, 
            desc: "Greatest Of All Time. L'ultime rang.",
            class: 'badge-goat',
            icon: '🐐'
        }
    ]
   
};

