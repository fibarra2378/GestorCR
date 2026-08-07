# Guía de Despliegue en la Nube y Producción (HTTPS & Meta WhatsApp)
### Colegio de Fonoaudiólogos — GestorCR

Esta guía proporciona las instrucciones detalladas para desplegar **GestorCR** en un servidor Cloud de producción (DigitalOcean, Hetzner, AWS, Render) con certificado **HTTPS (SSL/TLS)** y conexión a **Meta WhatsApp Cloud API**.

---

## 🛠️ Requisitos Previos

1. **Servidor Linux (Ubuntu 22.04 / 24.04 LTS)** con al menos 2 GB de RAM.
2. **Docker** y **Docker Compose** instalados en el servidor.
3. **Dominio Público Aprobado** apuntando a la IP de tu servidor (ej: `atencion.cfono.org.ar`).
4. **Cuenta de Meta Developers** con la aplicación de WhatsApp Business verificada.

---

## 🚀 Paso 1: Clonar el Repositorio

En tu servidor VPS, ejecuta:

```bash
git clone https://github.com/fibarra2378/GestorCR.git
cd GestorCR
```

---

## 🔑 Paso 2: Configurar Variables de Entorno de Producción

Crea el archivo `.env` en la carpeta `server/`:

```bash
cp server/.env.example server/.env
nano server/.env
```

Configura tus credenciales reales de Meta WhatsApp API:

```env
PORT=4000
NODE_ENV=production
DATABASE_URL="postgresql://postgres:postgres_secure_2026@postgres:5432/gestorcr?schema=public"
REDIS_URL="redis://redis:6379"
JWT_SECRET="turing_gestorcr_secret_key_prod_2026"

# Meta WhatsApp Business Cloud API
WHATSAPP_VERIFY_TOKEN="gestorcr_verify_token_prod"
WHATSAPP_API_TOKEN="EAAG..." # Permanent Access Token de Meta
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_API_VERSION="v19.0"
```

---

## 🐳 Paso 3: Despliegue con Docker Compose (1-Clic)

Ejecuta el script automatizado:

```bash
chmod +x deploy.sh
./deploy.sh
```

O manualmente:

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker exec gestorcr-server-prod npx prisma db push
```

---

## 🔒 Paso 4: Configurar SSL/TLS Certificados HTTPS Gratuitos (Certbot / Let's Encrypt)

Para obtener un certificado SSL gratuito con **Certbot**:

```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d atencion.cfono.org.ar
```

Esto configurará automáticamente la renovación automática de SSL cada 90 días y garantizará conexiones seguras `https://atencion.cfono.org.ar`.

---

## 📌 Paso 5: Configurar Webhook en Meta Developers

1. Ingresa a [Meta Developers Console](https://developers.facebook.com/).
2. Selecciona tu aplicación -> **WhatsApp** -> **Configuración**.
3. En la sección **Webhook**:
   - **URL de Verificación**: `https://atencion.cfono.org.ar/api/whatsapp/webhook`
   - **Token de Verificación**: `gestorcr_verify_token_prod` (igual a `WHATSAPP_VERIFY_TOKEN` en `.env`).
4. Haz clic en **Verificar y Guardar**.
5. En la sección **Campos administrados**, suscríbete al evento **`messages`**.

---

## 📊 Monitoreo y Verificación

* **Verificar Logs del Backend**:
  ```bash
  docker logs -f gestorcr-server-prod
  ```
* **Estado de la BD y Redis**:
  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```
