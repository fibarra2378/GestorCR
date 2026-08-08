# GestorCR - Workflow Óptimo de Desarrollo y Matriz de Roles

Este documento establece el flujo de trabajo ágil y la **Matriz de Activación Condicional de Roles** para garantizar un desarrollo rápido, modular y eficiente sin sobrecargar tareas innecesarias.

---

## 📊 Matriz de Activación Condicional de Roles

No todos los requerimientos requieren la intervención de todo el equipo. La siguiente matriz define qué rol debe activarse según la naturaleza de la tarea:

| Tipo de Tarea / Requerimiento | Software Architect | UX/UI Designer | Frontend Dev | Backend Dev | QA Engineer | DevOps Engineer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Nueva Interfaz / Cambio UI** | ➖ | 🟢 **Obligatorio** | 🟢 **Obligatorio** | 🟡 *Solo si requiere API nueva* | 🟢 **Obligatorio** | ➖ |
| **2. Nuevo Endpoint / Lógica Backend** | 🟡 *Solo si cambia DB* | ➖ | 🟡 *Solo si se consume en UI* | 🟢 **Obligatorio** | 🟢 **Obligatorio** | ➖ |
| **3. Integración WhatsApp / Webhook / Cola** | 🟢 **Obligatorio** | ➖ | ➖ | 🟢 **Obligatorio** | 🟢 **Obligatorio** | 🟡 *Solo si altera Redis/Puerto* |
| **4. Cambio de Infraestructura / Docker** | 🟢 **Obligatorio** | ➖ | ➖ | ➖ | 🟢 *Smoke Test* | 🟢 **Obligatorio** |
| **5. Bugfix Visual / Ajuste Estilo** | ➖ | 🟢 **Obligatorio** | 🟢 **Obligatorio** | ➖ | 🟢 **Obligatorio** | ➖ |
| **6. Refactor de Arquitectura Core** | 🟢 **Obligatorio** | ➖ | 🟡 *Si afecta componentes* | 🟡 *Si afecta API* | 🟢 **Obligatorio** | 🟡 *Si afecta despliegue* |

---

## 🔄 Flujo de Trabajo (Pipeline de 5 Etapas)

```
[ Requerimiento Entrada ]
          │
          ▼
 ┌─────────────────┐
 │ 1. TRIAGE       │ ──► Tech Lead identifica tipo de tarea y selecciona roles mínimos requeridos
 └────────┬────────┘
          │
          ├──► (Si hay cambio estructural) ──► 2A. Software Architect
          ├──► (Si hay cambio visual)      ──► 2B. UX/UI Designer
          │
          ▼
 ┌─────────────────┐
 │ 3. BUILD        │ ──► Implementación activa (Backend Dev / Frontend Dev)
 └────────┬────────┘
          │
          ▼
 ┌─────────────────┐
 │ 4. QA & TEST    │ ──► QA Engineer (Pruebas E2E, simulador WhatsApp, validación API)
 └────────┬────────┘
          │
          ├──► (Si afecta Docker/Env) ───────► 5. DevOps Engineer (Actualizar contenedores)
          │
          ▼
 [ Entrega Completada ]
```

---

## 📋 Reglas Ejecutivas del Workflow

0. **Liderazgo Técnico (Tech Lead)**: El **Tech Lead** coordina cada requerimiento, efectúa la asignación de agentes, supervisa los estándares de calidad y vela por la paridad de entornos.
1. **Principio de Mínima Intervención**: Activar **únicamente** a los agentes estrictamente necesarios según la matriz.
2. **QA Siempre Presente**: Ninguna tarea se considera completa sin la verificación del **QA Engineer** (ejecución de build, lint o pruebas en simulador).
3. **DevOps bajo demanda**: Las tareas de DevOps solo se activan cuando existan modificaciones en `docker-compose.yml`, `Dockerfile`, `nginx.conf`, scripts de despliegue o variables `.env`.
4. **UX/UI Guardián de Identidad**: Cualquier cambio en vistas debe validar primero la paleta oficial (`#001D39`, `#0A4174`, `#49769F`, `#4E8EA2`, `#6EA2B3`, `#7BBDE8`, `#BDD8E9`).
5. **Confirmación de Push a Git**: Al finalizar una tarea o bloque de trabajo, el asistente **DEBE preguntar explícitamente** al usuario si desea subir los cambios a la rama `dev`, a `main` o a `ambas` (`dev` y `main`).

