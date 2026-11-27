import type {
  AuditLogEntry,
  CartItem,
  Category,
  ContentReport,
  Coupon,
  GazaRegion,
  Order,
  OrderComplaint,
  PaymentRecord,
  PlatformSettings,
  PlatformUser,
  Product,
  StaffActivityEntry,
  StaffMember,
  Store,
  StoreApplication,
  SubscriptionPlan,
} from '../types/marketplace';
import {
  INITIAL_APPLICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_COMPLAINTS,
  INITIAL_COUPONS,
  INITIAL_ORDERS,
  INITIAL_PAYMENTS,
  INITIAL_PLANS,
  INITIAL_PLATFORM_SETTINGS,
  INITIAL_PRODUCTS,
  INITIAL_REPORTS,
  INITIAL_STAFF,
  INITIAL_STAFF_ACTIVITY,
  INITIAL_STORES,
  INITIAL_USERS,
} from '../data/seedData';

export interface BuyerAccountState {
  signedIn: boolean;
  name: string;
  phone: string;
  email: string;
  addresses: { id: string; region: GazaRegion; address: string }[];
}

export interface MarketplaceSnapshot {
  version: number;
  categories: Category[];
  stores: Store[];
  products: Product[];
  orders: Order[];
  applications: StoreApplication[];
  plans: SubscriptionPlan[];
  staff: StaffMember[];
  staffActivity: StaffActivityEntry[];
  payments: PaymentRecord[];
  coupons: Coupon[];
  users: PlatformUser[];
  reports: ContentReport[];
  complaints: OrderComplaint[];
  auditLogs: AuditLogEntry[];
  platformSettings: PlatformSettings;
  cartsByStore: Record<string, CartItem[]>;
  favorites: string[];
  searchHistory: string[];
  buyerAccount: BuyerAccountState;
}

const STORAGE_KEY = 'souqna_marketplace_v1';
const CURRENT_VERSION = 3;

export function getInitialSnapshot(): MarketplaceSnapshot {
  return {
    version: CURRENT_VERSION,
    categories: INITIAL_CATEGORIES,
    stores: INITIAL_STORES,
    products: INITIAL_PRODUCTS,
    orders: INITIAL_ORDERS,
    applications: INITIAL_APPLICATIONS,
    plans: INITIAL_PLANS,
    staff: INITIAL_STAFF,
    staffActivity: INITIAL_STAFF_ACTIVITY,
    payments: INITIAL_PAYMENTS,
    coupons: INITIAL_COUPONS,
    users: INITIAL_USERS,
    reports: INITIAL_REPORTS,
    complaints: INITIAL_COMPLAINTS,
    auditLogs: INITIAL_AUDIT_LOGS,
    platformSettings: INITIAL_PLATFORM_SETTINGS,
    cartsByStore: {},
    favorites: ['prod-1'],
    searchHistory: ['زيت زيتون', 'خزف', 'سماعة'],
    buyerAccount: {
      signedIn: false,
      name: 'زائر كريم',
      phone: '',
      email: '',
      addresses: [],
    },
  };
}

export interface MarketplaceRepository {
  load(): MarketplaceSnapshot;
  save(snapshot: MarketplaceSnapshot): void;
  reset(): MarketplaceSnapshot;
}

export const localMarketplaceRepository: MarketplaceRepository = {
  load(): MarketplaceSnapshot {
    if (typeof window === 'undefined') return getInitialSnapshot();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return getInitialSnapshot();
      const parsed = JSON.parse(raw) as Partial<MarketplaceSnapshot>;
      if (parsed.version !== CURRENT_VERSION || !Array.isArray(parsed.stores)) {
        return getInitialSnapshot();
      }
      return {
        ...getInitialSnapshot(),
        ...parsed,
      };
    } catch {
      return getInitialSnapshot();
    }
  },

  save(snapshot: MarketplaceSnapshot): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage quota errors
    }
  },

  reset(): MarketplaceSnapshot {
    const fresh = getInitialSnapshot();
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch {
        // ignore
      }
    }
    return fresh;
  },
};
