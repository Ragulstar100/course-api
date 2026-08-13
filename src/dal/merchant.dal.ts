import { dbGet, dbRun, dbAll } from './db.js';
import type { MerchantStore, ShopifySession } from '../models/merchant.model.js';

// ==========================================
// STORE (MERCHANT) DB OPERATIONS
// ==========================================

export async function insertStore(store: MerchantStore): Promise<MerchantStore> {
  const query = `
    INSERT INTO stores (shop, name, email, createdAt, username, passwordHash)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(shop) DO UPDATE SET
      name = COALESCE(excluded.name, stores.name),
      email = COALESCE(excluded.email, stores.email),
      username = COALESCE(excluded.username, stores.username),
      passwordHash = COALESCE(excluded.passwordHash, stores.passwordHash)
  `;
  await dbRun(query, [
    store.shop,
    store.name || null,
    store.email || null,
    store.createdAt,
    store.username || null,
    store.passwordHash || null,
  ]);
  return store;
}

export async function selectStoreByShop(shop: string): Promise<MerchantStore | null> {
  const query = 'SELECT * FROM stores WHERE shop = ?';
  return dbGet<MerchantStore>(query, [shop]);
}

export async function selectStoreByUsername(username: string): Promise<MerchantStore | null> {
  const query = 'SELECT * FROM stores WHERE username = ?';
  return dbGet<MerchantStore>(query, [username]);
}

// ==========================================
// SHOPIFY SESSIONS DB OPERATIONS
// ==========================================

export async function insertSession(session: ShopifySession): Promise<void> {
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
    session.isOnline,
    session.scope || null,
    session.accessToken || null,
    session.expires || null,
    session.onlineAccessInfo || null,
  ]);
}

export async function selectSessionById(id: string): Promise<ShopifySession | null> {
  const query = 'SELECT * FROM shopify_sessions WHERE id = ?';
  return dbGet<ShopifySession>(query, [id]);
}

export async function deleteSessionById(id: string): Promise<void> {
  const query = 'DELETE FROM shopify_sessions WHERE id = ?';
  await dbRun(query, [id]);
}

export async function deleteSessionsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM shopify_sessions WHERE id IN (${placeholders})`;
  await dbRun(query, ids);
}

export async function selectSessionsByShop(shop: string): Promise<ShopifySession[]> {
  const query = 'SELECT * FROM shopify_sessions WHERE shop = ?';
  return dbAll<ShopifySession>(query, [shop]);
}
