#  TOPDOG (Gold Edition v1.0)

**Un jeu de puzzle stratégique et de paris canins optimisé pour mobile.**

TOPDOG est une Progressive Web App (PWA) où le joueur doit frayer un chemin à des chiens de course en éliminant les obstacles numériques. Le jeu combine réflexion rapide, gestion de risque et une mécanique de grille mathématiquement équilibrée.

---

##  Fonctionnalités Clés

* **Moteur "The Swapper" (V23) :** Un algorithme unique qui garantit une grille **sans doublons adjacents** tout en conservant une distribution statistique parfaite des chiffres.
* **Système de Paris & Tycoon :** Une banque persistante (sauvegardée en local) permet de cumuler des gains infinis (affichage formaté 1.5k, 2M, 3B...).
* **Réserve Infinie Équitable :** Pas de limite de coups, mais une limite de temps (2 minutes). Le générateur de nombres assure une équité totale sur la durée.
* **Audio Synthétique :** Aucun fichier MP3. Tous les sons (match, victoire, clic) sont générés en temps réel par l'API Web Audio (poids ultra-léger).
* **Design Néon Réactif :** Interface "Liquid Layout" qui s'adapte parfaitement à tous les écrans (iPhone, Android, Tablette) sans scroll.
* **Installation PWA :** Peut s'installer comme une application native sur l'écran d'accueil.

---

##  Comment Jouer

1.  **Le But :** Faire descendre les chiens (les cases avec icônes) jusqu'à la **dernière ligne** du bas.
2.  **La Mécanique :** Cliquez sur deux chiffres adjacents (Haut, Bas, Gauche, Droite ou Diagonale) dont la **somme est égale à 9**.
    * Exemples : `5 + 4`, `8 + 1`, `6 + 3`.
3.  **Les Paris :** Avant la course, chaque chien a une cote (mise). Si vous sauvez ce chien, vous gagnez **10x la mise**.
4.  **Contraintes :**
    * Vous avez **2 minutes**.
    * Si le temps est écoulé, la partie est finie.
5.  **Bonus :**
    * **Brasser :** Mélange la grille si vous êtes bloqué (attention, stock limité !).
    * **Indice :** Révèle un coup possible.

---

##  Installation & Lancement

Ce jeu ne nécessite aucun serveur (PHP/Node). C'est du pur **HTML/JS/CSS**.

1.  Clonez le dépôt ou téléchargez les fichiers.
2.  Ouvrez `index.html` dans un navigateur moderne.
3.  **Sur Mobile :** Utilisez l'option "Ajouter à l'écran d'accueil" de votre navigateur pour l'expérience App (Plein écran).

---

##  Structure du Projet

* `index.html` : Structure de l'application et chargement des librairies.
* `style.css` : Design réactif, animations et thèmes couleurs (Néon).
* `logic.js` : Le cerveau. Contient le moteur de jeu, la gravité et l'algorithme "Swapper".
* `ui.js` : L'interface. Gère le DOM, les clics, l'audio et les effets visuels (Confettis).
* `manifest.json` : Configuration PWA (Icônes, Noms, Comportement).

---

##  Crédits

* **Concept & Développement :** [Daniel Ouimet]
* **Version :** 1.0 (Build V23/24)
* **Licence :** Propriétaire / Usage Personnel.
