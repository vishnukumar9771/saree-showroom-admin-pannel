import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_ACTIVITIES,
  INITIAL_CATEGORIES,
  INITIAL_COLLECTIONS,
  INITIAL_COUPONS,
  INITIAL_CUSTOMERS,
  INITIAL_ENQUIRIES,
  INITIAL_EXPENSES,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_ROLES,
  INITIAL_SETTINGS,
  INITIAL_SITE_CONTENT,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SUPPLIERS,
  INITIAL_WISHLIST_INSIGHTS,
} from './src/data/seedData';
import type {
  ActivityLog,
  AdminModuleKey,
  Category,
  Collection,
  Coupon,
  Customer,
  Enquiry,
  Expense,
  Order,
  OrderStatus,
  Product,
  PurchaseOrder,
  StaffAccount,
  StaffRoleName,
  StockMovement,
  StoreSettings,
  SiteContent,
  Supplier,
  WishlistInsight,
} from './src/types/domain';

interface StoredStaffCredential extends StaffAccount {
  passwordHash: string;
}

interface ActiveSession {
  tokenId: string;
  staffId: string;
  expiresAt: number;
}

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours default
const EXTENDED_SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours when Remember Session is selected

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function timingSafeCompareString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function signToken(tokenId: string, staffId: string): string {
  const payload = Buffer.from(JSON.stringify({ tokenId, staffId })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyTokenSignature(token: string): { tokenId: string; staffId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (!timingSafeCompareString(sig, expectedSig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof parsed.tokenId === 'string' && typeof parsed.staffId === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function getPermissionsForRole(role: StaffRoleName): AdminModuleKey[] {
  return INITIAL_ROLES.find((r) => r.role === role)?.permissions ?? [];
}

function sanitizeStaff(staff: StoredStaffCredential): StaffAccount {
  const { passwordHash: _omit, ...safe } = staff;
  return safe;
}

// Server-side application store (cleanly structured for Supabase PostgreSQL cutover)
const store = {
  staffCredentials: [] as StoredStaffCredential[],
  sessions: new Map<string, ActiveSession>(),
  products: structuredClone(INITIAL_PRODUCTS) as Product[],
  collections: structuredClone(INITIAL_COLLECTIONS) as Collection[],
  categories: structuredClone(INITIAL_CATEGORIES) as Category[],
  stockMovements: structuredClone(INITIAL_STOCK_MOVEMENTS) as StockMovement[],
  orders: structuredClone(INITIAL_ORDERS) as Order[],
  customers: structuredClone(INITIAL_CUSTOMERS) as Customer[],
  wishlistInsights: structuredClone(INITIAL_WISHLIST_INSIGHTS) as WishlistInsight[],
  coupons: structuredClone(INITIAL_COUPONS) as Coupon[],
  siteContent: structuredClone(INITIAL_SITE_CONTENT) as SiteContent,
  enquiries: structuredClone(INITIAL_ENQUIRIES) as Enquiry[],
  expenses: structuredClone(INITIAL_EXPENSES) as Expense[],
  suppliers: structuredClone(INITIAL_SUPPLIERS) as Supplier[],
  purchaseOrders: structuredClone(INITIAL_PURCHASE_ORDERS) as PurchaseOrder[],
  settings: structuredClone(INITIAL_SETTINGS) as StoreSettings,
  activities: structuredClone(INITIAL_ACTIVITIES) as ActivityLog[],
};

function logActivity(actor: string, action: string, target: string): void {
  store.activities.unshift({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor,
    action,
    target,
    timestamp: new Date().toISOString(),
  });
  if (store.activities.length > 40) {
    store.activities = store.activities.slice(0, 40);
  }
}

interface AuthedRequest extends Request {
  adminUser?: StoredStaffCredential;
  sessionTokenId?: string;
}

function authenticateToken(req: Request): { staff: StoredStaffCredential; tokenId: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const rawToken = authHeader.slice(7).trim();
  const parsed = verifyTokenSignature(rawToken);
  if (!parsed) return null;
  const session = store.sessions.get(parsed.tokenId);
  if (!session || session.expiresAt < Date.now()) {
    if (session) store.sessions.delete(parsed.tokenId);
    return null;
  }
  const staff = store.staffCredentials.find((s) => s.id === session.staffId && s.status === 'Active');
  if (!staff) return null;
  return { staff, tokenId: parsed.tokenId };
}

function requireAdminAuth(requiredModule?: AdminModuleKey) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const auth = authenticateToken(req);
    if (!auth) {
      res.status(401).json({ error: 'Authentication required. Please sign in to the Admin Portal.' });
      return;
    }
    if (requiredModule) {
      const perms = getPermissionsForRole(auth.staff.role);
      if (!perms.includes(requiredModule)) {
        res.status(403).json({
          error: 'Access denied. Your role does not have permission for this module.',
          requiredModule,
          role: auth.staff.role,
        });
        return;
      }
    }
    req.adminUser = auth.staff;
    req.sessionTokenId = auth.tokenId;
    next();
  };
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  const uploadsRootDir = path.resolve(process.cwd(), 'uploads');
  const productUploadsDir = path.resolve(uploadsRootDir, 'products');
  fs.mkdirSync(productUploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsRootDir));

  const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const envPasscode = (process.env.ADMIN_BOOTSTRAP_PASSCODE || '').trim();

  // =========================================================================
  // 1. ADMIN AUTHENTICATION & RBAC (ADMIN PANEL ONLY)
  // =========================================================================
  app.get('/api/admin/auth/status', (req, res) => {
    const auth = authenticateToken(req);
    const needsInitialSetup = store.staffCredentials.length === 0 && !envPasscode;
    res.json({
      needsInitialSetup,
      supabaseConfigured,
      envPasscodeConfigured: Boolean(envPasscode),
      sessionUser: auth ? sanitizeStaff(auth.staff) : null,
      permissions: auth ? getPermissionsForRole(auth.staff.role) : [],
    });
  });

  app.post('/api/admin/auth/setup', (req, res) => {
    if (store.staffCredentials.length > 0 || envPasscode) {
      res.status(409).json({ error: 'Initial administrator account has already been claimed.' });
      return;
    }
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!name || !email.includes('@') || password.length < 8) {
      res.status(400).json({ error: 'Provide a valid name, email address, and a password of at least 8 characters.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const staff: StoredStaffCredential = {
      id: `staff-${Date.now()}`,
      name,
      email,
      role: 'Super Admin',
      status: 'Active',
      passwordHash: hashPassword(password),
      lastLoginAt: nowIso,
      createdAt: nowIso,
    };
    store.staffCredentials.push(staff);

    const tokenId = crypto.randomUUID();
    const expiresAt = Date.now() + SESSION_TTL_MS;
    store.sessions.set(tokenId, { tokenId, staffId: staff.id, expiresAt });
    const token = signToken(tokenId, staff.id);

    logActivity(staff.name, 'Initial Super Admin claimed & authenticated', staff.email);
    res.status(201).json({
      token,
      user: sanitizeStaff(staff),
      permissions: getPermissionsForRole(staff.role),
      expiresAt: new Date(expiresAt).toISOString(),
    });
  });

  app.post('/api/admin/auth/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const rememberSession = Boolean(req.body?.rememberSession);
    const ttlMs = rememberSession ? EXTENDED_SESSION_TTL_MS : SESSION_TTL_MS;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    // Check configured env passcode override first if set
    if (envPasscode && timingSafeCompareString(password, envPasscode)) {
      let staff = store.staffCredentials.find((s) => s.email === email);
      if (!staff) {
        const nowIso = new Date().toISOString();
        staff = {
          id: `staff-env-${Date.now()}`,
          name: 'Atelier Administrator',
          email,
          role: 'Super Admin',
          status: 'Active',
          passwordHash: hashPassword(password),
          lastLoginAt: nowIso,
          createdAt: nowIso,
        };
        store.staffCredentials.push(staff);
      } else {
        staff.lastLoginAt = new Date().toISOString();
      }
      const tokenId = crypto.randomUUID();
      const expiresAt = Date.now() + ttlMs;
      store.sessions.set(tokenId, { tokenId, staffId: staff.id, expiresAt });
      res.json({
        token: signToken(tokenId, staff.id),
        user: sanitizeStaff(staff),
        permissions: getPermissionsForRole(staff.role),
        expiresAt: new Date(expiresAt).toISOString(),
      });
      return;
    }

    const staff = store.staffCredentials.find((s) => s.email === email);
    if (!staff || !verifyPassword(password, staff.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (staff.status !== 'Active') {
      res.status(403).json({ error: 'This administrator account has been suspended.' });
      return;
    }

    staff.lastLoginAt = new Date().toISOString();
    const tokenId = crypto.randomUUID();
    const expiresAt = Date.now() + ttlMs;
    store.sessions.set(tokenId, { tokenId, staffId: staff.id, expiresAt });
    logActivity(staff.name, 'Signed in to Admin Portal', staff.role);

    res.json({
      token: signToken(tokenId, staff.id),
      user: sanitizeStaff(staff),
      permissions: getPermissionsForRole(staff.role),
      expiresAt: new Date(expiresAt).toISOString(),
    });
  });

  app.post('/api/admin/auth/forgot-password', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Enter a valid staff email address.' });
      return;
    }
    logActivity('Security', 'Password reset requested', email);
    res.json({
      message: supabaseConfigured
        ? 'If an account matches that email, a Supabase recovery link has been dispatched.'
        : 'Reset request logged. In preview mode, ask your Super Admin to reset credentials in Settings or set ADMIN_BOOTSTRAP_PASSCODE.',
    });
  });

  app.post('/api/admin/auth/logout', (req: AuthedRequest, res) => {
    const auth = authenticateToken(req);
    if (auth) {
      store.sessions.delete(auth.tokenId);
    }
    res.json({ ok: true });
  });

  app.get('/api/admin/auth/me', requireAdminAuth(), (req: AuthedRequest, res) => {
    const user = req.adminUser!;
    res.json({
      user: sanitizeStaff(user),
      permissions: getPermissionsForRole(user.role),
    });
  });

  // =========================================================================
  // 3. ADMIN PROTECTED DATA & MUTATIONS
  // =========================================================================
  app.get('/api/admin/bootstrap', requireAdminAuth('dashboard'), (_req, res) => {
    res.json({
      products: store.products,
      collections: store.collections,
      categories: store.categories,
      stockMovements: store.stockMovements,
      orders: store.orders,
      customers: store.customers,
      wishlistInsights: store.wishlistInsights,
      coupons: store.coupons,
      siteContent: store.siteContent,
      enquiries: store.enquiries,
      expenses: store.expenses,
      suppliers: store.suppliers,
      purchaseOrders: store.purchaseOrders,
      settings: store.settings,
      staffAccounts: store.staffCredentials.map(sanitizeStaff),
      roles: INITIAL_ROLES,
      activities: store.activities,
    });
  });

  // Authenticated Saree Image Upload (JPG, JPEG, PNG, WEBP up to 8 MB)
  app.post('/api/admin/uploads', requireAdminAuth('products'), (req: AuthedRequest, res) => {
    const filename = String(req.body?.filename || 'saree-image.jpg').trim();
    const mimeType = String(req.body?.mimeType || '').toLowerCase().trim();
    const dataBase64 = String(req.body?.dataBase64 || '');

    const allowedMimes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = allowedMimes[mimeType];
    if (!ext) {
      res.status(400).json({ error: 'Unsupported image format. Only JPG, JPEG, PNG, and WEBP are allowed.' });
      return;
    }

    const cleanBase64 = dataBase64.replace(/^data:[^;]+;base64,/, '');
    if (!cleanBase64) {
      res.status(400).json({ error: 'Image data payload is required.' });
      return;
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    if (buffer.length === 0 || buffer.length > 8 * 1024 * 1024) {
      res.status(400).json({ error: 'Image size must be between 1 byte and 8 MB.' });
      return;
    }

    // Verify file magic bytes
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp =
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    if ((ext === 'jpg' && !isJpeg) || (ext === 'png' && !isPng) || (ext === 'webp' && !isWebp)) {
      res.status(400).json({ error: 'File contents do not match the declared image format.' });
      return;
    }

    const baseName = path
      .basename(filename, path.extname(filename))
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 48) || 'saree';
    const storedFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${baseName}.${ext}`;
    const resolvedTarget = path.resolve(productUploadsDir, storedFileName);
    if (!resolvedTarget.startsWith(productUploadsDir + path.sep)) {
      res.status(400).json({ error: 'Invalid upload path.' });
      return;
    }

    fs.writeFileSync(resolvedTarget, buffer);
    logActivity(req.adminUser!.name, 'Uploaded saree product image', filename);
    res.status(201).json({
      url: `/uploads/products/${storedFileName}`,
      filename,
    });
  });

  // Products
  app.post('/api/admin/products', requireAdminAuth('products'), (req: AuthedRequest, res) => {
    const data = req.body as Partial<Product>;
    if (!data.name || !data.sku) {
      res.status(400).json({ error: 'Product name and SKU are required.' });
      return;
    }
    const images = Array.isArray(data.images) ? data.images.filter((u) => typeof u === 'string' && u.trim()) : [];
    if (images.length > 8) {
      res.status(400).json({ error: 'A maximum of 8 images is allowed per product.' });
      return;
    }
    const targetStatus = data.status || 'Draft';
    if (targetStatus === 'Published' && images.length === 0) {
      res.status(400).json({ error: 'At least one product image is required before publishing a saree.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const sellingPrice = Number(data.sellingPrice || 0);
    const mrp = Math.max(sellingPrice, Number(data.mrp || sellingPrice));
    const discountPercent = mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

    const product: Product = {
      id: `prod-${Date.now()}`,
      name: data.name,
      sku: data.sku,
      slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: data.description || '',
      categoryId: data.categoryId || store.categories[0]?.id || '',
      collectionId: data.collectionId || store.collections[0]?.id || '',
      sellingPrice,
      mrp,
      discountPercent,
      stockQuantity: Math.max(0, Number(data.stockQuantity || 0)),
      lowStockThreshold: Math.max(1, Number(data.lowStockThreshold || 3)),
      fabric: data.fabric || 'Pure Mulberry Silk',
      sareeType: data.sareeType || 'Handloom Saree',
      color: data.color || 'Burgundy & Gold',
      occasion: data.occasion || 'Festive & Bridal',
      length: data.length || '6.3 meters (incl. blouse)',
      blouseDetails: data.blouseDetails || 'Unstitched matching silk blouse piece',
      careInstructions: data.careInstructions || 'Dry clean only.',
      featured: Boolean(data.featured),
      bestseller: Boolean(data.bestseller),
      newArrival: Boolean(data.newArrival),
      images,
      imageDetails: Array.isArray(data.imageDetails) ? data.imageDetails.slice(0, 8) : undefined,
      seoTitle: data.seoTitle || `${data.name} | AARANYA`,
      seoDescription: data.seoDescription || data.description || '',
      status: targetStatus,
      provenance: data.provenance,
      salesCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.products.unshift(product);
    logActivity(req.adminUser!.name, 'Created new saree product', `${product.name} (${product.sku})`);
    res.status(201).json({ product });
  });

  app.put('/api/admin/products/:id', requireAdminAuth('products'), (req: AuthedRequest, res) => {
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const existing = store.products[idx];
    const patch = req.body as Partial<Product>;
    const nextImages =
      patch.images !== undefined
        ? patch.images.filter((u) => typeof u === 'string' && u.trim())
        : existing.images;
    if (nextImages.length > 8) {
      res.status(400).json({ error: 'A maximum of 8 images is allowed per product.' });
      return;
    }
    const nextStatus = patch.status ?? existing.status;
    if (nextStatus === 'Published' && nextImages.length === 0) {
      res.status(400).json({ error: 'At least one product image is required before publishing a saree.' });
      return;
    }

    const sellingPrice = patch.sellingPrice !== undefined ? Number(patch.sellingPrice) : existing.sellingPrice;
    const mrp = patch.mrp !== undefined ? Math.max(sellingPrice, Number(patch.mrp)) : existing.mrp;
    const discountPercent = mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

    const updated: Product = {
      ...existing,
      ...patch,
      id: existing.id,
      images: nextImages,
      sellingPrice,
      mrp,
      discountPercent,
      updatedAt: new Date().toISOString(),
    };
    store.products[idx] = updated;
    logActivity(req.adminUser!.name, 'Updated product', `${updated.name} · ${updated.status}`);
    res.json({ product: updated });
  });

  app.delete('/api/admin/products/:id', requireAdminAuth('products'), (req: AuthedRequest, res) => {
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const [removed] = store.products.splice(idx, 1);
    logActivity(req.adminUser!.name, 'Deleted product', removed.name);
    res.json({ ok: true });
  });

  app.post('/api/admin/products/bulk', requireAdminAuth('products'), (req: AuthedRequest, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x: unknown): x is string => typeof x === 'string') : [];
    const action = String(req.body?.action || '');
    if (ids.length === 0) {
      res.status(400).json({ error: 'Select at least one saree for bulk action.' });
      return;
    }
    const idSet = new Set(ids);
    const nowIso = new Date().toISOString();

    if (action === 'publish') {
      const missingImages = store.products.filter((p) => idSet.has(p.id) && p.images.length === 0);
      if (missingImages.length > 0) {
        res.status(400).json({
          error: `Cannot publish "${missingImages[0].name}" without at least 1 product image.`,
        });
        return;
      }
      store.products.forEach((p) => {
        if (idSet.has(p.id)) {
          p.status = 'Published';
          p.updatedAt = nowIso;
        }
      });
    } else if (action === 'unpublish') {
      store.products.forEach((p) => {
        if (idSet.has(p.id)) {
          p.status = 'Draft';
          p.updatedAt = nowIso;
        }
      });
    } else if (action === 'archive') {
      store.products.forEach((p) => {
        if (idSet.has(p.id)) {
          p.status = 'Archived';
          p.updatedAt = nowIso;
        }
      });
    } else if (action === 'delete') {
      store.products = store.products.filter((p) => !idSet.has(p.id));
    } else {
      res.status(400).json({ error: 'Invalid bulk action.' });
      return;
    }

    logActivity(req.adminUser!.name, `Bulk product action: ${action}`, `${ids.length} saree(s)`);
    res.json({ ok: true, count: ids.length });
  });

  // Collections
  app.post('/api/admin/collections', requireAdminAuth('collections'), (req: AuthedRequest, res) => {
    const data = req.body as Partial<Collection>;
    const collection: Collection = {
      id: `col-${Date.now()}`,
      name: data.name || 'Untitled Collection',
      slug: data.slug || (data.name || 'collection').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: data.description || '',
      coverImage: data.coverImage || '/src/assets/images/saree_kanjeevaram_ivory_1795451654421.jpg',
      displayOrder: Number(data.displayOrder || store.collections.length + 1),
      featured: Boolean(data.featured),
      productIds: Array.isArray(data.productIds) ? data.productIds : [],
      status: data.status || 'Active',
    };
    store.collections.push(collection);
    logActivity(req.adminUser!.name, 'Created collection', collection.name);
    res.status(201).json({ collection });
  });

  app.put('/api/admin/collections/:id', requireAdminAuth('collections'), (req: AuthedRequest, res) => {
    const idx = store.collections.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Collection not found.' });
      return;
    }
    store.collections[idx] = { ...store.collections[idx], ...req.body, id: req.params.id };
    if (Array.isArray(req.body.productIds)) {
      const assignedIds = new Set<string>(req.body.productIds);
      store.products.forEach((p) => {
        if (assignedIds.has(p.id)) p.collectionId = req.params.id;
      });
    }
    logActivity(req.adminUser!.name, 'Updated collection', store.collections[idx].name);
    res.json({ collection: store.collections[idx] });
  });

  app.delete('/api/admin/collections/:id', requireAdminAuth('collections'), (req: AuthedRequest, res) => {
    store.collections = store.collections.filter((c) => c.id !== req.params.id);
    logActivity(req.adminUser!.name, 'Deleted collection', req.params.id);
    res.json({ ok: true });
  });

  // Categories
  app.post('/api/admin/categories', requireAdminAuth('categories'), (req: AuthedRequest, res) => {
    const data = req.body as Partial<Category>;
    const category: Category = {
      id: `cat-${Date.now()}`,
      name: data.name || 'Untitled Category',
      slug: data.slug || (data.name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: data.description || '',
      image: data.image || '/src/assets/images/saree_tussar_ochre_1795451654036.jpg',
      sortOrder: Number(data.sortOrder || store.categories.length + 1),
      status: data.status || 'Active',
    };
    store.categories.push(category);
    logActivity(req.adminUser!.name, 'Created category', category.name);
    res.status(201).json({ category });
  });

  app.put('/api/admin/categories/:id', requireAdminAuth('categories'), (req: AuthedRequest, res) => {
    const idx = store.categories.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    store.categories[idx] = { ...store.categories[idx], ...req.body, id: req.params.id };
    if (Array.isArray(req.body.productIds)) {
      const assignedIds = new Set<string>(req.body.productIds);
      store.products.forEach((p) => {
        if (assignedIds.has(p.id)) p.categoryId = req.params.id;
      });
    }
    logActivity(req.adminUser!.name, 'Updated category', store.categories[idx].name);
    res.json({ category: store.categories[idx] });
  });

  app.delete('/api/admin/categories/:id', requireAdminAuth('categories'), (req: AuthedRequest, res) => {
    store.categories = store.categories.filter((c) => c.id !== req.params.id);
    logActivity(req.adminUser!.name, 'Deleted category', req.params.id);
    res.json({ ok: true });
  });

  // Inventory adjustment
  app.post('/api/admin/inventory/adjust', requireAdminAuth('inventory'), (req: AuthedRequest, res) => {
    const { productId, mode, quantity, lowStockThreshold, reason, notes } = req.body || {};
    const product = store.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const qty = Math.max(0, Math.floor(Number(quantity || 0)));
    const prev = product.stockQuantity;
    let nextStock = prev;
    if (mode === 'Add') nextStock = prev + qty;
    else if (mode === 'Remove') nextStock = Math.max(0, prev - qty);
    else if (mode === 'Set') nextStock = qty;

    product.stockQuantity = nextStock;
    if (lowStockThreshold !== undefined) {
      product.lowStockThreshold = Math.max(1, Math.floor(Number(lowStockThreshold)));
    }
    product.updatedAt = new Date().toISOString();

    const movement: StockMovement = {
      id: `sm-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: mode,
      quantityDelta: nextStock - prev,
      previousStock: prev,
      newStock: nextStock,
      reason: String(reason || 'Manual Adjustment'),
      notes: String(notes || ''),
      performedBy: req.adminUser!.name,
      createdAt: new Date().toISOString(),
    };
    store.stockMovements.unshift(movement);
    logActivity(req.adminUser!.name, `Adjusted stock (${mode})`, `${product.sku}: ${prev} → ${nextStock}`);
    res.json({ product, movement });
  });

  // Orders
  app.put('/api/admin/orders/:id', requireAdminAuth('orders'), (req: AuthedRequest, res) => {
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const { fulfillmentStatus, paymentStatus, trackingNumber, courierPartner, cancellationReason, note } = req.body || {};
    if (fulfillmentStatus && fulfillmentStatus !== order.fulfillmentStatus) {
      order.fulfillmentStatus = fulfillmentStatus as OrderStatus;
      order.history.push({
        status: order.fulfillmentStatus,
        note: note || `Status updated to ${order.fulfillmentStatus}`,
        timestamp: new Date().toISOString(),
        updatedBy: req.adminUser!.name,
      });
    }
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (courierPartner !== undefined) order.courierPartner = courierPartner;
    if (cancellationReason !== undefined) order.cancellationReason = cancellationReason;

    logActivity(req.adminUser!.name, `Updated order ${order.orderNumber}`, order.fulfillmentStatus);
    res.json({ order });
  });

  // Customers
  app.put('/api/admin/customers/:id', requireAdminAuth('customers'), (req: AuthedRequest, res) => {
    const idx = store.customers.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    store.customers[idx] = { ...store.customers[idx], ...req.body, id: req.params.id };
    logActivity(req.adminUser!.name, 'Updated customer profile', store.customers[idx].name);
    res.json({ customer: store.customers[idx] });
  });

  // Coupons
  app.post('/api/admin/coupons', requireAdminAuth('coupons'), (req: AuthedRequest, res) => {
    const data = req.body as Partial<Coupon>;
    const coupon: Coupon = {
      id: `cpn-${Date.now()}`,
      code: String(data.code || 'AARANYA10').toUpperCase().trim(),
      description: data.description || '',
      discountType: data.discountType || 'Percentage',
      discountValue: Number(data.discountValue || 5),
      minOrderValue: Number(data.minOrderValue || 0),
      maxDiscountAmount: data.maxDiscountAmount ?? null,
      usageLimit: Number(data.usageLimit || 100),
      usedCount: 0,
      perCustomerLimit: Number(data.perCustomerLimit || 1),
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      expiryDate: data.expiryDate || '2027-03-31',
      active: data.active ?? true,
    };
    store.coupons.unshift(coupon);
    logActivity(req.adminUser!.name, 'Created privilege coupon', coupon.code);
    res.status(201).json({ coupon });
  });

  app.put('/api/admin/coupons/:id', requireAdminAuth('coupons'), (req: AuthedRequest, res) => {
    const idx = store.coupons.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }
    store.coupons[idx] = { ...store.coupons[idx], ...req.body, id: req.params.id };
    res.json({ coupon: store.coupons[idx] });
  });

  app.delete('/api/admin/coupons/:id', requireAdminAuth('coupons'), (req: AuthedRequest, res) => {
    store.coupons = store.coupons.filter((c) => c.id !== req.params.id);
    res.json({ ok: true });
  });

  // Website Content
  app.put('/api/admin/content', requireAdminAuth('content'), (req: AuthedRequest, res) => {
    store.siteContent = {
      ...store.siteContent,
      ...req.body,
      lastPublishedAt: new Date().toISOString(),
    };
    logActivity(req.adminUser!.name, 'Published storefront content updates', 'Live Website');
    res.json({ siteContent: store.siteContent });
  });

  // Enquiries
  app.put('/api/admin/enquiries/:id', requireAdminAuth('enquiries'), (req: AuthedRequest, res) => {
    const idx = store.enquiries.findIndex((e) => e.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }
    const current = store.enquiries[idx];
    const patch = req.body;
    const notes = [...current.notes];
    if (patch.newNote) {
      notes.unshift({
        id: `en-${Date.now()}`,
        author: req.adminUser!.name,
        text: String(patch.newNote),
        createdAt: new Date().toISOString(),
      });
    }
    const { newNote: _omit, ...restPatch } = patch;
    store.enquiries[idx] = { ...current, ...restPatch, notes, id: current.id };
    logActivity(req.adminUser!.name, 'Updated enquiry', `${current.customerName} · ${store.enquiries[idx].status}`);
    res.json({ enquiry: store.enquiries[idx] });
  });

  // Expenses
  app.post('/api/admin/expenses', requireAdminAuth('expenses'), (req: AuthedRequest, res) => {
    const data = req.body as Partial<Expense>;
    const expense: Expense = {
      id: `exp-${Date.now()}`,
      category: data.category || 'Miscellaneous',
      vendor: data.vendor || 'Vendor',
      amount: Number(data.amount || 0),
      date: data.date || new Date().toISOString().slice(0, 10),
      paymentStatus: data.paymentStatus || 'Paid',
      paymentMethod: data.paymentMethod || 'Bank Transfer',
      notes: data.notes || '',
      attachmentRef: data.attachmentRef || '',
    };
    store.expenses.unshift(expense);
    logActivity(req.adminUser!.name, 'Logged expense', `${expense.vendor} · ₹${expense.amount.toLocaleString('en-IN')}`);
    res.status(201).json({ expense });
  });

  app.put('/api/admin/expenses/:id', requireAdminAuth('expenses'), (req: AuthedRequest, res) => {
    const idx = store.expenses.findIndex((e) => e.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Expense not found.' });
      return;
    }
    store.expenses[idx] = { ...store.expenses[idx], ...req.body, id: req.params.id };
    res.json({ expense: store.expenses[idx] });
  });

  app.delete('/api/admin/expenses/:id', requireAdminAuth('expenses'), (req: AuthedRequest, res) => {
    store.expenses = store.expenses.filter((e) => e.id !== req.params.id);
    logActivity(req.adminUser!.name, 'Deleted expense entry', req.params.id);
    res.json({ ok: true });
  });

  // Suppliers & Purchase Orders
  app.post('/api/admin/suppliers', requireAdminAuth('suppliers'), (req: AuthedRequest, res) => {
    const data = req.body as Partial<Supplier>;
    const supplier: Supplier = {
      id: `sup-${Date.now()}`,
      name: data.name || 'Weaving Guild',
      craftCluster: data.craftCluster || '',
      contactPerson: data.contactPerson || '',
      phone: data.phone || '',
      email: data.email || '',
      outstandingBalance: Number(data.outstandingBalance || 0),
      totalPaid: Number(data.totalPaid || 0),
      notes: data.notes || '',
      active: data.active ?? true,
    };
    store.suppliers.unshift(supplier);
    logActivity(req.adminUser!.name, 'Added weaving supplier', supplier.name);
    res.status(201).json({ supplier });
  });

  app.put('/api/admin/suppliers/:id', requireAdminAuth('suppliers'), (req: AuthedRequest, res) => {
    const idx = store.suppliers.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Supplier not found.' });
      return;
    }
    store.suppliers[idx] = { ...store.suppliers[idx], ...req.body, id: req.params.id };
    logActivity(req.adminUser!.name, 'Updated supplier profile', store.suppliers[idx].name);
    res.json({ supplier: store.suppliers[idx] });
  });

  app.post('/api/admin/suppliers/:id/payment', requireAdminAuth('suppliers'), (req: AuthedRequest, res) => {
    const supplier = store.suppliers.find((s) => s.id === req.params.id);
    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found.' });
      return;
    }
    const amount = Math.max(0, Number(req.body?.amount || 0));
    supplier.outstandingBalance = Math.max(0, supplier.outstandingBalance - amount);
    supplier.totalPaid += amount;
    logActivity(req.adminUser!.name, 'Recorded supplier payment', `${supplier.name} · ₹${amount.toLocaleString('en-IN')}`);
    res.json({ supplier });
  });

  app.post('/api/admin/purchase-orders', requireAdminAuth('suppliers'), (req: AuthedRequest, res) => {
    const data = req.body as Partial<PurchaseOrder>;
    const supplier = store.suppliers.find((s) => s.id === data.supplierId);
    const items = Array.isArray(data.items) ? data.items : [];
    const totalAmount = items.reduce((sum, it) => sum + Number(it.orderedQty) * Number(it.unitCost), 0);
    const po: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-2026-0${93 + store.purchaseOrders.length}`,
      supplierId: data.supplierId || '',
      supplierName: supplier?.name || data.supplierName || 'Guild Supplier',
      items,
      totalAmount,
      paidAmount: Number(data.paidAmount || 0),
      status: 'Ordered',
      expectedDate: data.expectedDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      notes: data.notes || '',
    };
    if (supplier) {
      supplier.outstandingBalance += Math.max(0, totalAmount - po.paidAmount);
    }
    store.purchaseOrders.unshift(po);
    logActivity(req.adminUser!.name, 'Created purchase order', `${po.poNumber} · ${po.supplierName}`);
    res.status(201).json({ purchaseOrder: po });
  });

  app.post('/api/admin/purchase-orders/:id/receive', requireAdminAuth('suppliers'), (req: AuthedRequest, res) => {
    const po = store.purchaseOrders.find((p) => p.id === req.params.id);
    if (!po) {
      res.status(404).json({ error: 'Purchase order not found.' });
      return;
    }
    const receivedQuantities = req.body?.receivedQuantities as Record<string, number> | undefined;
    let allReceived = true;
    for (const item of po.items) {
      const addQty = Math.max(0, Math.floor(Number(receivedQuantities?.[item.productId] ?? 0)));
      const remaining = item.orderedQty - item.receivedQty;
      const actualAdd = Math.min(remaining, addQty);
      if (actualAdd > 0) {
        item.receivedQty += actualAdd;
        const prod = store.products.find((p) => p.id === item.productId);
        if (prod) {
          const prev = prod.stockQuantity;
          prod.stockQuantity += actualAdd;
          store.stockMovements.unshift({
            id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'Restock',
            quantityDelta: actualAdd,
            previousStock: prev,
            newStock: prod.stockQuantity,
            reason: `Incoming PO ${po.poNumber}`,
            notes: `Received from ${po.supplierName}`,
            performedBy: req.adminUser!.name,
            createdAt: new Date().toISOString(),
          });
        }
      }
      if (item.receivedQty < item.orderedQty) allReceived = false;
    }
    po.status = allReceived ? 'Received' : 'Partial';
    logActivity(req.adminUser!.name, `Logged incoming stock for ${po.poNumber}`, po.status);
    res.json({ purchaseOrder: po, products: store.products, stockMovements: store.stockMovements });
  });

  // Settings & Staff Accounts
  app.put('/api/admin/settings', requireAdminAuth('settings'), (req: AuthedRequest, res) => {
    store.settings = { ...store.settings, ...req.body };
    logActivity(req.adminUser!.name, 'Updated store configuration', 'Settings');
    res.json({ settings: store.settings });
  });

  app.post('/api/admin/staff', requireAdminAuth('settings'), (req: AuthedRequest, res) => {
    const { name, email, role, password } = req.body || {};
    if (!name || !email || !password || String(password).length < 8) {
      res.status(400).json({ error: 'Name, email, and password (min 8 chars) are required.' });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (store.staffCredentials.some((s) => s.email === normalizedEmail)) {
      res.status(409).json({ error: 'A staff account with this email already exists.' });
      return;
    }
    const newStaff: StoredStaffCredential = {
      id: `staff-${Date.now()}`,
      name: String(name),
      email: normalizedEmail,
      role: (role as StaffRoleName) || 'Atelier Manager',
      status: 'Active',
      passwordHash: hashPassword(String(password)),
      createdAt: new Date().toISOString(),
    };
    store.staffCredentials.push(newStaff);
    logActivity(req.adminUser!.name, 'Provisioned staff account', `${newStaff.name} (${newStaff.role})`);
    res.status(201).json({ staff: sanitizeStaff(newStaff) });
  });

  app.put('/api/admin/staff/:id', requireAdminAuth('settings'), (req: AuthedRequest, res) => {
    const target = store.staffCredentials.find((s) => s.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Staff account not found.' });
      return;
    }
    if (req.body.role) target.role = req.body.role;
    if (req.body.status) target.status = req.body.status;
    logActivity(req.adminUser!.name, 'Updated staff role/status', `${target.name} · ${target.role}`);
    res.json({ staff: sanitizeStaff(target) });
  });

  // =========================================================================
  // 4. VITE MIDDLEWARE (DEV) OR STATIC DIST (PROD)
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build artifacts not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AARANYA Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
