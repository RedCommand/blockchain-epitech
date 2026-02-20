#!/bin/bash

# Script pour lancer le frontend et le backend en background avec PM2

echo "🚀 Démarrage des services..."

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installation de PM2..."
    npm install -g pm2
fi

# Aller dans le backend et démarrer
echo "🔧 Démarrage du backend..."
cd backend
npm install
npm run build
pm2 start dist/index.js --name "blockchain-backend"
cd ..

# Aller dans le frontend et démarrer
echo "🎨 Démarrage du frontend..."
cd frontend
npm install
npm run build
pm2 start npm --name "blockchain-frontend" -- start
cd ..

echo "✅ Services démarrés!"
echo ""
echo "Commandes utiles:"
echo "  pm2 list          → Voir les services"
echo "  pm2 logs          → Voir les logs"
echo "  pm2 restart all   → Redémarrer"
echo "  pm2 stop all      → Arrêter"
echo "  pm2 delete all    → Supprimer"
echo ""
pm2 list
