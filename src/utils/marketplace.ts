import type {
  CartItem,
  GazaRegion,
  Order,
  OrderStatus,
  PlanTier,
  Product,
  Store,
} from '../types/marketplace';

export const PLAN_LIMITS: Record<PlanTier, { maxProducts: number; allowsStaff: boolean; label: string }> = {
  free: { maxProducts: 50, allowsStaff: false, label: 'المجانية (Free)' },
  pro: { maxProducts: 300, allowsStaff: false, label: 'الاحترافية (Pro)' },
  business: { maxProducts: 999, allowsStaff: true, label: 'الأعمال (Business)' },
};

export interface UsernameValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Validates store username according to SOUQNA rules:
 * - Starts with an English letter [a-zA-Z]
 * - Minimum 3 characters
 * - Only English letters, digits, dot (.), and underscore (_)
 * - Case-insensitive uniqueness across existing stores
 */
export function validateStoreUsername(
  rawUsername: string,
  existingStores: Pick<Store, 'id' | 'username'>[],
  excludeStoreId?: string
): UsernameValidationResult {
  const trimmed = rawUsername.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return { valid: false, normalized, error: 'اسم المستخدم مطلوب.' };
  }
  if (!/^[a-zA-Z]/.test(trimmed)) {
    return {
      valid: false,
      normalized,
      error: 'يجب أن يبدأ اسم المستخدم بحرف إنجليزي.',
    };
  }
  if (trimmed.length < 3) {
    return {
      valid: false,
      normalized,
      error: 'يجب أن يتكون اسم المستخدم من 3 أحرف على الأقل.',
    };
  }
  if (!/^[a-zA-Z][a-zA-Z0-9._]*$/.test(trimmed)) {
    return {
      valid: false,
      normalized,
      error: 'يُسمح فقط بالأحرف الإنجليزية والأرقام والنقطة (.) والشرطة السفلية (_).',
    };
  }

  const isDuplicate = existingStores.some(
    (store) =>
      store.id !== excludeStoreId && store.username.trim().toLowerCase() === normalized
  );
  if (isDuplicate) {
    return {
      valid: false,
      normalized,
      error: 'اسم المستخدم مستخدم بالفعل لدى متجر آخر.',
    };
  }

  return { valid: true, normalized };
}

export function addToStoreCart(
  cartsByStore: Record<string, CartItem[]>,
  item: CartItem
): Record<string, CartItem[]> {
  const existingStoreItems = cartsByStore[item.storeId] ?? [];
  const matchIndex = existingStoreItems.findIndex(
    (entry) =>
      entry.productId === item.productId &&
      entry.selectedSize === item.selectedSize &&
      entry.selectedColor === item.selectedColor
  );

  if (matchIndex >= 0) {
    const updated = existingStoreItems.map((entry, idx) =>
      idx === matchIndex
        ? { ...entry, quantity: entry.quantity + item.quantity }
        : entry
    );
    return {
      ...cartsByStore,
      [item.storeId]: updated,
    };
  }

  return {
    ...cartsByStore,
    [item.storeId]: [...existingStoreItems, item],
  };
}

export function updateStoreCartQuantity(
  cartsByStore: Record<string, CartItem[]>,
  storeId: string,
  productId: string,
  delta: number,
  selectedSize?: string,
  selectedColor?: string
): Record<string, CartItem[]> {
  const storeItems = cartsByStore[storeId] ?? [];
  const nextItems = storeItems
    .map((entry) => {
      if (
        entry.productId === productId &&
        entry.selectedSize === selectedSize &&
        entry.selectedColor === selectedColor
      ) {
        return { ...entry, quantity: entry.quantity + delta };
      }
      return entry;
    })
    .filter((entry) => entry.quantity > 0);

  if (nextItems.length === 0) {
    const { [storeId]: _, ...rest } = cartsByStore;
    return rest;
  }

  return {
    ...cartsByStore,
    [storeId]: nextItems,
  };
}

export function removeFromStoreCart(
  cartsByStore: Record<string, CartItem[]>,
  storeId: string,
  productId: string,
  selectedSize?: string,
  selectedColor?: string
): Record<string, CartItem[]> {
  const storeItems = cartsByStore[storeId] ?? [];
  const nextItems = storeItems.filter(
    (entry) =>
      !(
        entry.productId === productId &&
        entry.selectedSize === selectedSize &&
        entry.selectedColor === selectedColor
      )
  );

  if (nextItems.length === 0) {
    const { [storeId]: _, ...rest } = cartsByStore;
    return rest;
  }

  return {
    ...cartsByStore,
    [storeId]: nextItems,
  };
}

export interface StoreCartTotals {
  itemCount: number;
  subtotal: number;
  deliveryFee: number | null;
  total: number;
}

export function calculateStoreCartTotals(
  items: CartItem[],
  store: Pick<Store, 'deliveryFees'> | undefined,
  region: GazaRegion
): StoreCartTotals {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const feeValue = store?.deliveryFees?.[region];
  const deliveryFee = typeof feeValue === 'number' ? feeValue : null;
  const total = subtotal + (deliveryFee ?? 0);

  return {
    itemCount,
    subtotal,
    deliveryFee,
    total,
  };
}

export function buildWhatsAppOrderMessage(params: {
  storeName: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  region: GazaRegion;
  address: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number | null;
  total: number;
  notes?: string;
}): string {
  const lines: string[] = [];
  lines.push(`مرحباً ${params.storeName}، أود تأكيد الطلب التالي عبر سوقنا:`);
  if (params.orderNumber) {
    lines.push(`رقم الطلب: ${params.orderNumber}`);
  }
  lines.push('');
  lines.push('المنتجات:');
  for (const item of params.items) {
    const options = [item.selectedSize, item.selectedColor].filter(Boolean).join(' / ');
    const optSuffix = options ? ` (${options})` : '';
    lines.push(
      `- ${item.name}${optSuffix} × ${item.quantity} = ${item.price * item.quantity} ₪`
    );
  }
  lines.push('');
  lines.push(`المجموع الفرعي: ${params.subtotal} ₪`);
  lines.push(
    `التوصيل (${params.region}): ${
      params.deliveryFee !== null ? `${params.deliveryFee} ₪` : 'يُحدد بالتنسيق مع المتجر'
    }`
  );
  lines.push(`الإجمالي التقديري: ${params.total} ₪`);
  lines.push('');
  lines.push(`الاسم: ${params.customerName}`);
  lines.push(`الهاتف: ${params.customerPhone}`);
  lines.push(`العنوان: ${params.region} - ${params.address}`);
  if (params.notes?.trim()) {
    lines.push(`ملاحظات: ${params.notes.trim()}`);
  }
  return lines.join('\n');
}

export function buildWhatsAppProductMessage(params: {
  storeName: string;
  productName: string;
  price: number;
  selectedSize?: string;
  selectedColor?: string;
}): string {
  const opts = [params.selectedSize, params.selectedColor].filter(Boolean).join(' - ');
  return `مرحباً ${params.storeName}، أستفسر عن منتج "${params.productName}"${
    opts ? ` (${opts})` : ''
  } بسعر ${params.price} ₪ المعروض على منصة سوقنا.`;
}

export function canAddProductForPlan(plan: PlanTier, activeAndArchivedCount: number): boolean {
  const limit = PLAN_LIMITS[plan].maxProducts;
  return activeAndArchivedCount < limit;
}

export function getPlanRemainingProducts(plan: PlanTier, usedCount: number): number {
  return Math.max(0, PLAN_LIMITS[plan].maxProducts - usedCount);
}

export type ProductSortOption = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'views';

export interface ProductFilterCriteria {
  query?: string;
  categoryId?: string;
  region?: GazaRegion | 'الكل';
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: ProductSortOption;
}

export function filterAndSortProducts(
  products: Product[],
  stores: Store[],
  criteria: ProductFilterCriteria
): Product[] {
  const storeMap = new Map(stores.map((s) => [s.id, s]));
  const normalizedQuery = criteria.query?.trim().toLowerCase() ?? '';

  const filtered = products.filter((product) => {
    if (product.archived) return false;
    const store = storeMap.get(product.storeId);
    if (!store || store.status !== 'approved') return false;

    if (criteria.categoryId && criteria.categoryId !== 'all' && product.categoryId !== criteria.categoryId) {
      return false;
    }
    if (criteria.storeId && product.storeId !== criteria.storeId) {
      return false;
    }
    if (criteria.region && criteria.region !== 'الكل' && store.region !== criteria.region) {
      return false;
    }
    if (typeof criteria.minPrice === 'number' && product.price < criteria.minPrice) {
      return false;
    }
    if (typeof criteria.maxPrice === 'number' && product.price > criteria.maxPrice) {
      return false;
    }
    if (normalizedQuery) {
      const hay = `${product.name} ${product.description} ${store.name}`.toLowerCase();
      if (!hay.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const sortBy = criteria.sortBy ?? 'newest';
  return [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'views':
        return b.views - a.views;
      case 'newest':
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
}

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  new: { label: 'طلب جديد', tone: 'info' },
  accepted: { label: 'مقبول', tone: 'success' },
  preparing: { label: 'قيد التجهيز', tone: 'warning' },
  out_for_delivery: { label: 'خرج للتوصيل', tone: 'info' },
  completed: { label: 'مكتمل', tone: 'success' },
  rejected: { label: 'مرفوض', tone: 'danger' },
  cancelled: { label: 'ملغي', tone: 'neutral' },
};

export function getNextOrderStatuses(current: OrderStatus): OrderStatus[] {
  switch (current) {
    case 'new':
      return ['accepted', 'rejected'];
    case 'accepted':
      return ['preparing', 'cancelled'];
    case 'preparing':
      return ['out_for_delivery', 'cancelled'];
    case 'out_for_delivery':
      return ['completed'];
    default:
      return [];
  }
}

export function appendOrderTimeline(
  order: Order,
  nextStatus: OrderStatus,
  actor: string,
  note?: string,
  timestamp = 'الآن'
): Order {
  const label = ORDER_STATUS_META[nextStatus].label;
  return {
    ...order,
    status: nextStatus,
    timeline: [
      ...order.timeline,
      {
        status: nextStatus,
        label,
        timestamp,
        note,
        actor,
      },
    ],
  };
}

export function appendProductReview(
  product: Product,
  review: { author: string; rating: number; comment: string; date?: string }
): Product {
  const clampedRating = Math.min(5, Math.max(1, Math.round(review.rating)));
  const nextReviews = [
    {
      id: `rev-${Date.now()}`,
      author: review.author.trim() || 'مشتري',
      rating: clampedRating,
      comment: review.comment.trim(),
      date: review.date || 'الآن',
    },
    ...product.reviews,
  ];
  const prevTotalScore = product.rating * product.reviewCount;
  const nextCount = product.reviewCount + 1;
  const nextAverage = Number(((prevTotalScore + clampedRating) / nextCount).toFixed(1));

  return {
    ...product,
    rating: nextAverage,
    reviewCount: nextCount,
    reviews: nextReviews,
  };
}
