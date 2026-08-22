import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

const COLLECTION_NAME = 'users';

const INITIAL_USERS: (User & { passwordHash: string })[] = [
  {
    id: 'user-admin-1',
    username: 'admin',
    passwordHash: 'admin123',
    name: 'Lic. Administrador Fonoaudiología',
    role: 'ADMIN'
  },
  {
    id: 'user-op-1',
    username: 'operador1',
    passwordHash: 'admin123',
    name: 'Operador de Atención',
    role: 'OPERADOR'
  }
];

export class AuthService {
  private static isSeeding = false;

  public static async autoSeedIfEmpty() {
    if (this.isSeeding) return;
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        this.isSeeding = true;
        for (const u of INITIAL_USERS) {
          const docRef = doc(colRef, u.id);
          await setDoc(docRef, u);
        }
        this.isSeeding = false;
      }
    } catch {
      this.isSeeding = false;
    }
  }

  public static async login(username: string, password: string):Promise<{ user: User; token: string } | null> {
    await this.autoSeedIfEmpty();
    const cleanUser = username.trim().toLowerCase();

    // 1. Direct match with initial demo users
    const fallbackUser = INITIAL_USERS.find(
      (u) => u.username.toLowerCase() === cleanUser && u.passwordHash === password
    );

    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snap = await getDocs(colRef);
      const foundDoc = snap.docs.find((d) => {
        const data = d.data();
        return (data.username || '').toLowerCase() === cleanUser && data.passwordHash === password;
      });

      if (foundDoc) {
        const data = foundDoc.data();
        const user: User = {
          id: foundDoc.id,
          username: data.username,
          name: data.name,
          role: data.role || 'OPERADOR'
        };
        const token = `firebase_token_${user.id}_${Date.now()}`;
        return { user, token };
      }
    } catch (e) {
      console.warn('[AuthService] Fallback a credenciales locales:', e);
    }

    if (fallbackUser) {
      const user: User = {
        id: fallbackUser.id,
        username: fallbackUser.username,
        name: fallbackUser.name,
        role: fallbackUser.role
      };
      return { user, token: `local_token_${fallbackUser.id}` };
    }

    return null;
  }

  public static async getUsers(): Promise<User[]> {
    await this.autoSeedIfEmpty();
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          username: data.username,
          name: data.name,
          role: data.role || 'OPERADOR'
        };
      });
    } catch {
      return INITIAL_USERS.map(({ passwordHash, ...u }) => u);
    }
  }

  public static async createUser(data: { username: string; password: string; name: string; role: 'ADMIN' | 'OPERADOR' }): Promise<User> {
    const colRef = collection(db, COLLECTION_NAME);
    const newDocRef = doc(colRef);
    const newUser = {
      id: newDocRef.id,
      username: data.username.trim(),
      passwordHash: data.password,
      name: data.name.trim(),
      role: data.role
    };

    await setDoc(newDocRef, newUser);
    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role
    };
  }

  public static async deleteUser(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
}
