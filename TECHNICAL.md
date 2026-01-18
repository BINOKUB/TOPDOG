#  Documentation Technique - TOPDOG Engine

Ce document détaille le fonctionnement interne du moteur de jeu, spécifiquement l'algorithme de génération de grille **V23 "The Swapper"**.

## 1. Le Problème des Doublons (Legacy)
Dans les versions précédentes (V1 à V18), la génération aléatoire créait des amas de chiffres identiques (ex: un 8 sur un 8), rendant le jeu injouable ou mathématiquement injuste.

## 2. La Solution : Moteur V23 "The Swapper"

Le moteur V23 n'utilise pas de génération aléatoire pure. Il utilise une approche de **Résolution par Échange (Constraint Solving)**.

### A. L'Inventaire Strict (The Perfect Deck)
Au démarrage, le jeu ne tire pas les dés. Il crée un "Deck" de 60 cartes contenant exactement :
* 8 exemplaires des chiffres 1, 2, 3, 4
* 7 exemplaires des chiffres 5, 6, 7, 8
* Total : 60 cartes.

Cela garantit qu'il est impossible d'avoir une pénurie de chiffres (ex: avoir douze "8" et aucun "1").

### B. L'Algorithme de Résolution
Une fois les chiffres posés "en vrac", l'algorithme suivant s'exécute instantanément (avant l'affichage) :

1.  **Scan :** Le code parcourt la grille et compte les conflits (Chiffre identique en Haut, Bas, Gauche ou Droite).
2.  **Détection :** Si une case a un conflit (ex: un 5 à côté d'un 5).
3.  **Échange (Swap) :**
    * Le moteur choisit une autre case au hasard sur le plateau (ex: un 2).
    * Il échange virtuellement le 5 et le 2.
    * **Double Check :** Il vérifie si cet échange résout le problème du 5 **SANS** créer de nouveau problème pour le 2 à sa nouvelle place.
4.  **Validation :** Si l'échange est propre (0 conflit généré), il est validé. Sinon, on annule et on essaie avec un autre partenaire.

Ce processus est répété jusqu'à ce que la grille soit **100% propre**.

## 3. La Gravité Intelligente (Infinite AI)

Lorsque les blocs tombent, nous ne pouvons pas utiliser le "Swap" car nous créons du vide. Nous utilisons le système **V22 Infinite Pool** :

* Le jeu possède un "Sac Global" qui contient 5 exemplaires de chaque chiffre.
* Quand une case vide doit être remplie, l'IA regarde les 4 voisins existants.
* Elle pioche dans le Sac Global un chiffre qui n'est **PAS** interdit par les voisins.
* Cela assure que même en cours de jeu, l'équité et la propreté de la grille sont maintenues.

## 4. Système de Sauvegarde (Local Storage)

Les données suivantes sont persistantes :
* `topdog_bankroll` : Le montant total d'argent accumulé.
* `topdog_muted` : L'état du son (On/Off).

## 5. Audio Synthétique (Web Audio API)

Le fichier `ui.js` contient un synthétiseur modulaire miniature.
* **Oscillateurs :** `square`, `sine`, `triangle`, `sawtooth`.
* **Gain Nodes :** Pour gérer les enveloppes de volume (Attaque/Déclin).
* **Avantage :** Pas de chargement de fichiers audio, latence nulle, fonctionne hors ligne.
