import { Coordinates, Satellite, WeatherCondition, MainView } from '../types';

export interface TacticalEvent {
  id: string;
  timestamp: string;
  satName: string;
  satId: string;
  status: any;
  detail: string;
}

export interface ApplicationState {
  satellites: Satellite[];
  userLoc: Coordinates;
  selectedSatId: string;
  view: MainView;
  defcon: number;
  isTracking: boolean;
  weather: WeatherCondition;
  isJamming: boolean;
  jammingPower: number;
  isStealthMode: boolean;
  isNeuralCleaning: boolean;
  isDarkLinkActive: boolean;
  eventLogs: TacticalEvent[];
  timestamp: string; // ISO date string of recovery save
}

const DB_NAME = "satexpert_disaster_recovery_db";
const STORE_NAME = "app_state_store";
const STATE_KEY = "current_state";

export class IndexedDbService {
  private static openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onerror = () => {
        reject(request.error || new Error("Failed to open IndexedDB"));
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  public static async saveState(state: ApplicationState): Promise<void> {
    try {
      const db = await this.openDb();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(state, STATE_KEY);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error || new Error("Failed to save state"));
        };
      });
    } catch (e) {
      console.error("IndexedDB saveState failed:", e);
    }
  }

  public static async loadState(): Promise<ApplicationState | null> {
    try {
      const db = await this.openDb();
      return new Promise<ApplicationState | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(STATE_KEY);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(request.error || new Error("Failed to load state"));
        };
      });
    } catch (e) {
      console.error("IndexedDB loadState failed:", e);
      return null;
    }
  }

  public static async clearState(): Promise<void> {
    try {
      const db = await this.openDb();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(STATE_KEY);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error || new Error("Failed to clear state"));
        };
      });
    } catch (e) {
      console.error("IndexedDB clearState failed:", e);
    }
  }
}
