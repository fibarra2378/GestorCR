import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Affiliate } from '../types';

const COLLECTION_NAME = 'affiliates';

const INITIAL_AFFILIATES: Omit<Affiliate, 'id'>[] = [
  {
    dni: '26596615',
    matricula: '1340',
    fullName: 'Fernando Ibarra',
    phone: '342-4112233',
    email: 'fernandoibarra23@gmail.com',
    status: 'ACTIVO',
    createdAt: new Date().toISOString()
  },
  {
    dni: '28999111',
    matricula: 'M-0855',
    fullName: 'Lic. Carlos Roberto Spadaro',
    phone: '5491155556666',
    email: 'carlos.spadaro@fonoaudiologia.org',
    status: 'ACTIVO',
    createdAt: new Date().toISOString()
  },
  {
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
        for (const aff of INITIAL_AFFILIATES) {
          const newDocRef = doc(colRef);
          await setDoc(newDocRef, {
            ...aff,
            id: newDocRef.id,
            createdAt: new Date().toISOString()
          });
        }
        this.isSeeding = false;
      }
    } catch (e) {
      console.warn('[Firestore] Error en auto-seed de afiliados:', e);
      this.isSeeding = false;
    }
  }

  /**
   * Listen to real-time changes in affiliates collection
   */
  public static subscribeAffiliates(callback: (affiliates: Affiliate[]) => void): () => void {
    this.autoSeedIfEmpty();
    const colRef = collection(db, COLLECTION_NAME);

    try {
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        if (snapshot.empty && !this.isSeeding) {
          this.autoSeedIfEmpty();
        }
        const list: Affiliate[] = snapshot.docs.map((docSnap) => {
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

        // Sort by name or createdAt
        list.sort((a, b) => a.fullName.localeCompare(b.fullName));
        callback(list);
      }, (error) => {
        console.warn('[Firestore] Error en listener de afiliados:', error);
      });

      return unsubscribe;
    } catch (e) {
      console.warn('[Firestore] Fallback en listener:', e);
      return () => {};
    }
  }

  /**
   * Get all affiliates
   */
  public static async getAffiliates(searchQuery?: string): Promise<Affiliate[]> {
    await this.autoSeedIfEmpty();
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    let list: Affiliate[] = snapshot.docs.map((docSnap) => {
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

    list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return list;
  }

  /**
   * Create a new affiliate
   */
  public static async createAffiliate(data: Omit<Affiliate, 'id' | 'createdAt'>): Promise<Affiliate> {
    const colRef = collection(db, COLLECTION_NAME);
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();

    const newAffiliate: Affiliate = {
      id: newDocRef.id,
      dni: data.dni.trim(),
      matricula: data.matricula.trim(),
      fullName: data.fullName.trim(),
      phone: data.phone?.trim() || '',
      email: data.email?.trim() || '',
      status: data.status || 'ACTIVO',
      createdAt: now
    };

    await setDoc(newDocRef, newAffiliate);
    return newAffiliate;
  }

  /**
   * Update an existing affiliate
   */
  public static async updateAffiliate(id: string, data: Partial<Affiliate>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = { ...data };
    delete updateData.id;
    await updateDoc(docRef, updateData);
  }

  /**
   * Delete an affiliate
   */
  public static async deleteAffiliate(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  /**
   * Import affiliates from CSV text
   */
  public static async importFromCSVText(csvText: string): Promise<{ created: number; skipped: number }> {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return { created: 0, skipped: 0 };

    let created = 0;
    let skipped = 0;

    // Header index discovery
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
