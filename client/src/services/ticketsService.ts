import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { Ticket, TicketStatus, TicketCategory, TicketPriority, Message } from '../types';

const COLLECTION_NAME = 'tickets';

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'tick-init-1',
    code: 'TICK-358189',
    phone: 'fernandoibarra23@gmail.com',
    email: 'fernandoibarra23@gmail.com',
    channel: 'EMAIL',
    category: 'CONSULTA',
    status: 'NUEVO',
    priority: 'MEDIA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    affiliate: {
      id: 'aff-init-1',
      dni: '26596615',
      matricula: '1340',
      fullName: 'Fernando Ibarra',
      email: 'fernandoibarra23@gmail.com',
      status: 'ACTIVO',
      createdAt: new Date().toISOString()
    },
    messages: [
      {
        id: 'm-1',
        ticketId: 'tick-init-1',
        sender: 'AFILIADO',
        body: '[Email: Consulta]\n\nAfiliado Fernando Ibarra\nDni 26596615\n\nTengo un problema X001',
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'tick-init-2',
    code: 'TICK-455970',
    phone: 'carlos.spadaro@gmail.com',
    email: 'carlos.spadaro@gmail.com',
    channel: 'EMAIL',
    category: 'RECLAMO',
    status: 'EN_REVISION',
    priority: 'ALTA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    affiliate: {
      id: 'aff-init-2',
      dni: '28999111',
      matricula: 'M-0855',
      fullName: 'Lic. Carlos Roberto Spadaro',
      email: 'carlos.spadaro@fonoaudiologia.org',
      status: 'ACTIVO',
      createdAt: new Date().toISOString()
    },
    messages: [
      {
        id: 'm-2',
        ticketId: 'tick-init-2',
        sender: 'AFILIADO',
        body: '[Email: Reclamo]\n\nSolicito revisión del pago de la cuota social del mes de agosto.',
        createdAt: new Date().toISOString()
      }
    ]
  }
];

export class TicketsService {
  private static isSeeding = false;

  /**
   * Auto-seed Firestore collection if it's empty
   */
  public static async autoSeedIfEmpty() {
    if (this.isSeeding) return;
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(colRef);
      if (snapshot.empty) {
        this.isSeeding = true;
        for (const t of INITIAL_TICKETS) {
          const newDocRef = doc(colRef, t.id);
          await setDoc(newDocRef, t);
        }
        this.isSeeding = false;
      }
    } catch (e) {
      console.warn('[Firestore] Error en auto-seed de tickets:', e);
      this.isSeeding = false;
    }
  }

  /**
   * Real-time listener for all tickets
   */
  public static subscribeTickets(callback: (tickets: Ticket[]) => void): () => void {
    this.autoSeedIfEmpty();
    const colRef = collection(db, COLLECTION_NAME);

    try {
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        if (snapshot.empty && !this.isSeeding) {
          this.autoSeedIfEmpty();
        }
        const list: Ticket[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Ticket;
          return {
            ...data,
            id: docSnap.id
          };
        });

        // Sort by updatedAt descending
        list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
        callback(list);
      }, (error) => {
        console.warn('[Firestore] Error en listener de tickets:', error);
      });

      return unsubscribe;
    } catch (e) {
      console.warn('[Firestore] Fallback en listener de tickets:', e);
      return () => {};
    }
  }

  /**
   * Get ticket details
   */
  public static async getTicketById(id: string): Promise<Ticket | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as Ticket;
  }

  /**
   * Update ticket status
   */
  public static async updateStatus(id: string, status: TicketStatus): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Update ticket category
   */
  public static async updateCategory(id: string, category: TicketCategory): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      category,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Send operator reply to a ticket
   */
  public static async sendReply(ticketId: string, replyText: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, ticketId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const currentTicket = snap.data() as Ticket;
    const now = new Date().toISOString();

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      ticketId,
      sender: 'OPERADOR',
      body: replyText.trim(),
      createdAt: now
    };

    const messages = [...(currentTicket.messages || []), newMsg];

    await updateDoc(docRef, {
      messages,
      status: 'PENDIENTE_AFILIADO' as TicketStatus,
      updatedAt: now
    });
  }

  /**
   * Create a new ticket (e.g. from affiliate or internal)
   */
  public static async createTicket(payload: {
    category: TicketCategory;
    priority?: TicketPriority;
    initialMessage: string;
    affiliate?: any;
    email?: string;
    phone?: string;
  }): Promise<Ticket> {
    const colRef = collection(db, COLLECTION_NAME);
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    const code = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTicket: Ticket = {
      id: newDocRef.id,
      code,
      phone: payload.phone || payload.affiliate?.phone || 'Sin teléfono',
      email: payload.email || payload.affiliate?.email || undefined,
      channel: 'EMAIL',
      category: payload.category,
      status: 'NUEVO',
      priority: payload.priority || 'MEDIA',
      affiliateId: payload.affiliate?.id,
      affiliate: payload.affiliate,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}`,
          ticketId: newDocRef.id,
          sender: 'AFILIADO',
          body: payload.initialMessage,
          createdAt: now
        }
      ]
    };

    await setDoc(newDocRef, newTicket);
    return newTicket;
  }
}
