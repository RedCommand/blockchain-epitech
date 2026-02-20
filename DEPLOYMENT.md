# Déploiement VM - Guide Complet

## Prérequis sur la VM

```bash
# Installer Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer PM2 globalement
sudo npm install -g pm2

# Créer les dossiers de logs
mkdir -p logs
```

## 1. Configuration des variables d'environnement

### Backend (.env)
```bash
cd backend
cp .env.example .env
nano .env
```

Mettre à jour :
```
PORT=3101
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CHAIN_ID=11155111
NEXT_PUBLIC_AMM_ADDRESS=0xE45958Beca57C4B248e3Ec884f38b4aE9fdf2372
NEXT_PUBLIC_MINERAL_TOKEN_ADDRESS=0x3FB40aEE2c9d99bf50592D23D815043c4F658c67
NEXT_PUBLIC_ORACLE_ADDRESS=0x538a210eD2E04db5711DA3792e5600c91c4d1b1D
ETH_PRICE_USD=3000
GOLD_PRICE_USD=2000
```

### Frontend (.env.local)
```bash
cd ../frontend
nano .env.local
```

Mettre à jour :
```
NEXT_PUBLIC_BACKEND_URL=http://YOUR_VM_IP:3101
NEXT_PUBLIC_COMPLIANCE_REGISTRY_ADDRESS=0x43e41007e1fB176586246D85D1A2a28CE0b6AD45
NEXT_PUBLIC_MINERAL_TOKEN_ADDRESS=0x3FB40aEE2c9d99bf50592D23D815043c4F658c67
NEXT_PUBLIC_AMM_ADDRESS=0xE45958Beca57C4B248e3Ec884f38b4aE9fdf2372
NEXT_PUBLIC_ORACLE_ADDRESS=0x538a210eD2E04db5711DA3792e5600c91c4d1b1D
```

## 2. Lancement avec PM2

### Option A : Script automatique
```bash
./start-services.sh
```

### Option B : PM2 Ecosystem (recommandé)
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 3. Commandes utiles

```bash
# Voir les services
pm2 list

# Voir les logs
pm2 logs
pm2 logs blockchain-backend
pm2 logs blockchain-frontend

# Redémarrer
pm2 restart all
pm2 restart blockchain-backend
pm2 restart blockchain-frontend

# Arrêter
pm2 stop all

# Supprimer
pm2 delete all

# Monitoring
pm2 monit
```

## 4. Configuration Nginx (optionnel)

Si tu veux utiliser un reverse proxy :

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3101;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 5. Firewall

```bash
# Ouvrir les ports
sudo ufw allow 3100/tcp
sudo ufw allow 3101/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 6. Vérification

```bash
# Vérifier que les services tournent
curl http://localhost:3101/api/gold-price
curl http://localhost:3100

# Depuis l'extérieur
curl http://YOUR_VM_IP:3101/api/gold-price
curl http://YOUR_VM_IP:3100
```

## 7. Auto-restart au boot

```bash
# PM2 se lance automatiquement
pm2 startup
# Exécute la commande affichée
pm2 save
```

## Troubleshooting

### Les services ne démarrent pas
```bash
# Vérifier les logs
pm2 logs

# Rebuild si nécessaire
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
pm2 restart all
```

### Port déjà utilisé
```bash
# Trouver le process
sudo lsof -i :3100
sudo lsof -i :3101

# Tuer le process
sudo kill -9 PID
```

### Variables d'environnement non chargées
```bash
# Recharger PM2 avec les nouvelles env vars
pm2 restart all --update-env
```
