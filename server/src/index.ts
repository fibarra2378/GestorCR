import express from 'express';
import http from 'http';
import cors from 'cors';
import multer from 'multer';
import { config } from './config';
import { WhatsAppController } from './controllers/whatsapp.controller';
import { TicketsController } from './controllers/tickets.controller';
import { AffiliatesController } from './controllers/affiliates.controller';
import { AuthController } from './controllers/auth.controller';
import { WSService } from './services/ws.service';

const app = express();
const server = http.createServer(app);
const upload = multer({ storage: multer.memoryStorage() });

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WhatsApp Webhook Routes (Meta API Verification & Events)
app.get('/api/whatsapp/webhook', WhatsAppController.verifyWebhook);
app.post('/api/whatsapp/webhook', WhatsAppController.handleWebhook);

// Dev Simulator Route (To test incoming WhatsApp messages without Meta credentials)
app.post('/api/whatsapp/simulate-incoming', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ success: false, error: 'phone y message son requeridos' });
  }
  await WhatsAppController.processIncomingMessage(phone, message, `sim_${Date.now()}`);
  return res.json({ success: true, message: 'Mensaje simulado procesado correctamente' });
});

// Auth Routes
app.post('/api/auth/login', AuthController.login);
app.get('/api/auth/me', AuthController.me);

// Tickets Routes
app.get('/api/tickets', TicketsController.getTickets);
app.get('/api/tickets/:id', TicketsController.getTicketById);
app.patch('/api/tickets/:id', TicketsController.updateTicket);
app.post('/api/tickets/:id/reply', TicketsController.sendOperatorReply);

// Affiliates Routes
app.get('/api/affiliates', AffiliatesController.getAffiliates);
app.post('/api/affiliates', AffiliatesController.createAffiliate);
app.post('/api/affiliates/import-csv', upload.single('file'), AffiliatesController.importCSV);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'GestorCR Backend API', timestamp: new Date().toISOString() });
});

// Initialize WebSockets
WSService.init(server);

// Start Server
server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 GestorCR Servidor Backend corriendo en puerto ${config.port}`);
  console.log(`📌 Webhook URL WhatsApp: http://localhost:${config.port}/api/whatsapp/webhook`);
  console.log(`=======================================================`);
});
