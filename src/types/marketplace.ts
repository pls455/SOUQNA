export type WorkspaceId = 'buyer' | 'merchant' | 'admin';

export type BuyerScreenId =
  | 'home'
  | 'categories'
  | 'search'
  | 'product'
  | 'store'
  | 'cart'
  | 'checkout'
  | 'order-tracking'
  | 'account';

export type MerchantScreenId =
  | 'auth'
  | 'review-status'
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'analytics'
  | 'subscriptions'
  | 'staff'
  | 'settings';

export type AdminScreenId =
  | 'login'
  | 'dashboard'
  | 'store-applications'
  | 'application-details'
  | 'stores'
  | 'users'
  | 'products'
  | 'reports'
  | 'orders-complaints'
  | 'categories'
  | 'plans'
  | 'payments-coupons'
  | 'settings'
  | 'audit-log';

export type SimulationState = 'normal' | 'loading' | 'empty' | 'error' | 'offline';

export type GazaRegion =
  | 'مدينة غزة'
  | 'شمال غزة'
  | 'المحافظة الوسطى'
  | 'خانيونس'
  | 'رفح';

export type PlanTier = 'free' | 'pro' | 'business';

export type StoreStatus = 'approved' | 'suspended' | 'archived';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'needs_info';

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  productCount: number;
  active: boolean;
  sortOrder: number;
}

export interface Store {
  id: string;
  name: string;
  username: string;
  ownerName: string;
  email: string;
  phone: string;
  whatsapp: string;
  region: GazaRegion;
  description: string;
  coverImage: string;
  logoText: string;
  verified: boolean;
  featured: boolean;
  status: StoreStatus;
  rating: number;
  reviewCount: number;
  workingHours: string;
  plan: PlanTier;
  planStartDate: string;
  planEndDate: string;
  deliveryFees: Partial<Record<GazaRegion, number | null>>;
  policies: string;
  orderNotificationsEnabled: boolean;
  views: number;
  createdAt: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  available: boolean;
  archived: boolean;
  views: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  reviews: ProductReview[];
}

export interface CartItem {
  productId: string;
  storeId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  label: string;
  timestamp: string;
  note?: string;
  actor: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  region: GazaRegion;
  address: string;
  notes?: string;
  channel: 'platform' | 'whatsapp';
  isGuest: boolean;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number | null;
  total: number;
  status: OrderStatus;
  internalNote?: string;
  timeline: OrderTimelineEntry[];
  createdAt: string;
}

export interface StoreApplication {
  id: string;
  storeName: string;
  username: string;
  ownerName: string;
  email: string;
  phone: string;
  whatsapp: string;
  region: GazaRegion;
  description: string;
  proofDocumentName: string;
  proofSummary: string;
  status: ApplicationStatus;
  rejectionReason?: string;
  infoRequestNote?: string;
  submittedAt: string;
}

export interface StaffMember {
  id: string;
  storeId: string;
  name: string;
  email: string;
  role: string;
  permissions: {
    manageProducts: boolean;
    manageOrders: boolean;
    viewAnalytics: boolean;
  };
  active: boolean;
  lastActivity: string;
}

export interface StaffActivityEntry {
  id: string;
  staffName: string;
  action: string;
  timestamp: string;
}

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  subtitle: string;
  monthlyPrice: number;
  maxProducts: number;
  features: string[];
}

export interface PaymentRecord {
  id: string;
  storeId: string;
  storeName: string;
  type: 'subscription' | 'service';
  description: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';
  externalPaymentId?: string;
  activated?: boolean;
  date: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  scope: string;
  usageCount: number;
  maxUsage: number;
  active: boolean;
  expiresAt: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'buyer' | 'merchant' | 'admin';
  region: GazaRegion;
  status: 'active' | 'blocked';
  ordersCount: number;
  joinedAt: string;
}

export interface ContentReport {
  id: string;
  targetType: 'product' | 'store';
  targetId: string;
  targetName: string;
  reason: string;
  reporterLabel: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface OrderComplaint {
  id: string;
  orderNumber: string;
  storeName: string;
  customerName: string;
  subject: string;
  status: 'open' | 'investigating' | 'resolved';
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  details: string;
  severity: 'info' | 'warning' | 'danger';
  timestamp: string;
}

export interface PlatformSettings {
  platformName: string;
  supportedRegions: GazaRegion[];
  usernameMinLength: number;
  guestCheckoutEnabled: boolean;
  maintenanceMode: boolean;
  supportWhatsapp: string;
  buyerTermsSummary: string;
}
