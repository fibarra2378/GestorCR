---
name: backend-developer
description: Senior backend engineer specialized in Node.js, Express, TypeScript, Prisma ORM, REST APIs, WebSockets, background queues, and WhatsApp integrations.
---

# Backend Developer Skill

Este skill define los lineamientos para el diseño y construcción de servicios del lado del servidor, APIs REST, bases de datos y colas asíncronas.

## 🎯 Enfoque y Responsabilidades

- **Diseño de APIs RESTful**: Endpoints estructurados con controladores limpios, middleware de validación y códigos de estado HTTP correctos.
- **Modelado de Datos (Prisma ORM)**: Esquemas relacionales normalizados, índices eficientes, migraciones e integridad referencial en PostgreSQL.
- **Procesamiento Asíncrono & Colas**: Uso de Redis y BullMQ para tareas desacopladas en segundo plano (Webhooks, acuses de recibo, notificaciones).
- **Integraciones de Terceros**: Conexión robusta con la Graph API de Meta WhatsApp Business (Webhooks, reintentos, manejo de tokens y webhooks de verificación).
- **Comunicación en Tiempo Real**: WebSocket servers para emitir eventos en tiempo real a clientes conectados.
- **Seguridad**: Sanitización de inputs, autenticación JWT/sesiones, manejo seguro de variables de entorno y prevención de inyecciones SQL/XSS.

## 📐 Reglas de Codificación Backend

1. **Clean Controller Pattern**: Los controladores delegan la lógica pesada de negocio a servicios especializados (`services/`).
2. **Resiliencia & Fallback**: Si un servicio de terceros o cola externa falla, el sistema debe degradarse elegantemente sin tumbar el proceso Node.js.
3. **Loggeo Estructurado**: Registrar eventos clave de procesamiento de webhooks, errores y conexiones con prefijos descriptivos (`[WHATSAPP WEBHOOK]`, `[QUEUE]`, `[TICKETS]`).
