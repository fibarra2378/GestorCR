# GestorCR - Sistema de Recepción, Validación y Ticketing
### Colegio de Fonoaudiólogos

GestorCR es una solución empresarial automatizada desarrollada para optimizar la recepción, validación de identidad y gestión de consultas y reclamos del **Colegio de Fonoaudiólogos**.

---

## 🚀 Características Principales

1. **Canal de Entrada WhatsApp**:
   - Integración nativa con **Meta WhatsApp Business Cloud API** (`POST /api/whatsapp/webhook`).
   - Simulador interactivo incorporado para pruebas de desarrollo local en tiempo real.

2. **Validación de Identidad por DNI o Matrícula**:
   - Búsqueda automática en el padrón de afiliados al recibir un mensaje.
   - Bot conversacional interactivo que solicita DNI/Matrícula si el número emisor no está previamente vinculado.
   - Vinculación dinámica del teléfono al padrón tras la validación exitosa.

3. **Ciclo de Vida de Tickets y Acuse de Recibo Asíncrono**:
   - Generación automática de ticket con código único (`TICK-XXXXXX`).
   - Envío de acuse de recibo asíncrono mediante cola de procesamiento **Redis (BullMQ)**.
   - Estados: `NUEVO`, `EN_REVISION`, `PENDIENTE_AFILIADO`, `RESUELTO`, `CERRADO`.
   - Categorías: `CONSULTA`, `RECLAMO`, `MATRICULA`, `CUOTA`, `OTROS`.

4. **Panel Central de Operadores (Dashboard Web)**:
   - Diseño institucional moderno (paleta azul marino/turquesa, soporte para modo oscuro/claro).
   - Chat interactivo en tiempo real mediante **WebSockets** para responder directamente al WhatsApp del afiliado.
   - Plantillas de respuesta rápida predefinidas.
   - Gestor e importador masivo de Padrón en formato **CSV**.

---

## 🛠️ Arquitectura y Tecnologías

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, BullMQ, Redis, WebSockets (`ws`), Multer, CSV Parser.
- **Frontend**: React 18, Vite, TypeScript, Lucide Icons, Vanilla CSS Design System.
- **Base de Datos**: PostgreSQL 16.
- **Contenerización**: Docker & Docker Compose.

---

## 📦 Ejecución en 1 Clic con Docker Compose

Para iniciar todos los servicios (PostgreSQL, Redis, Backend API y Dashboard Frontend):

```bash
docker compose up --build -d
```

### Accesos:
- 💻 **Dashboard Web**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Backend API**: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- 📌 **Meta WhatsApp Webhook**: `http://localhost:4000/api/whatsapp/webhook`
  - **Verify Token por defecto**: `gestorcr_verify_token`

---

## 🔐 Credenciales de Inicio de Sesión (Dashboard)

- **Usuario**: `admin`
- **Contraseña**: `admin123`

---

## 🧪 Pruebas y Simulación de Mensajes

Dentro del Dashboard Web, haz clic en el botón **"Simulador WhatsApp"** en el menú lateral para probar los siguientes escenarios:

1. **Afiliado Registrado**: Envía un mensaje desde el número `5491144445555` -> Se crea el ticket inmediatamente y se asigna a la Dra. María Elena Gómez (`M-1042`).
2. **Nuevo Usuario (No vinculado)**: Envía un mensaje desde `5491188887777` -> El bot responde pidiendo DNI o Matrícula.
3. **Validación de DNI**: Responde `32456789` -> El sistema valida la identidad, vincula el teléfono y crea el ticket.
