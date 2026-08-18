import { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import { shopifyConfig } from '../../config.js';
import { selectStudentByIdSimple } from '../dal/student.dal.js';
import { normalizeShop } from '../service/shopify.service.js';

// Extend express Request interface
declare global {
  namespace Express {
    interface Request {
      shop?: string;
      studentId?: string;
      shopifySession?: any;
    }
  }
}

// ==========================================
// CUSTOM JWT UTILITIES (Zero-dependency)
// ==========================================

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function signJwt(payload: any, secret: string, expiresInSeconds: number = 86400): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto.createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt(token: string, secret: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts as [string, string, string];
    
    const expectedSignature = crypto.createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
      
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Check expiration
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }
    
    return payload;
  } catch (e) {
    return null;
  }
}

// ==========================================
// MIDDLEWARES
// ==========================================

/**
 * Middleware for Shopify Merchant Admin Endpoints
 * Decodes the Bearer JWT. Works for:
 * 1. Shopify App Bridge JWT (verified against Shopify Secret)
 * 2. Simulated Admin JWT (verified against App's JWT Secret)
 * 3. Fallback to X-Shop-Domain header for testing
 */
export async function shopifyAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const shopHeader = req.headers['x-shop-domain'] as string;

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }


  // Case 1: Simple shop header provided (e.g. for development or basic queries)
  if (!token && shopHeader) {
    req.shop = normalizeShop(shopHeader);
    return next();
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthenticated. Missing token or shop domain.' });
    return;
  }

  // Case 2: Custom JWT signed by our own server (Simulated mode)
  const appVerified = verifyJwt(token, shopifyConfig.jwtSecret);
  if (appVerified && appVerified.shop) {
    req.shop = normalizeShop(appVerified.shop);
    return next();
  }

  // Case 3: Real Shopify App Bridge JWT
  // Shopify App Bridge session tokens are JWTs signed with the Shopify Client Secret
  try {
    const shopifyVerified = verifyJwt(token, shopifyConfig.apiSecret);
    if (shopifyVerified) {
      // Shopify JWT payloads contain dest URL e.g. "https://shop-domain.myshopify.com/admin"
      if (shopifyVerified.dest) {
        const destUrl = new URL(shopifyVerified.dest);
        req.shop = normalizeShop(destUrl.hostname);
        return next();
      }
    }
  } catch (e) {
    // Session token validation failed, proceed to error
  }

  res.status(401).json({ error: 'Authentication failed. Invalid session token.' });
}

/**
 * Middleware for Student Portal Endpoints
 * Verifies the Student JWT token.
 */
export async function studentAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. Student token missing.' });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyJwt(token, shopifyConfig.jwtSecret);

  if (!decoded || !decoded.studentId) {
    res.status(401).json({ error: 'Access denied. Invalid or expired student token.' });
    return;
  }

  // Validate student actually exists in the database
  const student = await selectStudentByIdSimple(decoded.studentId);
  if (!student || student.studentStatus !== 'Active') {
    res.status(403).json({ error: 'Access denied. Account is inactive or does not exist.' });
    return;
  }

  req.studentId = decoded.studentId;
  next();
}
