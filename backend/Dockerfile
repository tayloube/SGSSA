FROM python:3.11-slim

# Environnement
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Répertoire de travail
WORKDIR /app

# Installation des dépendances système (pg_config pour psycopg2)
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Installation des dépendances Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code
COPY . /app/

# Port d'écoute
EXPOSE 8000

# Le script de démarrage est géré par docker-compose
