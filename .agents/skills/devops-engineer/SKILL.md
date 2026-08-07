---
name: devops-engineer
description: DevOps & Infrastructure engineer specializing in Docker containerization, CI/CD pipelines, environment parity, service orchestration, and production readiness.
---

# DevOps Engineer Skill

Este skill define los estándares de contención, automatización de entornos, CI/CD y despliegue para el proyecto.

## 🎯 Enfoque y Responsabilidades

- **Contenerización con Docker**:
  - Creación de `Dockerfiles` multi-stage optimizados para backend (Node.js/TypeScript) y frontend (Vite + Nginx).
  - Orquestación completa con `docker-compose.yml` para levantar PostgreSQL, Redis, Backend API y Dashboard Client en un solo comando.
- **Paridad de Entornos**: Garantizar que el entorno de desarrollo local reproduzca fielmente las condiciones de prueba y producción.
- **Redes y Proxy Inverso**: Configuración de servidores Nginx como proxy inverso para enrutar tráfico HTTP y WebSockets (`/api/`, `/ws`).
- **Gestión de Secretos y Variables de Entorno**: Estructurar archivos `.env.example` y asegurar que no se expongan llaves ni tokens sensibles en el repositorio.
- **Monitoreo y Salud de Servicios**: Healthchecks automáticos (`GET /api/health`) y políticas de reinicio automático (`restart: always`).

## 📐 Comandos Estándar de Infraestructura

1. **Levantar Stack Completo**:
   ```bash
   docker compose up --build -d
   ```
2. **Monitorear Logs de Servicios**:
   ```bash
   docker compose logs -f
   ```
3. **Detener Entorno**:
   ```bash
   docker compose down
   ```
