---

# 💎 Tokenized Asset Management Platform (RWA)

## 📖 Table des Matières

1. [Vision & Introduction](https://www.google.com/search?q=%23-vision--introduction)
2. [Architecture du Système](https://www.google.com/search?q=%23-architecture-du-syst%C3%A8me)
3. [Choix de Conception (Design Choices)](https://www.google.com/search?q=%23-choix-de-conception-design-choices)
4. [Fonctionnalités Clés](https://www.google.com/search?q=%23-fonctionnalit%C3%A9s-cl%C3%A9s)
5. [Guide d'Installation & Déploiement](https://www.google.com/search?q=%23-guide-dinstallation--d%C3%A9ploiement)
6. [Utilisation (How to Use)](https://www.google.com/search?q=%23-utilisation-how-to-use)
7. [Sécurité & Gouvernance](https://www.google.com/search?q=%23-s%C3%A9curit%C3%A9--gouvernance)
8. [Structure du Projet](https://www.google.com/search?q=%23-structure-du-projet)

---

## 🌟 Vision & Introduction

Cette plateforme est une solution de bout en bout pour la **tokenisation d'actifs du monde réel (RWA)**, tels que l'or, l'argent et les diamants. L'objectif est de combler le fossé entre les actifs physiques tangibles et la finance décentralisée (DeFi) en apportant liquidité, transparence et conformité réglementaire sur la blockchain.

La plateforme permet :

* La représentation d'actifs fongibles (Or/Argent via ERC-20).
* La représentation d'actifs uniques (Diamants via ERC-721).
* Un contrôle strict des accès via un registre de conformité on-chain.
* Un marché secondaire intégré via un Automated Market Maker (AMM).

---

## 🏗 Architecture du Système

Le projet adopte une architecture **Full-Stack Décentralisée** :

* **Smart Contracts (Layer 1 - Logic) :** Écrits en Solidity, utilisant la suite OpenZeppelin pour la sécurité. Ils gèrent la logique des tokens, la conformité et l'échange de liquidité.
* **Backend / Indexeur (Layer 2 - Data) :** Une application Node.js/Express utilisant **Viem** pour écouter les événements de la blockchain en temps réel. Les données sont stockées dans une base SQLite pour fournir une API rapide au frontend.
* **Frontend (Layer 3 - UI) :** Une interface moderne sous Next.js 15+, intégrant RainbowKit et Wagmi pour une connexion fluide aux portefeuilles Web3 (MetaMask).

---

## 🧠 Choix de Conception (Design Choices)

### 1. Standardisation des Tokens

Nous avons choisi les standards **ERC-20** pour les métaux précieux car ils sont divisibles et fongibles, facilitant l'apport de liquidité. Pour les diamants, l'**ERC-721** est utilisé car chaque pierre possède des caractéristiques uniques (poids, pureté, certificat) stockées via des URI de métadonnées.

### 2. Conformité Native (Compliance-by-Design)

Contrairement aux tokens classiques, nos contrats `MineralToken` et `DiamondCollection` surchargent la fonction interne `_update`. Chaque transfert déclenche une vérification auprès du `ComplianceRegistry`.

* **Whitelist :** Seuls les utilisateurs vérifiés peuvent détenir ou échanger des actifs.
* **Blacklist :** Permet de geler les avoirs en cas d'activité suspecte ou de vol.

### 3. AMM Simplifié (SimpleAMM)

Pour garantir la liquidité immédiate sans dépendre de carnets d'ordres externes, nous avons implémenté un **AMM basé sur le produit constant ()**.

* **Frais :** Une commission de 0.3% est appliquée sur chaque swap pour rémunérer le protocole ou les fournisseurs de liquidité.
* **Sécurité des prix :** L'AMM utilise une protection contre le "slippage" via un paramètre `minAmountOut`.

### 4. Indexation Off-chain

Interroger directement la blockchain pour l'historique des transactions est lent et coûteux. Notre backend agit comme un **indexeur léger** qui surveille les événements `SwapEthForToken` et `SwapTokenForEth` pour maintenir une base de données locale des volumes et des prix.

---

## 🚀 Fonctionnalités Clés

### Tokenisation d'Actifs

* **Minting :** Seul l'administrateur peut émettre de nouveaux tokens correspondant à des actifs physiques audités.
* **Proof of Reserve :** Un oracle simple (`SimpleOracle`) permet de mettre à jour le prix de référence des actifs on-chain.

### Échange (Trading)

* **Swap ETH ↔ Token :** Interface intuitive pour convertir de l'Ether en Or/Argent tokenisé instantanément.
* **Gestion de Liquidité :** Possibilité d'ajouter ou de retirer des réserves pour stabiliser le marché.

---

## 🛠 Guide d'Installation & Déploiement

### Prérequis

* Node.js v20+
* Docker & Docker Compose (recommandé pour une installation rapide)
* MetaMask (configuré sur Localhost 8545 ou Sepolia)

### Option A : Déploiement rapide avec Docker

```bash
docker-compose up --build

```

* **Frontend :** `http://localhost:3000`
* **Backend :** `http://localhost:3001`
* **Nœud RPC :** `http://localhost:8545`

### Option B : Installation manuelle pour développement

1. **Installer les dépendances :** `npm install`
2. **Lancer la blockchain locale :**
```bash
cd contracts
npx hardhat node

```


3. **Déployer les contrats :**
```bash
npm run deploy:local

```


4. **Lancer les services :**
* Backend : `cd backend && npm run dev`
* Frontend : `cd frontend && npm run dev`



---

## 📖 Utilisation (How to Use)

### 1. Configuration de MetaMask

Connectez votre portefeuille au réseau local :

* **RPC URL :** `http://localhost:8545`
* **Chain ID :** `31337`
* **Symbole :** `ETH`

### 2. Accès Administrateur

Pour tester les fonctionnalités d'administration (Mint, Whitelist) :

1. Ajoutez votre adresse dans `contracts/.env` : `NEW_OWNER=0x...`
2. Exécutez : `npm run claim-ownership`. Cela vous donnera le contrôle des contrats et des fonds de test (1000 ETH locaux).

### 3. Cycle de vie utilisateur

* **Étape 1 :** L'admin vous ajoute à la **Whitelist** via le panel admin.
* **Étape 2 :** Allez sur l'onglet **Trade** pour swapper des ETH contre des tokens de minéraux.
* **Étape 3 :** Visualisez votre **Portfolio** mis à jour en temps réel grâce à l'indexeur.

---

## 🛡 Sécurité & Gouvernance

* **Ownable :** Toutes les fonctions critiques (minting, modification de la liste de conformité, mise à jour de l'oracle) sont protégées par le modificateur `onlyOwner` d'OpenZeppelin.
* **Protection contre la Réentrancée :** Les transferts de fonds dans l'AMM utilisent le pattern `call` avec vérification de succès pour éviter les vulnérabilités classiques.
* **Audit de Conformité :** Aucun transfert ne peut être effectué si l'un des participants est sur la `blacklist`.

---

## 📁 Structure du Projet

```text
.
├── contracts/          # Smart Contracts Solidity & Scripts Hardhat
│   ├── contracts/      # Logique métier (AMM, Tokens, Compliance)
│   └── scripts/        # Déploiement et maintenance
├── backend/            # API Express & Indexeur Viem/SQLite
├── frontend/           # Interface Next.js (Tailwind + DaisyUI)
└── docker-compose.yml  # Orchestration de l'ensemble de la pile

```

---
