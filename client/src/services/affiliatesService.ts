import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { api } from './api';
import { Affiliate } from '../types';

const STORAGE_KEY = 'gestorcr_affiliates_store_v1';
const COLLECTION_NAME = 'affiliates';

const INITIAL_AFFILIATES: Affiliate[] = [
  {
    id: 'aff-init-1',
    dni: '26596615',
    matricula: '1340',
    fullName: 'Fernando Ibarra',
    phone: '342-4112233',
    email: 'fernandoibarra23@gmail.com',
    status: 'ACTIVO',
    createdAt: new Date().toISOString()
  },
  {
    id: 'aff-init-2',
    dni: '28999111',
    matricula: 'M-0855',
    fullName: 'Lic. Carlos Roberto Spadaro',
    phone: '5491155556666',
    email: 'carlos.spadaro@fonoaudiologia.org',
    status: 'ACTIVO',
    createdAt: new Date().toISOString()
  },
  {
    id: 'aff-init-3',
    dni: '32456789',
    matricula: 'M-1042',
    fullName: 'Dra. María Elena Gómez',
    phone: '5491144445555',
    email: 'maria.gomez@fonoaudiologia.org',
    status: 'ACTIVO',
    createdAt: new Date().toISOString()
  }
];

export class AffiliatesService {
  private static listeners: Array<(affiliates: Affiliate[]) => void> = [];

  private static loadFromStorage(): Affiliate[] {
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
    this.saveToStorage(INITIAL_AFFILIATES);
    return INITIAL_AFFILIATES;
  }

  private static saveToStorage(list: Affiliate[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
    this.notifyListeners(list);
  }

  private static notifyListeners(list: Affiliate[]) {
    const sorted = [...list].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    this.listeners.forEach((cb) => {
      try {
        cb(sorted);
      } catch (e) {
        console.error(e);
      }
    });
  }

  public static async refreshFromBackend(): Promise<void> {
    try {
      const res = await api.get('/affiliates');
      const raw = res?.data;
      const list: Affiliate[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      if (list && list.length > 0) {
        this.saveToStorage(list);
      }
    } catch {
      // Backend not reachable
    }
  }

  public static subscribeAffiliates(callback: (affiliates: Affiliate[]) => void): () => void {
    this.listeners.push(callback);

    const current = this.loadFromStorage();
    callback([...current].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')));

    // Refresh from backend DB
    this.refreshFromBackend();

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
              const remoteList: Affiliate[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                  id: docSnap.id,
                  dni: data.dni || '',
                  matricula: data.matricula || '',
                  fullName: data.fullName || '',
                  phone: data.phone || '',
                  email: data.email || '',
                  status: data.status || 'ACTIVO',
                  createdAt: data.createdAt || new Date().toISOString()
                };
              });
              this.saveToStorage(remoteList);
            }
          },
          () => {}
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

  public static async getAffiliates(searchQuery?: string): Promise<Affiliate[]> {
    let list = this.loadFromStorage();

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.dni.includes(q) ||
          a.matricula.toLowerCase().includes(q) ||
          a.fullName.toLowerCase().includes(q) ||
          (a.email && a.email.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }

  public static async createAffiliate(data: Omit<Affiliate, 'id' | 'createdAt'>): Promise<Affiliate> {
    const list = this.loadFromStorage();
    const now = new Date().toISOString();
    const id = `aff-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newAffiliate: Affiliate = {
      id,
      dni: data.dni.trim(),
      matricula: data.matricula.trim(),
      fullName: data.fullName.trim(),
      phone: data.phone?.trim() || '',
      email: data.email?.trim() || '',
      status: data.status || 'ACTIVO',
      createdAt: now
    };

    const existingIndex = list.findIndex(
      (a) => a.dni === newAffiliate.dni || a.matricula.toLowerCase() === newAffiliate.matricula.toLowerCase()
    );

    let updatedList: Affiliate[];
    if (existingIndex >= 0) {
      updatedList = [...list];
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...newAffiliate, id: updatedList[existingIndex].id };
    } else {
      updatedList = [newAffiliate, ...list];
    }

    this.saveToStorage(updatedList);

    // REST API call
    try {
      await api.post('/affiliates', newAffiliate);
    } catch {
      // ignore
    }

    // Firestore sync
    try {
      if (db) {
        const colRef = collection(db, COLLECTION_NAME);
        const newDocRef = doc(colRef, newAffiliate.id);
        setDoc(newDocRef, newAffiliate).catch(() => {});
      }
    } catch {
      // ignore
    }

    return newAffiliate;
  }

  public static async updateAffiliate(id: string, data: Partial<Affiliate>): Promise<void> {
    const list = this.loadFromStorage();
    const updatedList = list.map((a) => (a.id === id ? { ...a, ...data } : a));
    this.saveToStorage(updatedList);

    // REST API call
    try {
      await api.patch(`/affiliates/${id}`, data);
    } catch {
      // ignore
    }

    // Firestore sync
    try {
      if (db) {
        const docRef = doc(db, COLLECTION_NAME, id);
        const updateData: any = { ...data };
        delete updateData.id;
        updateDoc(docRef, updateData).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  public static async deleteAffiliate(id: string): Promise<void> {
    const list = this.loadFromStorage();
    const updatedList = list.filter((a) => a.id !== id);
    this.saveToStorage(updatedList);

    // REST API call
    try {
      await api.delete(`/affiliates/${id}`);
    } catch {
      // ignore
    }

    // Firestore sync
    try {
      if (db) {
        const docRef = doc(db, COLLECTION_NAME, id);
        deleteDoc(docRef).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  public static async importFromCSVText(csvText: string): Promise<{ created: number; skipped: number }> {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return { created: 0, skipped: 0 };

    let created = 0;
    let skipped = 0;

    const header = lines[0].toLowerCase().split(/[,;]/).map((h) => h.trim());
    const dniIdx = header.findIndex((h) => h.includes('dni') || h.includes('documento'));
    const matIdx = header.findIndex((h) => h.includes('mat') || h.includes('matricula'));
    const nameIdx = header.findIndex((h) => h.includes('nom') || h.includes('apellido') || h.includes('nombre'));
    const phoneIdx = header.findIndex((h) => h.includes('tel') || h.includes('cel') || h.includes('phone'));
    const emailIdx = header.findIndex((h) => h.includes('mail') || h.includes('correo'));

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const dni = dniIdx >= 0 ? cols[dniIdx] : cols[0];
      const matricula = matIdx >= 0 ? cols[matIdx] : cols[1];
      const fullName = nameIdx >= 0 ? cols[nameIdx] : cols[2];
      const phone = phoneIdx >= 0 ? cols[phoneIdx] : cols[3] || '';
      const email = emailIdx >= 0 ? cols[emailIdx] : cols[4] || '';

      if (dni && matricula && fullName) {
        try {
          await this.createAffiliate({
            dni,
            matricula,
            fullName,
            phone,
            email,
            status: 'ACTIVO'
          });
          created++;
        } catch {
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    return { created, skipped };
  }
}
