import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addToStoreCart,
  appendOrderTimeline,
  appendProductReview,
  buildWhatsAppOrderMessage,
  calculateStoreCartTotals,
  canAddProductForPlan,
  filterAndSortProducts,
  updateStoreCartQuantity,
  validateStoreUsername,
} from './marketplace';
import { buildStoreAnalyticsSeries } from './analytics';
import type { CartItem, Order, Product, Store } from '../types/marketplace';

const sampleStores: Store[] = [
  {
    id: 's1',
    name: 'متجر زيتون الرمال',
    username: 'Zaytoon_Gaza',
    ownerName: 'أحمد',
    email: 'a@example.com',
    phone: '0599000001',
    whatsapp: '970599000001',
    region: 'مدينة غزة',
    description: 'متجر مونة وزيت زيتون',
    coverImage: '',
    logoText: 'ز',
    verified: true,
    featured: true,
    status: 'approved',
    rating: 4.8,
    reviewCount: 12,
    workingHours: '9:00 - 19:00',
    plan: 'free',
    planStartDate: '2026-01-01',
    planEndDate: '2026-12-31',
    deliveryFees: { 'مدينة غزة': 10, 'شمال غزة': 15 },
    policies: 'استبدال خلال 3 أيام',
    orderNotificationsEnabled: true,
    views: 300,
    createdAt: '2026-01-01',
  },
  {
    id: 's2',
    name: 'ركن التقنية الحديثة',
    username: 'tech.corner',
    ownerName: 'سالم',
    email: 's@example.com',
    phone: '0599000002',
    whatsapp: '970599000002',
    region: 'خانيونس',
    description: 'متجر تقني',
    coverImage: '',
    logoText: 'ت',
    verified: false,
    featured: false,
    status: 'approved',
    rating: 4.3,
    reviewCount: 5,
    workingHours: '10:00 - 20:00',
    plan: 'business',
    planStartDate: '2026-01-01',
    planEndDate: '2026-12-31',
    deliveryFees: { 'خانيونس': 12 },
    policies: 'ضمان تشغيلي',
    orderNotificationsEnabled: true,
    views: 150,
    createdAt: '2026-01-02',
  },
];

test('validateStoreUsername enforces start letter, min length, allowed chars, and case-insensitive uniqueness', () => {
  assert.equal(validateStoreUsername('1abc', sampleStores).valid, false);
  assert.equal(validateStoreUsername('_abc', sampleStores).valid, false);
  assert.equal(validateStoreUsername('ab', sampleStores).valid, false);
  assert.equal(validateStoreUsername('gaza-shop', sampleStores).valid, false);
  assert.equal(validateStoreUsername('zaytoon_gaza', sampleStores).valid, false);
  assert.equal(validateStoreUsername('Gaza.Crafts_01', sampleStores).valid, true);
  assert.equal(
    validateStoreUsername('zaytoon_gaza', sampleStores, 's1').valid,
    true
  );
});

test('per-store cart isolates items by storeId and computes totals cleanly', () => {
  const itemA: CartItem = {
    productId: 'p1',
    storeId: 's1',
    name: 'زيت زيتون',
    price: 45,
    image: '',
    quantity: 2,
  };
  const itemB: CartItem = {
    productId: 'p2',
    storeId: 's2',
    name: 'سماعة',
    price: 120,
    image: '',
    quantity: 1,
  };

  let carts = addToStoreCart({}, itemA);
  carts = addToStoreCart(carts, itemB);
  carts = addToStoreCart(carts, { ...itemA, quantity: 1 });

  assert.equal(Object.keys(carts).length, 2);
  assert.equal(carts['s1'][0].quantity, 3);
  assert.equal(carts['s2'][0].quantity, 1);

  const s1Totals = calculateStoreCartTotals(carts['s1'], sampleStores[0], 'مدينة غزة');
  assert.equal(s1Totals.subtotal, 135);
  assert.equal(s1Totals.deliveryFee, 10);
  assert.equal(s1Totals.total, 145);

  const s1OtherRegion = calculateStoreCartTotals(carts['s1'], sampleStores[0], 'رفح');
  assert.equal(s1OtherRegion.deliveryFee, null);
  assert.equal(s1OtherRegion.total, 135);

  carts = updateStoreCartQuantity(carts, 's2', 'p2', -1);
  assert.equal(carts['s2'], undefined);
});

test('buildWhatsAppOrderMessage includes items, currency, and address', () => {
  const msg = buildWhatsAppOrderMessage({
    storeName: 'متجر زيتون الرمال',
    orderNumber: '#SG-1048',
    customerName: 'خالد',
    customerPhone: '0599123456',
    region: 'مدينة غزة',
    address: 'الرمال - قرب مفترق السرايا',
    items: [
      {
        productId: 'p1',
        storeId: 's1',
        name: 'زيت زيتون بكر',
        price: 50,
        image: '',
        quantity: 2,
        selectedSize: '1 لتر',
      },
    ],
    subtotal: 100,
    deliveryFee: 10,
    total: 110,
  });

  assert.match(msg, /#SG-1048/);
  assert.match(msg, /زيت زيتون بكر \(1 لتر\) × 2 = 100 ₪/);
  assert.match(msg, /الإجمالي التقديري: 110 ₪/);
});

test('plan product cap and product filtering work accurately', () => {
  assert.equal(canAddProductForPlan('free', 14), true);
  assert.equal(canAddProductForPlan('free', 15), false);
  assert.equal(canAddProductForPlan('business', 100), true);

  const products: Product[] = [
    {
      id: 'p1',
      storeId: 's1',
      categoryId: 'c1',
      name: 'زيت زيتون فاخر',
      description: 'عصرة أولى',
      price: 60,
      images: [],
      sizes: [],
      colors: [],
      stock: 10,
      available: true,
      archived: false,
      views: 40,
      rating: 4.9,
      reviewCount: 4,
      createdAt: '2026-11-20',
      reviews: [],
    },
    {
      id: 'p2',
      storeId: 's2',
      categoryId: 'c2',
      name: 'سماعة لاسلكية',
      description: 'صوت نقي',
      price: 150,
      images: [],
      sizes: [],
      colors: [],
      stock: 5,
      available: true,
      archived: false,
      views: 95,
      rating: 4.5,
      reviewCount: 2,
      createdAt: '2026-11-25',
      reviews: [],
    },
  ];

  const byRegion = filterAndSortProducts(products, sampleStores, {
    region: 'مدينة غزة',
    sortBy: 'views',
  });
  assert.equal(byRegion.length, 1);
  assert.equal(byRegion[0].id, 'p1');
});

test('appendOrderTimeline records status transition cleanly', () => {
  const baseOrder: Order = {
    id: 'o1',
    orderNumber: '#SG-1001',
    storeId: 's1',
    storeName: 'متجر زيتون الرمال',
    customerName: 'منى',
    customerPhone: '0599111222',
    region: 'مدينة غزة',
    address: 'تل الهوا',
    channel: 'platform',
    isGuest: true,
    items: [],
    subtotal: 50,
    deliveryFee: 10,
    total: 60,
    status: 'new',
    timeline: [{ status: 'new', label: 'طلب جديد', timestamp: '10:00', actor: 'المشتري' }],
    createdAt: '2026-11-27',
  };

  const updated = appendOrderTimeline(baseOrder, 'accepted', 'التاجر', 'تم تأكيد التوفر', '10:15');
  assert.equal(updated.status, 'accepted');
  assert.equal(updated.timeline.length, 2);
  assert.equal(updated.timeline[1].label, 'مقبول');
});

test('appendProductReview recalculates average rating and review count', () => {
  const product: Product = {
    id: 'p1',
    storeId: 's1',
    categoryId: 'c1',
    name: 'زيت زيتون',
    description: 'وصف',
    price: 50,
    images: [],
    sizes: [],
    colors: [],
    stock: 5,
    available: true,
    archived: false,
    views: 10,
    rating: 4.0,
    reviewCount: 1,
    createdAt: '2026-11-01',
    reviews: [],
  };

  const reviewed = appendProductReview(product, {
    author: 'أحمد',
    rating: 5,
    comment: 'ممتاز جداً',
    date: '2026-11-27',
  });
  assert.equal(reviewed.reviewCount, 2);
  assert.equal(reviewed.rating, 4.5);
  assert.equal(reviewed.reviews[0].author, 'أحمد');
});

test('buildStoreAnalyticsSeries produces weekly (7d) and monthly (6m) sales and visits datasets', () => {
  const weekly = buildStoreAnalyticsSeries({
    store: sampleStores[0],
    orders: [],
    products: [],
    period: 'week',
  });
  assert.equal(weekly.series.length, 7);
  assert.ok(weekly.totalVisits > 0);

  const monthly = buildStoreAnalyticsSeries({
    store: sampleStores[0],
    orders: [],
    products: [],
    period: 'month',
  });
  assert.equal(monthly.series.length, 6);
  assert.ok(monthly.totalVisits >= weekly.totalVisits);
});
