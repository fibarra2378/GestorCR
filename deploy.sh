#!/bin/bash

# GestorCR - Script de Despliegue Automatizado en Producción
set -e

echo "======================================================="
echo "🚀 Iniciando despliegue de GestorCR en servidor Cloud..."
echo "======================================================="

# 1. Obtener última versión del repositorio
echo "📌 1. Actualizando código desde Git..."
git pull origin main || echo "⚠️ Advertencia: No se pudo hacer git pull (verificar rama local o conectividad)"

# 2. Reconstruir e iniciar contenedores en segundo plano
echo "🐳 2. Compilando y ejecutando Docker Compose de Producción..."
docker compose -f docker-compose.prod.yml up --build -d

# 3. Aplicar migraciones de base de datos Prisma
echo "🗄️ 3. Ejecutando migraciones en base de datos PostgreSQL..."
docker exec gestorcr-server-prod npx prisma db push --accept-data-loss

# 4. Verificación de estado de servicios
echo "🔍 4. Verificando estado de contenedores..."
docker compose -f docker-compose.prod.yml ps

echo "======================================================="
echo "✅ Despliegue completado exitosamente!"
echo "🌐 Backend API: http://localhost:4000/api/health"
echo "🌐 Dashboard Frontend: http://localhost"
echo "======================================================="
