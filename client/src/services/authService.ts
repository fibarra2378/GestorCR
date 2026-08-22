import {
  collection,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

const STORAGE_KEY = 'gestorcr_users_store_v1';
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
  private static loadFromStorage(): (User & { passwordHash: string })[] {
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
    this.saveToStorage(INITIAL_USERS);
    return INITIAL_USERS;
  }

  private static saveToStorage(list: (User & { passwordHash: string })[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  public static async login(username: string, password: string): Promise<{ user: User; token: string } | null> {
    const cleanUser = username.trim().toLowerCase();
    const list = this.loadFromStorage();

    const found = list.find(
      (u) => (u.username || '').toLowerCase() === cleanUser && u.passwordHash === password
    );

    if (found) {
      const user: User = {
        id: found.id,
        username: found.username,
        name: found.name,
        role: found.role
      };
      return { user, token: `token_${found.id}_${Date.now()}` };
    }

    return null;
  }

  public static async getUsers(): Promise<User[]> {
    const list = this.loadFromStorage();
    return list.map(({ passwordHash, ...u }) => u);
  }

  public static async createUser(data: { username: string; password: string; name: string; role: 'ADMIN' | 'OPERADOR' }): Promise<User> {
    const list = this.loadFromStorage();
    const id = `user-${Date.now()}`;
    const newUser = {
      id,
      username: data.username.trim(),
      passwordHash: data.password,
      name: data.name.trim(),
      role: data.role
    };

    const updated = [...list, newUser];
    this.saveToStorage(updated);

    try {
      if (db) {
        const docRef = doc(collection(db, COLLECTION_NAME), id);
        setDoc(docRef, newUser).catch(() => {});
      }
    } catch {
      // ignore
    }

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role
    };
  }

  public static async deleteUser(id: string): Promise<void> {
    const list = this.loadFromStorage();
    const updated = list.filter((u) => u.id !== id);
    this.saveToStorage(updated);

    try {
      if (db) {
        const docRef = doc(db, COLLECTION_NAME, id);
        deleteDoc(docRef).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}
