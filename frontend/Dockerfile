# Étape 1 : Construction
FROM node:20-alpine AS builder

WORKDIR /app

# Installer les dépendances
COPY package*.json ./
RUN npm install

# Copier le code
COPY . .

# Construire l'application Next.js
ENV NEXT_PUBLIC_API_URL http://localhost/api
RUN npm run build

# Étape 2 : Exécution
FROM node:20-alpine

WORKDIR /app

# Copier les fichiers essentiels depuis le builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Lancer Next.js
CMD ["npm", "start"]
