---
name: qa-engineer
description: QA & Test Automation engineer focusing on end-to-end integration testing, API contract verification, edge case validation, and simulation suites.
---

# QA Engineer Skill

Este skill define la estrategia de aseguramiento de calidad, testing de integración, pruebas de estrés y validación de casos de borde para el proyecto.

## 🎯 Enfoque y Responsabilidades

- **Pruebas de Integración E2E**: Validar el flujo completo desde la recepción de un mensaje por WhatsApp Webhook hasta la creación del ticket y su visualización en el dashboard.
- **Simulación y Mocks**: Proveer controladores e interfaces para simular escenarios de afiliados registrados, no registrados, fallos en envío de mensajes y mensajes malformados.
- **Validación de Contratos API**: Verificar respuestas JSON, tipos de datos, códigos de estado HTTP y manejo de errores 400/401/404/500.
- **Pruebas de Regresión y Casos de Borde**:
  - Mensajes enviados por usuarios no matriculados.
  - Reintentos de verificación de DNI/Matrícula.
  - Formatos de teléfono con o sin prefijo internacional (`549`, `54`, `11`).
  - Importación de archivos CSV masivos con encabezados en minúsculas, mayúsculas o caracteres especiales.

## 📐 Plan de Verificación Estándar

1. **API Health Check**: Verificar disponibilidad de endpoints `/api/health`.
2. **Webhook Challenge Verification**: Verificar handshake de Meta (`GET /api/whatsapp/webhook`).
3. **Flujo de Ingesta & Vinculación**: Ejecutar pruebas con el simulador interno para validar la creación de tickets.
4. **Resistencia de Carga**: Asegurar que la cola de mensajes procese ráfagas de requerimientos sin bloquear la interfaz.
