export type ProductStatus = 'Published' | 'Draft' | 'Archived';

export type AdminModuleKey =
  | 'dashboard'
  | 'products'
  | 'collections'
  | 'categories'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'wishlist'
  | 'coupons'
  | 'content'
  | 'enquiries'
  | 'reports'
  | 'expenses'
  | 'suppliers'
  | 'settings';

export type StaffRoleName =
  | 'Super Admin'
  | 'Atelier Manager'
  | 'Inventory Curator'
  | 'Concierge Executive'
  | 'Finance & Accounts'
  | 'Storefront Viewer';

export interface RolePermissionMap {
  role: StaffRoleName;
  description: string;
  permissions: AdminModuleKey[];
}

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: StaffRoleName;
  status: 'Active' | 'Suspended';
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: StaffAccount;
  permissions: AdminModuleKey[];
  expiresAt: string;
}

export interface WeaverProvenance {
  masterWeaver: string;
  loomLocation: string;
  zariCertification: string;
  weaveDurationDays: number;
}

export type SareeImageView =
  | 'Main Product'
  | 'Front View'
  | 'Back View'
  | 'Border & Zari Details'
  | 'Fabric Close-up'
  | 'Model / Styling';

export interface ProductImageMeta {
  url: string;
  filename: string;
  viewType: SareeImageView;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description: string;
  categoryId: string;
  collectionId: string;
  sellingPrice: number;
  mrp: number;
  discountPercent: number;
  stockQuantity: number;
  lowStockThreshold: number;
  fabric: string;
  sareeType: string;
  color: string;
  occasion: string;
  length: string;
  blouseDetails: string;
  careInstructions: string;
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  images: string[];
  imageDetails?: ProductImageMeta[];
  seoTitle: string;
  seoDescription: string;
  status: ProductStatus;
  provenance?: WeaverProvenance;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  displayOrder: number;
  featured: boolean;
  productIds: string[];
  status: 'Active' | 'Hidden';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  sortOrder: number;
  status: 'Active' | 'Inactive';
  productCount?: number;
}

export type StockMovementType = 'Add' | 'Remove' | 'Set' | 'Order' | 'Restock';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: StockMovementType;
  quantityDelta: number;
  previousStock: number;
  newStock: number;
  reason: string;
  notes: string;
  performedBy: string;
  createdAt: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Return requested';

export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded' | 'COD Due';

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  image: string;
  price: number;
  quantity: number;
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  note: string;
  timestamp: string;
  updatedBy: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  gstAmount: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'Cash on Delivery';
  paymentStatus: PaymentStatus;
  fulfillmentStatus: OrderStatus;
  trackingNumber?: string;
  courierPartner?: string;
  cancellationReason?: string;
  createdAt: string;
  history: OrderHistoryEntry[];
}

export type CustomerSegment = 'VIP Collector' | 'Bridal Patron' | 'Repeat Buyer' | 'New';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  segment: CustomerSegment;
  totalSpent: number;
  ordersCount: number;
  lastOrderDate: string;
  notes: string;
  createdAt: string;
}

export interface WishlistInsight {
  productId: string;
  wishlistCount: number;
  uniqueCustomers: number;
  convertedOrders: number;
  weeklyTrend: number[];
  lastWishlistedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'Percentage' | 'Fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount: number | null;
  usageLimit: number;
  usedCount: number;
  perCustomerLimit: number;
  startDate: string;
  expiryDate: string;
  active: boolean;
}

export interface Testimonial {
  id: string;
  customerName: string;
  location: string;
  occasion: string;
  quote: string;
  featured: boolean;
}

export interface SiteContent {
  announcementBar: {
    enabled: boolean;
    text: string;
    linkLabel: string;
    linkHref: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    ctaLabel: string;
    ctaHref: string;
    image: string;
  };
  sections: {
    featuredCollectionsTitle: string;
    showFeaturedCollections: boolean;
    newArrivalsTitle: string;
    showNewArrivals: boolean;
    bestSellersTitle: string;
    showBestSellers: boolean;
    weddingCollectionTitle: string;
    weddingCollectionSubtitle: string;
    showWeddingCollection: boolean;
  };
  brandStory: {
    title: string;
    narrative: string;
    atelierCity: string;
    yearsOfCraft: string;
  };
  testimonials: Testimonial[];
  footer: {
    aboutText: string;
    conciergeEmail: string;
    conciergePhone: string;
    atelierAddress: string;
    copyrightText: string;
  };
  socialLinks: {
    instagram: string;
    facebook: string;
    pinterest: string;
    youtube: string;
  };
  seo: {
    defaultTitle: string;
    defaultDescription: string;
  };
  lastPublishedAt: string;
}

export type EnquiryStatus =
  | 'New'
  | 'In Progress'
  | 'Follow-up'
  | 'Converted'
  | 'Resolved'
  | 'Closed';

export type EnquiryPriority = 'High' | 'Medium' | 'Low';

export interface EnquiryNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  enquiryType: 'Bridal Trousseau' | 'Bespoke Weave' | 'Styling Consultation' | 'Order Support' | 'Wholesale';
  productId?: string;
  productName?: string;
  message: string;
  priority: EnquiryPriority;
  status: EnquiryStatus;
  assignedStaff: string;
  followUpDate?: string;
  notes: EnquiryNote[];
  createdAt: string;
}

export type ExpenseCategory =
  | 'Inventory'
  | 'Shipping'
  | 'Packaging'
  | 'Marketing'
  | 'Rent'
  | 'Staff'
  | 'Technology'
  | 'Miscellaneous';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  vendor: string;
  amount: number;
  date: string;
  paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  paymentMethod: 'Bank Transfer' | 'UPI' | 'Corporate Card' | 'Cash';
  notes: string;
  attachmentRef?: string;
}

export interface Supplier {
  id: string;
  name: string;
  craftCluster: string;
  contactPerson: string;
  phone: string;
  email: string;
  outstandingBalance: number;
  totalPaid: number;
  notes: string;
  active: boolean;
}

export type PurchaseOrderStatus = 'Ordered' | 'Partial' | 'Received' | 'Cancelled';

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  paidAmount: number;
  status: PurchaseOrderStatus;
  expectedDate: string;
  createdAt: string;
  notes: string;
}

export interface StoreSettings {
  storeProfile: {
    storeName: string;
    tagline: string;
    logoMark: string;
    supportEmail: string;
    supportPhone: string;
    address: string;
  };
  gstConfig: {
    gstEnabled: boolean;
    gstin: string;
    silkTaxRatePercent: number;
    hsnCode: string;
  };
  shippingConfig: {
    freeShippingThreshold: number;
    standardShippingFee: number;
    insuredDispatchEnabled: boolean;
    estimatedDaysDomestic: string;
    internationalShippingEnabled: boolean;
  };
  paymentMethods: {
    upiEnabled: boolean;
    cardsEnabled: boolean;
    netBankingEnabled: boolean;
    codEnabled: boolean;
    codMaxOrderValue: number;
  };
  notifications: {
    lowStockAlerts: boolean;
    newOrderEmail: boolean;
    enquiryAlerts: boolean;
    dailySummaryDigest: boolean;
  };
  storefrontPreferences: {
    showOutOfStockSarees: boolean;
    enableWishlist: boolean;
    enableBridalConcierge: boolean;
    itemsPerPage: number;
  };
  regional: {
    currency: 'INR' | 'USD';
    timezone: string;
    dateFormat: 'DD MMM YYYY' | 'YYYY-MM-DD';
  };
  security: {
    sessionTimeoutMinutes: number;
    requireStrongPasswords: boolean;
    enforceRbacOnApi: boolean;
    supabaseAuthMode: 'Preview Local Scrypt' | 'Supabase Auth Ready';
  };
}

export interface ActivityLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface AdminBootstrapPayload {
  products: Product[];
  collections: Collection[];
  categories: Category[];
  stockMovements: StockMovement[];
  orders: Order[];
  customers: Customer[];
  wishlistInsights: WishlistInsight[];
  coupons: Coupon[];
  siteContent: SiteContent;
  enquiries: Enquiry[];
  expenses: Expense[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  settings: StoreSettings;
  staffAccounts: StaffAccount[];
  roles: RolePermissionMap[];
  activities: ActivityLog[];
}
