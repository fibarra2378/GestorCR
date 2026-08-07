export type TicketStatus = 'NUEVO' | 'EN_REVISION' | 'PENDIENTE_AFILIADO' | 'RESUELTO' | 'CERRADO';
export type TicketCategory = 'CONSULTA' | 'RECLAMO' | 'MATRICULA' | 'CUOTA' | 'OTROS';
export type TicketPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type MessageSender = 'AFILIADO' | 'OPERADOR' | 'BOT';

export interface Affiliate {
  id: string;
  dni: string;
  matricula: string;
  fullName: string;
  phone?: string;
  email?: string;
  status: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  createdAt: string;
}

export interface Message {
  id: string;
  ticketId: string;
  sender: MessageSender;
  body: string;
  whatsappId?: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  code: string;
  phone: string;
  email?: string;
  channel?: 'WHATSAPP' | 'EMAIL';
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  affiliateId?: string;
  affiliate?: Affiliate;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}


export interface User {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'OPERADOR';
}
