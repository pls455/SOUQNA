import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getSupabaseClient,
  getSupabaseProfile,
  isSupabaseConfigured,
  signOutSupabase,
  type SupabaseProfile,
} from '../lib/supabaseClient';
import {
  localMarketplaceRepository,
  type BuyerAccountState,
} from '../services/marketplaceRepository';
import {
  fetchSupabaseMarketplaceData,
  persistOrderToSupabase,
  persistStoreApplicationToSupabase,
} from '../services/supabaseRepository';
import type {
  AdminScreenId,
  AuditLogEntry,
  BuyerScreenId,
  CartItem,
  Category,
  ContentReport,
  Coupon,
  GazaRegion,
  MerchantScreenId,
  Order,
  OrderComplaint,
  OrderStatus,
  PaymentRecord,
  PlanTier,
  PlatformSettings,
  PlatformUser,
  Product,
  StaffActivityEntry,
  StaffMember,
  Store,
  StoreApplication,
  StoreStatus,
  SubscriptionPlan,
  WorkspaceId,
} from '../types/marketplace';
import {
  addToStoreCart,
  appendOrderTimeline,
  appendProductReview,
  removeFromStoreCart,
  updateStoreCartQuantity,
} from '../utils/marketplace';
import { createPlatformPayment } from '../services/paymentService';

interface IntegrationStatus {
  supabaseConfigured: boolean;
  cloudflareR2Configured: boolean;
}

interface MarketplaceContextValue {
  // Workspace & navigation
  workspace: WorkspaceId;
  setWorkspace: (w: WorkspaceId) => void;
  buyerScreen: BuyerScreenId;
  setBuyerScreen: (s: BuyerScreenId) => void;
  merchantScreen: MerchantScreenId;
  setMerchantScreen: (s: MerchantScreenId) => void;
  adminScreen: AdminScreenId;
  setAdminScreen: (s: AdminScreenId) => void;
  isOffline: boolean;
  integrationsStatus: IntegrationStatus;

  // Buyer selections
  selectedRegion: GazaRegion | 'الكل';
  setSelectedRegion: (r: GazaRegion | 'الكل') => void;
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  selectedProductId: string;
  openProduct: (productId: string) => void;
  selectedStoreId: string;
  openStore: (storeId: string) => void;
  checkoutStoreId: string;
  startCheckoutForStore: (storeId: string) => void;
  activeOrderId: string;
  openOrderTracking: (orderId: string) => void;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  searchHistory: string[];
  addSearchHistory: (term: string) => void;
  clearSearchHistory: () => void;
  cartsByStore: Record<string, CartItem[]>;
  cartFeedbackCount: number;
  addToCart: (item: CartItem) => void;
  updateCartQty: (
    storeId: string,
    productId: string,
    delta: number,
    selectedSize?: string,
    selectedColor?: string
  ) => void;
  removeCartItem: (
    storeId: string,
    productId: string,
    selectedSize?: string,
    selectedColor?: string
  ) => void;
  buyerAccount: BuyerAccountState;
  toggleBuyerSignIn: (name?: string, phone?: string) => void;
  addBuyerAddress: (region: GazaRegion, address: string) => void;
  removeBuyerAddress: (id: string) => void;

  // Shared platform data
  categories: Category[];
  stores: Store[];
  products: Product[];
  orders: Order[];
  applications: StoreApplication[];
  selectedApplicationId: string;
  setSelectedApplicationId: (id: string) => void;
  activeMerchantStoreId: string;
  setActiveMerchantStoreId: (id: string) => void;
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
  adminAuthenticated: boolean;
  setAdminAuthenticated: (v: boolean) => void;
  authProfile: SupabaseProfile | null;
  authLoading: boolean;
  signOut: () => Promise<void>;

  // Toast feedback
  toast: { id: number; message: string; tone: 'success' | 'info' | 'danger' } | null;
  showToast: (message: string, tone?: 'success' | 'info' | 'danger') => void;
  resetDemoData: () => void;

  // Live actions across Buyer / Merchant / Admin
  placeOrder: (payload: {
    storeId: string;
    customerName: string;
    customerPhone: string;
    region: GazaRegion;
    address: string;
    notes?: string;
    channel: 'platform' | 'whatsapp';
    deliveryFee: number | null;
    subtotal: number;
    total: number;
  }) => Order;

  submitStoreApplication: (app: Omit<StoreApplication, 'id' | 'status' | 'submittedAt'>) => StoreApplication;
  reviewStoreApplication: (
    appId: string,
    decision: 'approved' | 'rejected' | 'needs_info',
    options?: { reason?: string; verifyStore?: boolean }
  ) => void;
  updateStoreStatus: (storeId: string, status: StoreStatus, reason: string) => void;
  toggleStoreVerification: (storeId: string) => void;
  toggleStoreFeatured: (storeId: string) => void;
  updateStoreSettings: (storeId: string, patch: Partial<Store>) => void;

  addProduct: (product: Omit<Product, 'id' | 'views' | 'rating' | 'reviewCount' | 'createdAt' | 'reviews'>) => Product;
  updateProduct: (productId: string, patch: Partial<Product>) => void;
  duplicateProduct: (productId: string) => void;
  deleteProduct: (productId: string) => void;
  addProductReview: (productId: string, review: { author: string; rating: number; comment: string }) => void;

  updateOrderStatus: (orderId: string, nextStatus: OrderStatus, actor: string, note?: string) => void;
  updateOrderInternalNote: (orderId: string, note: string) => void;

  upgradeStorePlan: (storeId: string, tier: PlanTier) => void;
  updatePlan: (planId: PlanTier, patch: Partial<SubscriptionPlan>) => void;
  addStaffMember: (member: Omit<StaffMember, 'id' | 'lastActivity'>) => void;
  toggleStaffActive: (staffId: string) => void;

  addCategory: (name: string) => void;
  renameCategory: (catId: string, name: string) => void;
  toggleCategoryActive: (catId: string) => void;
  toggleCouponActive: (couponId: string) => void;
  addCoupon: (code: string, discountPercent: number, scope: string) => void;
  resolveReport: (reportId: string, status: 'resolved' | 'dismissed') => void;
  updateComplaintStatus: (complaintId: string, status: OrderComplaint['status']) => void;
  toggleUserStatus: (userId: string) => void;
  updatePlatformSettings: (patch: Partial<PlatformSettings>) => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceId>('buyer');
  const [buyerScreen, setBuyerScreen] = useState<BuyerScreenId>('home');
  const [merchantScreen, setMerchantScreen] = useState<MerchantScreenId>('dashboard');
  const [adminScreen, setAdminScreen] = useState<AdminScreenId>('dashboard');
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [integrationsStatus, setIntegrationsStatus] = useState<IntegrationStatus>({
    supabaseConfigured: isSupabaseConfigured,
    cloudflareR2Configured: false,
  });

  const [selectedRegion, setSelectedRegion] = useState<GazaRegion | 'الكل'>('الكل');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('prod-1');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('store-1');
  const [checkoutStoreId, setCheckoutStoreId] = useState<string>('store-1');
  const [activeOrderId, setActiveOrderId] = useState<string>('ord-1047');
  const [initialSnap] = useState(() => localMarketplaceRepository.load());

  const [favorites, setFavorites] = useState<string[]>(initialSnap.favorites);
  const [searchHistory, setSearchHistory] = useState<string[]>(initialSnap.searchHistory);
  const [cartsByStore, setCartsByStore] = useState<Record<string, CartItem[]>>(initialSnap.cartsByStore);
  const [buyerAccount, setBuyerAccount] = useState<BuyerAccountState>(initialSnap.buyerAccount);

  const [categories, setCategories] = useState<Category[]>(initialSnap.categories);
  const [stores, setStores] = useState<Store[]>(initialSnap.stores);
  const [products, setProducts] = useState<Product[]>(initialSnap.products);
  const [orders, setOrders] = useState<Order[]>(initialSnap.orders);
  const [applications, setApplications] = useState<StoreApplication[]>(initialSnap.applications);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('app-1');
  const [activeMerchantStoreId, setActiveMerchantStoreId] = useState<string>('store-1');
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialSnap.plans);
  const [staff, setStaff] = useState<StaffMember[]>(initialSnap.staff);
  const [staffActivity, setStaffActivity] = useState<StaffActivityEntry[]>(initialSnap.staffActivity);
  const [payments, setPayments] = useState<PaymentRecord[]>(initialSnap.payments);
  const [coupons, setCoupons] = useState<Coupon[]>(initialSnap.coupons);
  const [users, setUsers] = useState<PlatformUser[]>(initialSnap.users);
  const [reports, setReports] = useState<ContentReport[]>(initialSnap.reports);
  const [complaints, setComplaints] = useState<OrderComplaint[]>(initialSnap.complaints);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialSnap.auditLogs);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(initialSnap.platformSettings);
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(false);
  const [authProfile, setAuthProfile] = useState<SupabaseProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cartFeedbackCount, setCartFeedbackCount] = useState<number>(0);
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'success' | 'info' | 'danger' } | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setAuthLoading(false);
      return;
    }
    let active = true;
    const syncAuth = async () => {
      const profile = await getSupabaseProfile();
      if (!active) return;
      setAuthProfile(profile);
      setAdminAuthenticated(Boolean(profile && ['platform_owner', 'platform_admin', 'admin'].includes(profile.role) && profile.status === 'active'));
      setAuthLoading(false);
    };
    void syncAuth();
    const { data } = client.auth.onAuthStateChange(() => {
      void syncAuth();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await signOutSupabase();
    setAuthProfile(null);
    setAdminAuthenticated(false);
    setAdminScreen('login');
    setMerchantScreen('auth');
    setWorkspace('buyer');
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.integrations) {
          setIntegrationsStatus({
            supabaseConfigured: Boolean(data.integrations.supabaseConfigured || isSupabaseConfigured),
            cloudflareR2Configured: Boolean(data.integrations.cloudflareR2Configured),
          });
        }
      })
      .catch(() => {
        // ignore health check error
      });

    if (isSupabaseConfigured) {
      fetchSupabaseMarketplaceData().then((remote) => {
        if (!active || !remote) return;
        if (remote.categories.length > 0) setCategories(remote.categories);
        if (remote.stores.length > 0) setStores(remote.stores);
        if (remote.products.length > 0) setProducts(remote.products);
        if (remote.plans.length > 0) setPlans(remote.plans);
        if (remote.platformSettings) setPlatformSettings(remote.platformSettings);
      });
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localMarketplaceRepository.save({
      version: 2,
      categories,
      stores,
      products,
      orders,
      applications,
      plans,
      staff,
      staffActivity,
      payments,
      coupons,
      users,
      reports,
      complaints,
      auditLogs,
      platformSettings,
      cartsByStore,
      favorites,
      searchHistory,
      buyerAccount,
    });
  }, [
    categories,
    stores,
    products,
    orders,
    applications,
    plans,
    staff,
    staffActivity,
    payments,
    coupons,
    users,
    reports,
    complaints,
    auditLogs,
    platformSettings,
    cartsByStore,
    favorites,
    searchHistory,
    buyerAccount,
  ]);

  const showToast = (message: string, tone: 'success' | 'info' | 'danger' = 'success') => {
    const id = Date.now();
    setToast({ id, message, tone });
    window.setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3200);
  };

  const pushAudit = (
    action: string,
    target: string,
    details: string,
    severity: AuditLogEntry['severity'] = 'info'
  ) => {
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        actor: 'مدير المنصة',
        action,
        target,
        details,
        severity,
        timestamp: 'الآن',
      },
      ...prev,
    ]);
  };

  const openProduct = (productId: string) => {
    setSelectedProductId(productId);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, views: p.views + 1 } : p))
    );
    setBuyerScreen('product');
  };

  const openStore = (storeId: string) => {
    setSelectedStoreId(storeId);
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, views: s.views + 1 } : s))
    );
    setBuyerScreen('store');
  };

  const startCheckoutForStore = (storeId: string) => {
    setCheckoutStoreId(storeId);
    setBuyerScreen('checkout');
  };

  const openOrderTracking = (orderId: string) => {
    setActiveOrderId(orderId);
    setBuyerScreen('order-tracking');
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(productId);
      showToast(exists ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة', 'info');
      return exists ? prev.filter((id) => id !== productId) : [...prev, productId];
    });
  };

  const addSearchHistory = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setSearchHistory((prev) => [clean, ...prev.filter((t) => t !== clean)].slice(0, 6));
  };

  const clearSearchHistory = () => setSearchHistory([]);

  const addToCart = (item: CartItem) => {
    setCartsByStore((prev) => addToStoreCart(prev, item));
    setCartFeedbackCount((c) => c + 1);
    showToast(`تمت إضافة "${item.name}" إلى سلة المتجر`, 'success');
  };

  const updateCartQty = (
    storeId: string,
    productId: string,
    delta: number,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    setCartsByStore((prev) =>
      updateStoreCartQuantity(prev, storeId, productId, delta, selectedSize, selectedColor)
    );
  };

  const removeCartItem = (
    storeId: string,
    productId: string,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    setCartsByStore((prev) =>
      removeFromStoreCart(prev, storeId, productId, selectedSize, selectedColor)
    );
    showToast('تم حذف المنتج من السلة', 'info');
  };

  const toggleBuyerSignIn = (name?: string, phone?: string) => {
    setBuyerAccount((prev) => ({
      ...prev,
      signedIn: !prev.signedIn,
      name: name ?? (prev.signedIn ? 'زائر كريم' : 'مستخدم سوقنا'),
      phone: phone ?? prev.phone,
    }));
  };

  const addBuyerAddress = (region: GazaRegion, address: string) => {
    if (!address.trim()) return;
    setBuyerAccount((prev) => ({
      ...prev,
      addresses: [
        ...prev.addresses,
        { id: `addr-${Date.now()}`, region, address: address.trim() },
      ],
    }));
    showToast('تم حفظ العنوان الجديد', 'success');
  };

  const removeBuyerAddress = (id: string) => {
    setBuyerAccount((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((a) => a.id !== id),
    }));
    showToast('تم حذف العنوان', 'info');
  };

  const resetDemoData = () => {
    const fresh = localMarketplaceRepository.reset();
    setCategories(fresh.categories);
    setStores(fresh.stores);
    setProducts(fresh.products);
    setOrders(fresh.orders);
    setApplications(fresh.applications);
    setPlans(fresh.plans);
    setStaff(fresh.staff);
    setStaffActivity(fresh.staffActivity);
    setPayments(fresh.payments);
    setCoupons(fresh.coupons);
    setUsers(fresh.users);
    setReports(fresh.reports);
    setComplaints(fresh.complaints);
    setAuditLogs(fresh.auditLogs);
    setPlatformSettings(fresh.platformSettings);
    setCartsByStore(fresh.cartsByStore);
    setFavorites(fresh.favorites);
    setSearchHistory(fresh.searchHistory);
    setBuyerAccount(fresh.buyerAccount);
    showToast('تمت إعادة تهيئة البيانات الافتراضية', 'info');
  };

  const placeOrder: MarketplaceContextValue['placeOrder'] = (payload) => {
    const store = stores.find((s) => s.id === payload.storeId);
    const items = cartsByStore[payload.storeId] ?? [];
    const seq = 1048 + orders.length;
    const newOrder: Order = {
      id: `ord-${seq}`,
      orderNumber: `#SG-${seq}`,
      storeId: payload.storeId,
      storeName: store?.name ?? 'متجر',
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      region: payload.region,
      address: payload.address,
      notes: payload.notes,
      channel: payload.channel,
      isGuest: !buyerAccount.signedIn,
      items,
      subtotal: payload.subtotal,
      deliveryFee: payload.deliveryFee,
      total: payload.total,
      status: 'new',
      timeline: [
        {
          status: 'new',
          label: 'طلب جديد',
          timestamp: 'الآن',
          note:
            payload.channel === 'whatsapp'
              ? 'تم إرسال الطلب عبر واتساب'
              : 'تم إرسال الطلب عبر منصة سوقنا',
          actor: buyerAccount.signedIn ? buyerAccount.name : 'المشتري (ضيف)',
        },
      ],
      createdAt: 'الآن',
    };

    setOrders((prev) => [newOrder, ...prev]);
    void persistOrderToSupabase(newOrder);
    setCartsByStore((prev) => {
      const { [payload.storeId]: _, ...rest } = prev;
      return rest;
    });
    setActiveOrderId(newOrder.id);
    setBuyerScreen('order-tracking');
    showToast(`تم تأكيد طلبك بنجاح (${newOrder.orderNumber})`, 'success');
    return newOrder;
  };

  const submitStoreApplication: MarketplaceContextValue['submitStoreApplication'] = (app) => {
    const created: StoreApplication = {
      ...app,
      id: `app-${Date.now()}`,
      status: 'pending',
      submittedAt: 'الآن',
    };
    setApplications((prev) => [created, ...prev]);
    setSelectedApplicationId(created.id);
    void persistStoreApplicationToSupabase(created);
    showToast('تم إرسال طلب إنشاء المتجر للمراجعة الإدارية', 'success');
    return created;
  };

  const reviewStoreApplication: MarketplaceContextValue['reviewStoreApplication'] = (
    appId,
    decision,
    options
  ) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? {
              ...a,
              status: decision,
              rejectionReason: decision === 'rejected' ? options?.reason : a.rejectionReason,
              infoRequestNote: decision === 'needs_info' ? options?.reason : a.infoRequestNote,
            }
          : a
      )
    );

    if (decision === 'approved') {
      const existing = stores.find(
        (s) => s.username.toLowerCase() === targetApp.username.toLowerCase()
      );
      if (!existing) {
        const newStore: Store = {
          id: `store-${Date.now()}`,
          name: targetApp.storeName,
          username: targetApp.username,
          ownerName: targetApp.ownerName,
          email: targetApp.email,
          phone: targetApp.phone,
          whatsapp: targetApp.whatsapp,
          region: targetApp.region,
          description: targetApp.description,
          coverImage: '',
          logoText: targetApp.storeName.trim().slice(0, 1) || 'م',
          verified: Boolean(options?.verifyStore),
          featured: false,
          status: 'approved',
          rating: 5.0,
          reviewCount: 0,
          workingHours: 'السبت - الخميس: 9:00 صباحاً - 6:00 مساءً',
          plan: 'free',
          planStartDate: '2026-11-27',
          planEndDate: '2026-12-27',
          deliveryFees: { [targetApp.region]: 10 },
          policies: 'الدفع بالتنسيق المباشر مع المتجر عند الاستلام.',
          orderNotificationsEnabled: true,
          views: 1,
          createdAt: '2026-11-27',
        };
        setStores((prev) => [newStore, ...prev]);
      }
      pushAudit(
        'اعتماد طلب إنشاء متجر',
        `${targetApp.storeName} (@${targetApp.username})`,
        options?.verifyStore ? 'تم الاعتماد مع منح شارة التوثيق.' : 'تم الاعتماد كمتجر غير موثق مبدئياً.',
        'info'
      );
      showToast(`تم اعتماد متجر "${targetApp.storeName}" بنجاح`, 'success');
    } else if (decision === 'rejected') {
      pushAudit(
        'رفض طلب إنشاء متجر',
        `${targetApp.storeName} (@${targetApp.username})`,
        options?.reason || 'بيانات غير مكتملة',
        'danger'
      );
      showToast('تم رفض الطلب وتسجيل السبب', 'danger');
    } else {
      pushAudit(
        'طلب استكمال بيانات متجر',
        `${targetApp.storeName} (@${targetApp.username})`,
        options?.reason || 'مستندات إضافية مطلوبة',
        'warning'
      );
      showToast('تم إرسال طلب استكمال البيانات للتاجر', 'info');
    }
  };

  const updateStoreStatus = (storeId: string, status: StoreStatus, reason: string) => {
    const target = stores.find((s) => s.id === storeId);
    setStores((prev) => prev.map((s) => (s.id === storeId ? { ...s, status } : s)));
    if (target) {
      const actionMap: Record<StoreStatus, string> = {
        approved: 'إعادة تفعيل متجر',
        suspended: 'إيقاف متجر',
        archived: 'أرشفة متجر',
      };
      pushAudit(
        actionMap[status],
        `${target.name} (@${target.username})`,
        reason,
        status === 'approved' ? 'info' : 'danger'
      );
    }
    showToast('تم تحديث حالة المتجر بنجاح', status === 'approved' ? 'success' : 'danger');
  };

  const toggleStoreVerification = (storeId: string) => {
    const target = stores.find((s) => s.id === storeId);
    if (!target) return;
    const next = !target.verified;
    setStores((prev) => prev.map((s) => (s.id === storeId ? { ...s, verified: next } : s)));
    pushAudit(
      next ? 'توثيق متجر' : 'إلغاء توثيق متجر',
      `${target.name} (@${target.username})`,
      next ? 'منح شارة التوثيق الرسمية' : 'إزالة شارة التوثيق',
      next ? 'info' : 'warning'
    );
    showToast(next ? 'تم توثيق المتجر' : 'تم إلغاء توثيق المتجر', 'info');
  };

  const updateStoreSettings = (storeId: string, patch: Partial<Store>) => {
    setStores((prev) => prev.map((s) => (s.id === storeId ? { ...s, ...patch } : s)));
    showToast('تم حفظ إعدادات المتجر', 'success');
  };

  const addProduct: MarketplaceContextValue['addProduct'] = (product) => {
    const created: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      views: 1,
      rating: 5.0,
      reviewCount: 0,
      createdAt: '2026-11-27',
      reviews: [],
    };
    setProducts((prev) => [created, ...prev]);
    showToast(`تمت إضافة المنتج "${created.name}"`, 'success');
    return created;
  };

  const updateProduct = (productId: string, patch: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...patch } : p)));
    showToast('تم تحديث بيانات المنتج', 'success');
  };

  const duplicateProduct = (productId: string) => {
    const original = products.find((p) => p.id === productId);
    if (!original) return;
    const copy: Product = {
      ...original,
      id: `prod-${Date.now()}`,
      name: `${original.name} (نسخة)`,
      views: 0,
      createdAt: '2026-11-27',
    };
    setProducts((prev) => [copy, ...prev]);
    showToast('تم نسخ المنتج بنجاح', 'success');
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    showToast('تم حذف المنتج', 'danger');
  };

  const updateOrderStatus = (
    orderId: string,
    nextStatus: OrderStatus,
    actor: string,
    note?: string
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? appendOrderTimeline(o, nextStatus, actor, note, 'الآن') : o
      )
    );
    showToast('تم تحديث حالة الطلب وتسجيلها في التسلسل الزمني', 'success');
  };

  const updateOrderInternalNote = (orderId: string, note: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, internalNote: note } : o)));
    showToast('تم حفظ الملاحظة الداخلية', 'info');
  };

  const upgradeStorePlan = async (storeId: string, tier: PlanTier) => {
    const store = stores.find((s) => s.id === storeId);
    const planObj = plans.find((p) => p.id === tier);
    if (!store || !planObj) return;
    if (tier === 'free') {
      setStores((prev) => prev.map((s) => (s.id === storeId ? { ...s, plan: tier } : s)));
      showToast('تم تحويل المتجر إلى الخطة المجانية', 'info');
      return;
    }
    try {
      const payment = await createPlatformPayment({ storeId, service: 'subscription', planId: tier });
      setPayments((prev) => [
        {
          id: payment.paymentId,
          storeId,
          storeName: store.name,
          type: 'subscription',
          description: `طلب اشتراك ${planObj.name}`,
          amount: planObj.monthlyPrice,
          status: payment.status,
          activated: false,
          date: new Date().toISOString().slice(0, 10),
        },
        ...prev,
      ]);
      if (payment.checkoutUrl) {
        showToast('سيتم تحويلك إلى Karam Pay لإكمال الدفع', 'info');
        window.location.assign(payment.checkoutUrl);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر بدء عملية الدفع', 'danger');
    }
  };

  const addStaffMember: MarketplaceContextValue['addStaffMember'] = (member) => {
    const created: StaffMember = {
      ...member,
      id: `stf-${Date.now()}`,
      lastActivity: 'أُضيف الآن',
    };
    setStaff((prev) => [created, ...prev]);
    setStaffActivity((prev) => [
      { id: `act-${Date.now()}`, staffName: created.name, action: `تمت إضافة الموظف بصلاحية ${created.role}`, timestamp: 'الآن' },
      ...prev,
    ]);
    showToast(`تمت إضافة الموظف ${created.name}`, 'success');
  };

  const toggleStaffActive = (staffId: string) => {
    setStaff((prev) =>
      prev.map((m) => (m.id === staffId ? { ...m, active: !m.active } : m))
    );
    showToast('تم تحديث حالة وصول الموظف', 'info');
  };

  const addCategory = (name: string) => {
    if (!name.trim()) return;
    setCategories((prev) => [
      ...prev,
      {
        id: `cat-${Date.now()}`,
        name: name.trim(),
        slug: `cat-${prev.length + 1}`,
        iconName: 'Tag',
        productCount: 0,
        active: true,
        sortOrder: prev.length + 1,
      },
    ]);
    pushAudit('إضافة تصنيف', name.trim(), 'تصنيف جديد في المنصة', 'info');
    showToast('تمت إضافة التصنيف', 'success');
  };

  const toggleCategoryActive = (catId: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, active: !c.active } : c))
    );
  };

  const toggleCouponActive = (couponId: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === couponId ? { ...c, active: !c.active } : c))
    );
  };

  const addCoupon = (code: string, discountPercent: number, scope: string) => {
    if (!code.trim()) return;
    setCoupons((prev) => [
      {
        id: `cpn-${Date.now()}`,
        code: code.trim().toUpperCase(),
        discountPercent,
        scope,
        usageCount: 0,
        maxUsage: 50,
        active: true,
        expiresAt: '2027-01-31',
      },
      ...prev,
    ]);
    pushAudit('إنشاء كوبون', code.trim().toUpperCase(), `خصم ${discountPercent}%`, 'info');
    showToast('تم إنشاء الكوبون بنجاح', 'success');
  };

  const resolveReport = (reportId: string, status: 'resolved' | 'dismissed') => {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    pushAudit('معالجة بلاغ', reportId, status === 'resolved' ? 'تمت المعالجة' : 'تم حفظ البلاغ', 'info');
    showToast('تم تحديث حالة البلاغ', 'success');
  };

  const updateComplaintStatus = (complaintId: string, status: OrderComplaint['status']) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, status } : c))
    );
    showToast('تم تحديث حالة الشكوى', 'success');
  };

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u
      )
    );
    showToast('تم تحديث حالة المستخدم', 'info');
  };

  const toggleStoreFeatured = (storeId: string) => {
    const target = stores.find((s) => s.id === storeId);
    if (!target) return;
    const next = !target.featured;
    setStores((prev) => prev.map((s) => (s.id === storeId ? { ...s, featured: next } : s)));
    showToast(next ? 'تم إبراز المتجر في الواجهة الرئيسية' : 'تم إلغاء إبراز المتجر', 'success');
  };

  const addProductReview = (
    productId: string,
    review: { author: string; rating: number; comment: string }
  ) => {
    if (!review.comment.trim()) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? appendProductReview(p, review) : p))
    );
    showToast('شكراً لك، تمت إضافة تقييمك للمنتج', 'success');
  };

  const updatePlan = (planId: PlanTier, patch: Partial<SubscriptionPlan>) => {
    setPlans((prev) => prev.map((pl) => (pl.id === planId ? { ...pl, ...patch } : pl)));
    pushAudit('تحديث باقة اشتراك', planId, 'تم تعديل تفاصيل الباقة وحدودها', 'info');
    showToast('تم تحديث تفاصيل الباقة', 'success');
  };

  const renameCategory = (catId: string, name: string) => {
    if (!name.trim()) return;
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, name: name.trim() } : c))
    );
    showToast('تم تعديل اسم التصنيف', 'success');
  };

  const updatePlatformSettings = (patch: Partial<PlatformSettings>) => {
    setPlatformSettings((prev) => ({ ...prev, ...patch }));
    pushAudit('تحديث إعدادات المنصة', 'الإعدادات العامة', 'تعديل إعدادات التشغيل والمناطق', 'info');
    showToast('تم حفظ إعدادات المنصة', 'success');
  };

  return (
    <MarketplaceContext.Provider
      value={{
        workspace,
        setWorkspace,
        buyerScreen,
        setBuyerScreen,
        merchantScreen,
        setMerchantScreen,
        adminScreen,
        setAdminScreen,
        isOffline,
        integrationsStatus,
        selectedRegion,
        setSelectedRegion,
        selectedCategoryId,
        setSelectedCategoryId,
        selectedProductId,
        openProduct,
        selectedStoreId,
        openStore,
        checkoutStoreId,
        startCheckoutForStore,
        activeOrderId,
        openOrderTracking,
        favorites,
        toggleFavorite,
        searchHistory,
        addSearchHistory,
        clearSearchHistory,
        cartsByStore,
        cartFeedbackCount,
        addToCart,
        updateCartQty,
        removeCartItem,
        buyerAccount,
        toggleBuyerSignIn,
        addBuyerAddress,
        removeBuyerAddress,
        categories,
        stores,
        products,
        orders,
        applications,
        selectedApplicationId,
        setSelectedApplicationId,
        activeMerchantStoreId,
        setActiveMerchantStoreId,
        plans,
        staff,
        staffActivity,
        payments,
        coupons,
        users,
        reports,
        complaints,
        auditLogs,
        platformSettings,
        adminAuthenticated,
        setAdminAuthenticated,
        authProfile,
        authLoading,
        signOut,
        toast,
        showToast,
        resetDemoData,
        placeOrder,
        submitStoreApplication,
        reviewStoreApplication,
        updateStoreStatus,
        toggleStoreVerification,
        toggleStoreFeatured,
        updateStoreSettings,
        addProduct,
        updateProduct,
        duplicateProduct,
        deleteProduct,
        addProductReview,
        updateOrderStatus,
        updateOrderInternalNote,
        upgradeStorePlan,
        updatePlan,
        addStaffMember,
        toggleStaffActive,
        addCategory,
        renameCategory,
        toggleCategoryActive,
        toggleCouponActive,
        addCoupon,
        resolveReport,
        updateComplaintStatus,
        toggleUserStatus,
        updatePlatformSettings,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used inside MarketplaceProvider');
  return ctx;
}
