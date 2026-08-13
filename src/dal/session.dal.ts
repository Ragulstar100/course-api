import { Session } from '@shopify/shopify-api';
import { dbGet, dbRun, dbAll } from './db.js';

/**
 * Custom Session Storage using our centralized SQLite database
 * Implements the @shopify/shopify-api SessionStorage interface
 */
export class SQLiteSessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    try {
      const query = `
        INSERT INTO shopify_sessions (id, shop, state, isOnline, scope, accessToken, expires, onlineAccessInfo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          shop = excluded.shop,
          state = excluded.state,
          isOnline = excluded.isOnline,
          scope = excluded.scope,
          accessToken = excluded.accessToken,
          expires = excluded.expires,
          onlineAccessInfo = excluded.onlineAccessInfo
      `;

      await dbRun(query, [
        session.id,
        session.shop,
        session.state,
        session.isOnline ? 1 : 0,
        session.scope || null,
        session.accessToken || null,
        session.expires ? session.expires.getTime() : null,
        session.onlineAccessInfo ? JSON.stringify(session.onlineAccessInfo) : null,
      ]);
      return true;
    } catch (error) {
      console.error('Error storing Shopify session in DB:', error);
      return false;
    }
  }

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      const row = await dbGet<any>('SELECT * FROM shopify_sessions WHERE id = ?', [id]);
      if (!row) return undefined;

      const sessionParams: any = {
        id: row.id,
        shop: row.shop,
        state: row.state,
        isOnline: row.isOnline === 1,
        scope: row.scope,
        accessToken: row.accessToken,
      };
      if (row.expires) {
        sessionParams.expires = new Date(row.expires);
      }
      const session = new Session(sessionParams);

      if (row.onlineAccessInfo) {
        session.onlineAccessInfo = JSON.parse(row.onlineAccessInfo);
      }

      return session;
    } catch (error) {
      console.error('Error loading Shopify session from DB:', error);
      return undefined;
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      await dbRun('DELETE FROM shopify_sessions WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting Shopify session from DB:', error);
      return false;
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      if (ids.length === 0) return true;
      const placeholders = ids.map(() => '?').join(',');
      await dbRun(`DELETE FROM shopify_sessions WHERE id IN (${placeholders})`, ids);
      return true;
    } catch (error) {
      console.error('Error deleting multiple Shopify sessions from DB:', error);
      return false;
    }
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    try {
      const rows = await dbAll<any>('SELECT * FROM shopify_sessions WHERE shop = ?', [shop]);
      return rows.map((row) => {
        const sessionParams: any = {
          id: row.id,
          shop: row.shop,
          state: row.state,
          isOnline: row.isOnline === 1,
          scope: row.scope,
          accessToken: row.accessToken,
        };
        if (row.expires) {
          sessionParams.expires = new Date(row.expires);
        }
        const session = new Session(sessionParams);
        if (row.onlineAccessInfo) {
          session.onlineAccessInfo = JSON.parse(row.onlineAccessInfo);
        }
        return session;
      });
    } catch (error) {
      console.error('Error finding Shopify sessions by shop in DB:', error);
      return [];
    }
  }
}
