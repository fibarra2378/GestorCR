import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Ticket, TicketStatus, TicketCategory, TicketPriority, Message } from '../types';

const STORAGE_KEY = 'gestorcr_tickets_store_v1';
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
  private static listeners: Array<(tickets: Ticket[]) => void> = [];

  private static loadFromStorage(): Ticket[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    this.saveToStorage(INITIAL_TICKETS);
    return INITIAL_TICKETS;
  }

  private static saveToStorage(list: Ticket[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
    this.notifyListeners(list);
  }

  private static notifyListeners(list: Ticket[]) {
    const sorted = [...list].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
    this.listeners.forEach((cb) => {
      try {
        cb(sorted);
      } catch (e) {
        console.error(e);
      }
    });
  }

  public static subscribeTickets(callback: (tickets: Ticket[]) => void): () => void {
    this.listeners.push(callback);

    const current = this.loadFromStorage();
    callback(
      [...current].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      )
    );

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            this.notifyListeners(parsed);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    let unsubscribeFirestore = () => {};
    try {
      if (db) {
        const colRef = collection(db, COLLECTION_NAME);
        unsubscribeFirestore = onSnapshot(
          colRef,
          (snapshot) => {
            if (!snapshot.empty) {
              const remoteList: Ticket[] = snapshot.docs.map((docSnap) => ({
                ...(docSnap.data() as Ticket),
                id: docSnap.id
              }));
              this.saveToStorage(remoteList);
            }
          },
          () => {
            // fallback quietly
          }
        );
      }
    } catch {
      // ignore
    }

    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
      window.removeEventListener('storage', handleStorageChange);
      unsubscribeFirestore();
    };
  }

  public static async getTicketById(id: string): Promise<Ticket | null> {
    const list = this.loadFromStorage();
    return list.find((t) => t.id === id) || null;
  }

  public static async updateStatus(id: string, status: TicketStatus): Promise<void> {
    const list = this.loadFromStorage();
    const now = new Date().toISOString();
    const updated = list.map((t) => (t.id === id ? { ...t, status, updatedAt: now } : t));
    this.saveToStorage(updated);

    try {
      if (db) {
        const docRef = doc(db, COLLECTION_NAME, id);
        updateDoc(docRef, { status, updatedAt: now }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  public static async updateCategory(id: string, category: TicketCategory): Promise<void> {
    const list = this.loadFromStorage();
    const now = new Date().toISOString();
    const updated = list.map((t) => (t.id === id ? { ...t, category, updatedAt: now } : t));
    this.saveToStorage(updated);

    try {
      if (db) {
        const docRef = doc(db, COLLECTION_NAME, id);
        updateDoc(docRef, { category, updatedAt: now }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  public static async sendReply(ticketId: string, replyText: string): Promise<void> {
    const list = this.loadFromStorage();
    const now = new Date().toISOString();

    const target = list.find((t) => t.id === ticketId);
    if (!target) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      ticketId,
      sender: 'OPERADOR',
      body: replyText.trim(),
      createdAt: now
    };

    const messages = [...(target.messages || []), newMsg];
    const updated = list.map((t) =>
      t.id === ticketId ? { ...t, messages, status: 'PENDIENTE_AFILIADO' as TicketStatus, updatedAt: now } : t
    );

    this.saveToStorage(updated);

    try {
      if (db) {
        const docRef = doc(db, COLLECTION_NAME, ticketId);
        updateDoc(docRef, {
          messages,
          status: 'PENDIENTE_AFILIADO',
          updatedAt: now
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  public static async createTicket(payload: {
    category: TicketCategory;
    priority?: TicketPriority;
    initialMessage: string;
    affiliate?: any;
    email?: string;
    phone?: string;
  }): Promise<Ticket> {
    const list = this.loadFromStorage();
    const now = new Date().toISOString();
    const id = `tick-${Date.now()}`;
    const code = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTicket: Ticket = {
      id,
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
          ticketId: id,
          sender: 'AFILIADO',
          body: payload.initialMessage,
          createdAt: now
        }
      ]
    };

    const updated = [newTicket, ...list];
    this.saveToStorage(updated);

    try {
      if (db) {
        const docRef = doc(collection(db, COLLECTION_NAME), id);
        setDoc(docRef, newTicket).catch(() => {});
      }
    } catch {
      // ignore
    }

    return newTicket;
  }
}
