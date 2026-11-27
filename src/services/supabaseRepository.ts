import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  Category,
  Order,
  PlatformSettings,
  Product,
  Store,
  StoreApplication,
  SubscriptionPlan,
} from '../types/marketplace';

export interface SupabaseBootstrapPayload {
  categories: Category[];
  stores: Store[];
  products: Product[];
  plans: SubscriptionPlan[];
  platformSettings: PlatformSettings | null;
}

/**
 * Fetches live marketplace entities from Supabase PostgreSQL when configured.
 * Returns null when Supabase environment variables are not connected yet.
 */
export async function fetchSupabaseMarketplaceData(): Promise<SupabaseBootstrapPayload | null> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured || !client) return null;

  try {
    const [catRes, storeRes, prodRes, planRes, settingsRes] = await Promise.all([
      client.from('categories').select('*').order('sort_order', { ascending: true }),
      client.from('stores').select('*').order('created_at', { ascending: false }),
      client.from('products').select('*').eq('archived', false).order('created_at', { ascending: false }),
      client.from('subscription_plans').select('*'),
      client.from('platform_settings').select('*').eq('id', 1).maybeSingle(),
    ]);

    if (catRes.error || storeRes.error || prodRes.error) {
      return null;
    }

    const categories: Category[] = (catRes.data || []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      iconName: String(row.icon_name || 'Tag'),
      productCount: Number(row.product_count || 0),
      active: Boolean(row.active),
      sortOrder: Number(row.sort_order || 0),
    }));

    const stores: Store[] = (storeRes.data || []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      username: String(row.username),
      ownerName: String(row.owner_name),
      email: String(row.email),
      phone: String(row.phone),
      whatsapp: String(row.whatsapp),
      region: row.region,
      description: String(row.description || ''),
      coverImage: String(row.cover_image_url || ''),
      logoText: String(row.logo_text || 'م'),
      verified: Boolean(row.verified),
      featured: Boolean(row.featured),
      status: row.status,
      rating: Number(row.rating || 5),
      reviewCount: Number(row.review_count || 0),
      workingHours: String(row.working_hours || ''),
      plan: row.plan,
      planStartDate: String(row.plan_start_date || ''),
      planEndDate: String(row.plan_end_date || ''),
      deliveryFees: (row.delivery_fees as Store['deliveryFees']) || {},
      policies: String(row.policies || ''),
      orderNotificationsEnabled: Boolean(row.order_notifications_enabled),
      views: Number(row.views || 0),
      createdAt: String(row.created_at || ''),
    }));

    const products: Product[] = (prodRes.data || []).map((row) => ({
      id: String(row.id),
      storeId: String(row.store_id),
      categoryId: String(row.category_id || ''),
      name: String(row.name),
      description: String(row.description || ''),
      price: Number(row.price || 0),
      compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : undefined,
      images: Array.isArray(row.images) ? row.images.map(String) : [],
      sizes: Array.isArray(row.sizes) ? row.sizes.map(String) : [],
      colors: Array.isArray(row.colors) ? row.colors.map(String) : [],
      stock: Number(row.stock || 0),
      available: Boolean(row.available),
      archived: Boolean(row.archived),
      views: Number(row.views || 0),
      rating: Number(row.rating || 5),
      reviewCount: Number(row.review_count || 0),
      createdAt: String(row.created_at || ''),
      reviews: [],
    }));

    const plans: SubscriptionPlan[] = (planRes.data || []).map((row) => ({
      id: row.id,
      name: String(row.name),
      subtitle: String(row.subtitle || ''),
      monthlyPrice: Number(row.monthly_price || 0),
      maxProducts: Number(row.max_products || 15),
      features: Array.isArray(row.features) ? row.features.map(String) : [],
    }));

    const platformSettings: PlatformSettings | null = settingsRes.data
      ? {
          platformName: String(settingsRes.data.platform_name || 'سوقنا'),
          supportedRegions: settingsRes.data.supported_regions || [],
          usernameMinLength: Number(settingsRes.data.username_min_length || 3),
          guestCheckoutEnabled: Boolean(settingsRes.data.guest_checkout_enabled),
          maintenanceMode: Boolean(settingsRes.data.maintenance_mode),
          supportWhatsapp: String(settingsRes.data.support_whatsapp || ''),
          buyerTermsSummary: String(settingsRes.data.buyer_terms_summary || ''),
        }
      : null;

    return { categories, stores, products, plans, platformSettings };
  } catch {
    return null;
  }
}

export async function persistOrderToSupabase(order: Order): Promise<boolean> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured || !client) return false;
  const { error } = await client.from('orders').insert({
    order_number: order.orderNumber,
    store_id: order.storeId,
    store_name: order.storeName,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    region: order.region,
    address: order.address,
    notes: order.notes ?? null,
    channel: order.channel,
    is_guest: order.isGuest,
    items: order.items,
    subtotal: order.subtotal,
    delivery_fee: order.deliveryFee,
    total: order.total,
    status: order.status,
    timeline: order.timeline,
  });
  return !error;
}

export async function persistStoreApplicationToSupabase(
  app: StoreApplication
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured || !client) return false;
  const { error } = await client.from('store_applications').insert({
    store_name: app.storeName,
    username: app.username,
    owner_name: app.ownerName,
    email: app.email,
    phone: app.phone,
    whatsapp: app.whatsapp,
    region: app.region,
    description: app.description,
    proof_document_name: app.proofDocumentName,
    proof_summary: app.proofSummary,
    status: app.status,
  });
  return !error;
}
