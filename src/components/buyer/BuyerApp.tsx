import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Heart,
  Home,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Store as StoreIcon,
  Trash2,
  User,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import { GAZA_REGIONS } from '../../data/seedData';
import { useMarketplace } from '../../store/MarketplaceContext';
import type { GazaRegion } from '../../types/marketplace';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppProductMessage,
  calculateStoreCartTotals,
  filterAndSortProducts,
  ORDER_STATUS_META,
  type ProductSortOption,
} from '../../utils/marketplace';
import {
  Button,
  EmptyState,
  ImageWithFallback,
  ModalDialog,
  OfflineBanner,
  ProductCard,
  SearchInputBar,
  SelectInput,
  StatusBadge,
  StoreCard,
  TextInput,
  VerifiedBadge,
} from '../ui/DesignSystemKit';
import {
  EASE_OUT_EXPO,
  HeroReveal,
  PageTransition,
  ParallaxImage,
  ScrollReveal,
  TextMaskReveal,
} from '../ui/MotionPrimitives';

export function BuyerApp() {
  const {
    buyerScreen,
    setBuyerScreen,
    isOffline,
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
    placeOrder,
    updateOrderStatus,
    addProductReview,
    showToast,
  } = useMarketplace();

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ProductSortOption>('newest');
  const [filterStoreId, setFilterStoreId] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [searchTab, setSearchTab] = useState<'products' | 'stores'>('products');
  const [showFilters, setShowFilters] = useState(false);

  // Product detail states
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [justAddedDetail, setJustAddedDetail] = useState(false);

  useEffect(() => {
    if (!justAddedDetail) return;
    const t = window.setTimeout(() => setJustAddedDetail(false), 1100);
    return () => window.clearTimeout(t);
  }, [justAddedDetail]);

  // Storefront category filter
  const [storeCatFilter, setStoreCatFilter] = useState<string>('all');

  // Checkout states
  const [guestName, setGuestName] = useState(buyerAccount.signedIn ? buyerAccount.name : '');
  const [guestPhone, setGuestPhone] = useState(buyerAccount.signedIn ? buyerAccount.phone : '');
  const [guestRegion, setGuestRegion] = useState<GazaRegion>(
    selectedRegion === 'الكل' ? 'مدينة غزة' : selectedRegion
  );
  const [guestAddress, setGuestAddress] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [orderFailedBanner, setOrderFailedBanner] = useState(false);

  // Order tracking lookup
  const [trackingLookup, setTrackingLookup] = useState('');

  // WhatsApp Preview Modal
  const [whatsappPreview, setWhatsappPreview] = useState<{
    open: boolean;
    storeName: string;
    phone: string;
    message: string;
  }>({ open: false, storeName: '', phone: '', message: '' });

  // Account tab
  const [accountTab, setAccountTab] = useState<'orders' | 'favorites' | 'addresses' | 'notifications'>('orders');

  // Product review draft
  const [reviewAuthor, setReviewAuthor] = useState(buyerAccount.signedIn ? buyerAccount.name : '');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');

  // Saved address form
  const [newAddrRegion, setNewAddrRegion] = useState<GazaRegion>('مدينة غزة');
  const [newAddrText, setNewAddrText] = useState('');

  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  const approvedStores = useMemo(
    () =>
      stores.filter(
        (s) =>
          s.status === 'approved' &&
          (selectedRegion === 'الكل' || s.region === selectedRegion)
      ),
    [stores, selectedRegion]
  );

  const totalCartItems = useMemo(
    () => Object.values(cartsByStore).reduce((sum, items) => sum + items.reduce((a, i) => a + i.quantity, 0), 0),
    [cartsByStore]
  );

  const visibleProducts = useMemo(
    () =>
      filterAndSortProducts(products, stores, {
        region: selectedRegion,
      }),
    [products, stores, selectedRegion]
  );

  const openWhatsAppSheet = (storeName: string, phone: string, message: string) => {
    setWhatsappPreview({ open: true, storeName, phone, message });
  };

  // SCREEN 1: HOME
  const renderHome = () => {
    const recentProducts = visibleProducts.slice(0, 4);
    const mostViewed = [...visibleProducts].sort((a, b) => b.views - a.views).slice(0, 4);
    const featuredStores = approvedStores.filter((s) => s.featured);
    const topRatedStores = [...approvedStores].sort((a, b) => b.rating - a.rating).slice(0, 3);

    return (
      <div className="space-y-8 pb-20 md:pb-12">
        {/* Top Region & Quick Search */}
        <div className="px-4 pt-4 space-y-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setBuyerScreen('search')}
              className="flex-1 min-w-0 min-h-[44px] px-3 rounded-xl bg-white border border-[#E4E7E2] flex items-center gap-2 text-xs text-[#78827D] text-right cursor-pointer"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate">ابحث عن منتج أو متجر...</span>
            </button>

            <div className="relative shrink-0">
              <select
                aria-label="اختر المنطقة"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value as GazaRegion | 'الكل')}
                className="min-h-[44px] max-w-[116px] pr-2.5 pl-1.5 rounded-xl bg-[#E6EFEA] text-[#153D35] text-xs font-bold border border-[#153D35]/15 focus:outline-none cursor-pointer"
              >
                <option value="الكل">كل غزة</option>
                {GAZA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setAccountTab('favorites');
                setBuyerScreen('account');
              }}
              aria-label="المفضلة"
              className="relative md:hidden w-11 h-11 shrink-0 rounded-xl bg-white border border-[#E4E7E2] flex items-center justify-center text-[#252A28] cursor-pointer"
            >
              <Heart className="w-4 h-4" />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D5A64A] text-[#252A28] text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {favorites.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hero Reveal + Parallax Brand Showcase (zero temporary ad slots or mock images) */}
        <HeroReveal className="px-4">
          <div className="relative rounded-2xl overflow-hidden border border-[#153D35]/20 bg-[#153D35]">
            <ParallaxImage className="w-full h-52 md:h-64" intensity={16}>
              <div className="w-full h-full bg-[radial-gradient(circle_at_top_left,_rgba(213,166,74,0.22),_transparent_52%),radial-gradient(circle_at_bottom_right,_rgba(47,125,88,0.45),_transparent_58%),linear-gradient(135deg,_#153D35_0%,_#0f2c26_100%)]" />
            </ParallaxImage>
            <div className="absolute inset-0 p-5 md:p-8 flex flex-col justify-end text-white space-y-2">
              <div className="text-[11px] font-bold text-[#D5A64A] tracking-wide">
                منصة التجارة المحلية في قطاع غزة
              </div>
              <h1 className="text-lg md:text-2xl font-extrabold leading-snug max-w-2xl">
                <TextMaskReveal trigger="mount" delay={0.08}>
                  تسوّق مباشرة من متاجر غزة الموثقة بكل ثقة وسهولة
                </TextMaskReveal>
              </h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16, ease: EASE_OUT_EXPO }}
                className="text-xs md:text-sm text-white/85 max-w-xl"
              >
                اكتشف المنتجات المحلية والمونة والحرف اليدوية، وأتمم طلبك مباشرة كضيف أو عبر واتساب دون تعقيد.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.22, ease: EASE_OUT_EXPO }}
                className="pt-1 flex items-center gap-2.5 flex-wrap"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId('all');
                    setBuyerScreen('categories');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#D5A64A] text-[#252A28] text-xs font-bold whitespace-nowrap cursor-pointer hover:bg-[#c6983d] transition-colors"
                >
                  تصفح كافة المنتجات
                </button>
                <button
                  type="button"
                  onClick={() => setBuyerScreen('search')}
                  className="px-4 py-2 rounded-xl bg-white/15 border border-white/25 text-white text-xs font-bold whitespace-nowrap cursor-pointer hover:bg-white/25 transition-colors"
                >
                  البحث حسب المنطقة
                </button>
              </motion.div>
            </div>
          </div>
        </HeroReveal>

        {/* Categories */}
        <ScrollReveal>
          <section className="space-y-2.5">
            <div className="px-4 flex items-center justify-between">
              <h2 className="text-sm md:text-base font-bold text-[#252A28]">
                <TextMaskReveal>التصنيفات</TextMaskReveal>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId('all');
                  setBuyerScreen('categories');
                }}
                className="text-xs font-bold text-[#153D35] cursor-pointer"
              >
                عرض الكل
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 thin-scroll">
              {categories
                .filter((c) => c.active)
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setBuyerScreen('categories');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white border border-[#E4E7E2] text-xs font-bold text-[#252A28] hover:border-[#153D35] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    {cat.name}
                  </button>
                ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Featured Stores */}
        <ScrollReveal delay={0.04}>
          <section className="px-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm md:text-base font-bold text-[#252A28]">
                <TextMaskReveal>متاجر مميزة</TextMaskReveal>
              </h2>
              <span className="text-xs text-[#78827D] tabular-nums">{featuredStores.length} متاجر</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {featuredStores.map((store) => (
                <StoreCard key={store.id} store={store} onOpenStore={() => openStore(store.id)} />
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Recent Products */}
        <ScrollReveal delay={0.04}>
          <section className="px-4 space-y-2.5">
            <h2 className="text-sm md:text-base font-bold text-[#252A28]">
              <TextMaskReveal>أحدث المنتجات</TextMaskReveal>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recentProducts.map((p) => {
                const st = storeMap.get(p.storeId);
                return (
                  <ProductCard
                    key={p.id}
                    product={p}
                    store={st}
                    isFavorite={favorites.includes(p.id)}
                    onToggleFavorite={() => toggleFavorite(p.id)}
                    onOpenProduct={() => openProduct(p.id)}
                    onOpenStore={() => st && openStore(st.id)}
                    onQuickAdd={() =>
                      addToCart({
                        productId: p.id,
                        storeId: p.storeId,
                        name: p.name,
                        price: p.price,
                        image: p.images[0] || '',
                        quantity: 1,
                        selectedSize: p.sizes[0],
                        selectedColor: p.colors[0],
                      })
                    }
                  />
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* Most Viewed */}
        <ScrollReveal delay={0.04}>
          <section className="px-4 space-y-2.5">
            <h2 className="text-sm md:text-base font-bold text-[#252A28]">
              <TextMaskReveal>المنتجات الأكثر مشاهدة</TextMaskReveal>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {mostViewed.map((p) => {
                const st = storeMap.get(p.storeId);
                return (
                  <ProductCard
                    key={`mv-${p.id}`}
                    product={p}
                    store={st}
                    isFavorite={favorites.includes(p.id)}
                    onToggleFavorite={() => toggleFavorite(p.id)}
                    onOpenProduct={() => openProduct(p.id)}
                    onOpenStore={() => st && openStore(st.id)}
                  />
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* Top Rated Stores */}
        <ScrollReveal delay={0.04}>
          <section className="px-4 space-y-2.5">
            <h2 className="text-sm md:text-base font-bold text-[#252A28]">
              <TextMaskReveal>المتاجر الأعلى تقييماً</TextMaskReveal>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topRatedStores.map((store) => (
                <StoreCard key={`top-${store.id}`} store={store} onOpenStore={() => openStore(store.id)} />
              ))}
            </div>
          </section>
        </ScrollReveal>
      </div>
    );
  };

  // SCREEN 2: CATEGORIES & CATEGORY PRODUCTS
  const renderCategories = () => {
    const activeCat = categories.find((c) => c.id === selectedCategoryId);
    const filtered = filterAndSortProducts(products, stores, {
      categoryId: selectedCategoryId,
      region: selectedRegion,
      storeId: filterStoreId === 'all' ? undefined : filterStoreId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy,
    });

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {selectedCategoryId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                aria-label="العودة للتصنيفات"
                className="w-9 h-9 rounded-xl bg-white border border-[#E4E7E2] flex items-center justify-center cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-base font-extrabold text-[#252A28]">
              {activeCat ? activeCat.name : 'التصنيفات والمنتجات'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="min-h-[38px] px-3 rounded-xl bg-white border border-[#E4E7E2] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            تصفية وترتيب
          </button>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {categories
            .filter((c) => c.active)
            .map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(isSelected ? 'all' : cat.id)}
                  className={`p-3.5 rounded-2xl border text-right transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#153D35] text-white border-[#153D35]'
                      : 'bg-white text-[#252A28] border-[#E4E7E2]'
                  }`}
                >
                  <div className="text-xs font-bold">{cat.name}</div>
                  <div
                    className={`text-[11px] mt-1 tabular-nums ${
                      isSelected ? 'text-white/80' : 'text-[#78827D]'
                    }`}
                  >
                    {products.filter((p) => p.categoryId === cat.id && !p.archived).length} منتجات
                  </div>
                </button>
              );
            })}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white border border-[#E4E7E2] rounded-2xl p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <SelectInput
                label="المنطقة"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value as GazaRegion | 'الكل')}
              >
                <option value="الكل">كل المناطق</option>
                {GAZA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                label="المتجر"
                value={filterStoreId}
                onChange={(e) => setFilterStoreId(e.target.value)}
              >
                <option value="all">كل المتاجر</option>
                {approvedStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                label="السعر من (₪)"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
              />
              <TextInput
                label="السعر إلى (₪)"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="500"
              />
            </div>
            <SelectInput
              label="ترتيب حسب"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ProductSortOption)}
            >
              <option value="newest">الأحدث</option>
              <option value="price_asc">السعر: من الأقل للأعلى</option>
              <option value="price_desc">السعر: من الأعلى للأقل</option>
              <option value="rating">الأعلى تقييماً</option>
              <option value="views">الأكثر مشاهدة</option>
            </SelectInput>
          </div>
        )}

        {/* Products List */}
        {filtered.length === 0 ? (
          <EmptyState
            title="لا توجد منتجات مطابقة"
            description="جرّب توسيع نطاق السعر أو اختيار منطقة أخرى."
            actionLabel="إعادة الضبط"
            onAction={() => {
              setSelectedCategoryId('all');
              setFilterStoreId('all');
              setMinPrice('');
              setMaxPrice('');
            }}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p) => {
              const st = storeMap.get(p.storeId);
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  store={st}
                  isFavorite={favorites.includes(p.id)}
                  onToggleFavorite={() => toggleFavorite(p.id)}
                  onOpenProduct={() => openProduct(p.id)}
                  onOpenStore={() => st && openStore(st.id)}
                  onQuickAdd={() =>
                    addToCart({
                      productId: p.id,
                      storeId: p.storeId,
                      name: p.name,
                      price: p.price,
                      image: p.images[0],
                      quantity: 1,
                      selectedSize: p.sizes[0],
                      selectedColor: p.colors[0],
                    })
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // SCREEN 3: SEARCH
  const renderSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    const suggestions = q
      ? products
          .filter((p) => !p.archived && p.name.toLowerCase().includes(q))
          .slice(0, 4)
      : [];

    const matchedProducts = filterAndSortProducts(products, stores, {
      query: searchQuery,
      region: selectedRegion,
      sortBy,
    });

    const matchedStores = approvedStores.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center gap-2">
          <SearchInputBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={() => addSearchHistory(searchQuery)}
            placeholder="ابحث عن منتج أو اسم متجر..."
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-[#78827D] px-2 cursor-pointer"
            >
              مسح
            </button>
          )}
        </div>

        {/* Live Suggestions */}
        {q.length >= 1 && suggestions.length > 0 && (
          <div className="bg-white border border-[#E4E7E2] rounded-2xl divide-y divide-[#E4E7E2]">
            <div className="px-3.5 py-2 text-[11px] font-bold text-[#78827D]">اقتراحات فورية</div>
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  addSearchHistory(s.name);
                  openProduct(s.id);
                }}
                className="w-full px-3.5 py-2.5 text-right text-xs font-medium text-[#252A28] hover:bg-[#F6F4EE] flex items-center justify-between cursor-pointer"
              >
                <span>{s.name}</span>
                <span className="text-[#153D35] font-bold tabular-nums">{s.price} ₪</span>
              </button>
            ))}
          </div>
        )}

        {/* Search History */}
        {!q && searchHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#78827D]">عمليات البحث السابقة</span>
              <button
                type="button"
                onClick={clearSearchHistory}
                className="text-[11px] font-semibold text-[#B54747] cursor-pointer"
              >
                مسح السجل
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearchQuery(term)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#E4E7E2] text-xs font-semibold text-[#252A28] cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs & Region Filter */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#E4E7E2]/60">
            <button
              type="button"
              onClick={() => setSearchTab('products')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                searchTab === 'products' ? 'bg-white text-[#153D35]' : 'text-[#78827D]'
              }`}
            >
              المنتجات ({matchedProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setSearchTab('stores')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                searchTab === 'stores' ? 'bg-white text-[#153D35]' : 'text-[#78827D]'
              }`}
            >
              المتاجر ({matchedStores.length})
            </button>
          </div>

          <select
            aria-label="تصفية المنطقة في البحث"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value as GazaRegion | 'الكل')}
            className="h-9 px-2.5 rounded-xl bg-white border border-[#E4E7E2] text-xs font-semibold"
          >
            <option value="الكل">كل المناطق</option>
            {GAZA_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        {searchTab === 'products' ? (
          matchedProducts.length === 0 ? (
            <EmptyState
              title="لم نعثر على منتجات مطابقة"
              description="تأكد من كتابة الكلمة بشكل صحيح أو ابحث باسم تصنيف عام."
              actionLabel="مسح البحث"
              onAction={() => setSearchQuery('')}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {matchedProducts.map((p) => {
                const st = storeMap.get(p.storeId);
                return (
                  <ProductCard
                    key={p.id}
                    product={p}
                    store={st}
                    isFavorite={favorites.includes(p.id)}
                    onToggleFavorite={() => toggleFavorite(p.id)}
                    onOpenProduct={() => openProduct(p.id)}
                    onOpenStore={() => st && openStore(st.id)}
                  />
                );
              })}
            </div>
          )
        ) : matchedStores.length === 0 ? (
          <EmptyState
            title="لا توجد متاجر مطابقة"
            description="جرّب البحث باسم مختلف أو اختر كل المناطق."
            actionLabel="عرض كل المتاجر"
            onAction={() => {
              setSearchQuery('');
              setSelectedRegion('الكل');
            }}
          />
        ) : (
          <div className="space-y-2.5">
            {matchedStores.map((st) => (
              <StoreCard key={st.id} store={st} onOpenStore={() => openStore(st.id)} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // SCREEN 4: PRODUCT DETAILS
  const renderProductDetail = () => {
    const product = products.find((p) => p.id === selectedProductId) || products[0];
    if (!product) return null;
    const store = storeMap.get(product.storeId);
    const chosenSize = selectedSize || product.sizes[0] || '';
    const chosenColor = selectedColor || product.colors[0] || '';
    const similar = products.filter(
      (p) => p.id !== product.id && p.categoryId === product.categoryId && !p.archived
    );

    const handleAdd = (goCheckout = false) => {
      addToCart({
        productId: product.id,
        storeId: product.storeId,
        name: product.name,
        price: product.price,
        image: product.images[0],
        quantity: 1,
        selectedSize: chosenSize || undefined,
        selectedColor: chosenColor || undefined,
      });
      if (goCheckout) {
        startCheckoutForStore(product.storeId);
      } else {
        setJustAddedDetail(true);
      }
    };

    return (
      <div className="pb-28 space-y-4">
        {/* Top bar */}
        <div className="px-4 pt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setBuyerScreen('home')}
            className="min-h-[40px] px-3 rounded-xl bg-white border border-[#E4E7E2] inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            العودة
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(product.id)}
            aria-label="إضافة للمفضلة"
            className="w-10 h-10 rounded-xl bg-white border border-[#E4E7E2] flex items-center justify-center cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 ${
                favorites.includes(product.id) ? 'fill-[#B54747] text-[#B54747]' : 'text-[#252A28]'
              }`}
            />
          </button>
        </div>

        {/* Gallery with Hover Zoom & Interactive Lightbox */}
        <div className="px-4 space-y-2">
          <div className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#E4E7E2] bg-white">
            <button
              type="button"
              onClick={() => setZoomModalOpen(true)}
              aria-label={`تكبير صورة ${product.name}`}
              className="w-full h-full block cursor-zoom-in overflow-hidden"
            >
              <ImageWithFallback
                src={product.images[activeImageIdx] || product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                fallbackTitle={product.name}
              />
            </button>
            <button
              type="button"
              onClick={() => setZoomModalOpen(true)}
              aria-label="معاينة مكبرة للصورة"
              className="absolute bottom-2.5 left-2.5 h-8 px-2.5 rounded-xl bg-white/95 border border-[#E4E7E2] text-[11px] font-bold text-[#153D35] inline-flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              تكبير
            </button>
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImageIdx(i)}
                  className={`w-16 h-12 rounded-xl overflow-hidden border-2 cursor-pointer transition-transform hover:scale-105 ${
                    activeImageIdx === i ? 'border-[#153D35]' : 'border-[#E4E7E2]'
                  }`}
                >
                  <ImageWithFallback src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Core Product Details */}
        <div className="px-4 space-y-4">
          <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <StatusBadge
                tone={product.available && product.stock > 0 ? 'success' : 'danger'}
                label={
                  product.available && product.stock > 0
                    ? `متوفر (${product.stock} قطعة)`
                    : 'غير متوفر حالياً'
                }
              />
            </div>

            <h1 className="text-lg font-extrabold text-[#252A28] leading-snug">
              <TextMaskReveal trigger="mount">{product.name}</TextMaskReveal>
            </h1>

            <div className="flex items-baseline gap-2.5 tabular-nums">
              <span className="text-2xl font-extrabold text-[#153D35]">{product.price} ₪</span>
              {product.compareAtPrice && (
                <span className="text-sm text-[#78827D] line-through">{product.compareAtPrice} ₪</span>
              )}
            </div>

            {store && (
              <div className="pt-2 border-t border-[#E4E7E2] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openStore(store.id)}
                  className="flex items-center gap-2 text-right cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-xl bg-[#153D35] text-white font-bold flex items-center justify-center">
                    {store.logoText}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#252A28]">{store.name}</div>
                    <div className="text-[11px] text-[#78827D]">{store.region}</div>
                  </div>
                </button>
                <VerifiedBadge verified={store.verified} />
              </div>
            )}
          </div>

          {/* Options */}
          {(product.sizes.length > 0 || product.colors.length > 0) && (
            <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
              {product.sizes.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-[#252A28]">الحجم / المقاس</span>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                          chosenSize === sz
                            ? 'bg-[#153D35] text-white border-[#153D35]'
                            : 'bg-[#F6F4EE] text-[#252A28] border-[#E4E7E2]'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {product.colors.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-[#252A28]">اللون / النوع</span>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((cl) => (
                      <button
                        key={cl}
                        type="button"
                        onClick={() => setSelectedColor(cl)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                          chosenColor === cl
                            ? 'bg-[#153D35] text-white border-[#153D35]'
                            : 'bg-[#F6F4EE] text-[#252A28] border-[#E4E7E2]'
                        }`}
                      >
                        {cl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-1.5">
            <h2 className="text-xs font-bold text-[#252A28]">وصف المنتج</h2>
            <p className="text-xs text-[#78827D] leading-relaxed">{product.description}</p>
          </div>

          {/* WhatsApp Direct Contact */}
          {store && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                openWhatsAppSheet(
                  store.name,
                  store.whatsapp,
                  buildWhatsAppProductMessage({
                    storeName: store.name,
                    productName: product.name,
                    price: product.price,
                    selectedSize: chosenSize,
                    selectedColor: chosenColor,
                  })
                )
              }
            >
              <MessageCircle className="w-4 h-4 text-[#2F7D58]" />
              التواصل مع المتجر عبر واتساب
            </Button>
          )}

          {/* Reviews */}
          <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#252A28]">التقييمات</h2>
              <span className="text-xs font-bold text-[#153D35] tabular-nums">
                ★ {product.rating.toFixed(1)} ({product.reviewCount})
              </span>
            </div>
            {product.reviews.length === 0 ? (
              <p className="text-xs text-[#78827D]">لا توجد تعليقات مكتوبة بعد.</p>
            ) : (
              <div className="space-y-2.5 divide-y divide-[#E4E7E2]">
                {product.reviews.map((rev) => (
                  <div key={rev.id} className="pt-2 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#252A28]">{rev.author}</span>
                      <span className="text-[#D5A64A] tabular-nums">★ {rev.rating}</span>
                    </div>
                    <p className="text-xs text-[#78827D]">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!reviewComment.trim()) return;
                addProductReview(product.id, {
                  author: reviewAuthor.trim() || 'مشتري من سوقنا',
                  rating: reviewRating,
                  comment: reviewComment.trim(),
                });
                setReviewComment('');
                setReviewRating(5);
              }}
              className="pt-3 border-t border-[#E4E7E2] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#153D35]">أضف تقييمك للمنتج</span>
                <div className="flex items-center gap-1" role="radiogroup" aria-label="اختر التقييم">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border cursor-pointer tabular-nums ${
                        star <= reviewRating
                          ? 'bg-[#FAF1DC] text-[#9A6E1B] border-[#D5A64A]'
                          : 'bg-[#F6F4EE] text-[#78827D] border-[#E4E7E2]'
                      }`}
                      aria-label={`تقييم ${star} من 5`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <TextInput
                label="الاسم"
                value={reviewAuthor}
                onChange={(e) => setReviewAuthor(e.target.value)}
                placeholder="اسمك أو اتركه فارغاً كمشتري ضيف"
              />
              <TextInput
                label="تعليقك على المنتج"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="شارك تجربتك حول الجودة والتغليف..."
                required
              />
              <Button type="submit" variant="secondary" size="sm" className="w-full">
                إرسال التقييم
              </Button>
            </form>
          </div>

          {/* Similar */}
          {similar.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-[#252A28]">منتجات مشابهة</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {similar.slice(0, 2).map((sp) => (
                  <ProductCard
                    key={sp.id}
                    product={sp}
                    store={storeMap.get(sp.storeId)}
                    isFavorite={favorites.includes(sp.id)}
                    onToggleFavorite={() => toggleFavorite(sp.id)}
                    onOpenProduct={() => openProduct(sp.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Purchase Action Module (Thumb Zone) */}
          <div className="bg-white border border-[#E4E7E2] rounded-2xl p-3 flex items-center gap-2">
            <Button
              variant={justAddedDetail ? 'primary' : 'secondary'}
              className="flex-1"
              disabled={!product.available || product.stock <= 0}
              onClick={() => handleAdd(false)}
            >
              {justAddedDetail ? (
                <>
                  <Check className="w-4 h-4" />
                  تمت الإضافة للسلة
                </>
              ) : (
                'إضافة للسلة'
              )}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={!product.available || product.stock <= 0}
              onClick={() => handleAdd(true)}
            >
              اشتر الآن
            </Button>
          </div>
        </div>

        {/* Image Zoom Lightbox Modal */}
        <ModalDialog
          open={zoomModalOpen}
          title={product.name}
          onClose={() => setZoomModalOpen(false)}
        >
          <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#E4E7E2] bg-[#F6F4EE]">
            <ImageWithFallback
              src={product.images[activeImageIdx] || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover scale-105"
            />
          </div>
        </ModalDialog>
      </div>
    );
  };

  // SCREEN 5: STOREFRONT
  const renderStorefront = () => {
    const store = stores.find((s) => s.id === selectedStoreId) || stores[0];
    if (!store) return null;
    const storeProducts = products.filter(
      (p) =>
        p.storeId === store.id &&
        !p.archived &&
        (storeCatFilter === 'all' || p.categoryId === storeCatFilter)
    );
    const storeCategories = categories.filter((c) =>
      products.some((p) => p.storeId === store.id && p.categoryId === c.id && !p.archived)
    );

    return (
      <div className="pb-24 space-y-4">
        <div className="relative h-44 bg-[#153D35] overflow-hidden">
          <ParallaxImage className="w-full h-full" intensity={18}>
            <ImageWithFallback
              src={store.coverImage}
              alt={store.name}
              className="w-full h-full object-cover opacity-85"
            />
          </ParallaxImage>
          <button
            type="button"
            onClick={() => setBuyerScreen('home')}
            className="absolute top-3 right-3 z-10 h-9 px-3 rounded-xl bg-white/95 text-[#252A28] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            الرئيسية
          </button>
        </div>

        <div className="px-4 -mt-8 relative z-10 space-y-3">
          <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#153D35] text-white text-xl font-extrabold flex items-center justify-center shrink-0">
                  {store.logoText}
                </div>
                <div>
                  <h1 className="text-base font-extrabold text-[#252A28]">
                    <TextMaskReveal trigger="mount">{store.name}</TextMaskReveal>
                  </h1>
                  <div className="text-xs text-[#78827D]" dir="ltr">
                    @{store.username}
                  </div>
                </div>
              </div>
              <VerifiedBadge verified={store.verified} />
            </div>

            {!store.verified && (
              <div className="bg-[#F6F4EE] border border-[#E4E7E2] rounded-xl p-2.5 text-[11px] text-[#78827D]">
                هذا المتجر معتمد للبيع على المنصة ولم يُمنح شارة التوثيق الرسمية بعد.
              </div>
            )}

            <p className="text-xs text-[#252A28] leading-relaxed">{store.description}</p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E4E7E2] text-[11px] text-[#78827D]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#153D35]" />
                <span>{store.region}</span>
              </div>
              <div className="flex items-center gap-1.5 tabular-nums">
                <Star className="w-3.5 h-3.5 text-[#D5A64A]" />
                <span>
                  {store.rating.toFixed(1)} ({store.reviewCount} تقييم)
                </span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <Clock className="w-3.5 h-3.5 text-[#153D35]" />
                <span>{store.workingHours}</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <Phone className="w-3.5 h-3.5 text-[#153D35]" />
                <span className="tabular-nums">{store.phone}</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() =>
                openWhatsAppSheet(
                  store.name,
                  store.whatsapp,
                  `مرحباً ${store.name}، أتواصل معكم عبر متجركم على منصة سوقنا.`
                )
              }
            >
              <MessageCircle className="w-4 h-4" />
              مراسلة المتجر عبر واتساب
            </Button>
          </div>

          {/* Store Categories */}
          <div className="flex gap-2 overflow-x-auto pb-1 thin-scroll">
            <button
              type="button"
              onClick={() => setStoreCatFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                storeCatFilter === 'all'
                  ? 'bg-[#153D35] text-white border-[#153D35]'
                  : 'bg-white text-[#252A28] border-[#E4E7E2]'
              }`}
            >
              جميع المنتجات
            </button>
            {storeCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setStoreCatFilter(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                  storeCatFilter === c.id
                    ? 'bg-[#153D35] text-white border-[#153D35]'
                    : 'bg-white text-[#252A28] border-[#E4E7E2]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Store Products */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {storeProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                store={store}
                isFavorite={favorites.includes(p.id)}
                onToggleFavorite={() => toggleFavorite(p.id)}
                onOpenProduct={() => openProduct(p.id)}
                onQuickAdd={() =>
                  addToCart({
                    productId: p.id,
                    storeId: p.storeId,
                    name: p.name,
                    price: p.price,
                    image: p.images[0],
                    quantity: 1,
                    selectedSize: p.sizes[0],
                    selectedColor: p.colors[0],
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // SCREEN 6: PER-STORE CART
  const renderCart = () => {
    const storeEntries = Object.entries(cartsByStore).filter(([, items]) => items.length > 0);
    const activeRegionForCalc: GazaRegion =
      selectedRegion === 'الكل' ? 'مدينة غزة' : selectedRegion;

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="space-y-1">
          <h1 className="text-base font-extrabold text-[#252A28]">سلة المشتريات</h1>
          <p className="text-xs text-[#78827D]">
            لكل متجر سلة وطلب مستقل لضمان وضوح التوصيل والتواصل المباشر.
          </p>
        </div>

        {storeEntries.length === 0 ? (
          <EmptyState
            title="سلتك فارغة حالياً"
            description="أضف منتجات من المتاجر المحلية وستظهر هنا مرتبة حسب كل متجر."
            actionLabel="تصفح المنتجات"
            onAction={() => setBuyerScreen('home')}
          />
        ) : (
          <div className="space-y-4">
            {storeEntries.map(([storeId, items]) => {
              const store = storeMap.get(storeId);
              const totals = calculateStoreCartTotals(items, store, activeRegionForCalc);
              return (
                <div
                  key={storeId}
                  className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E4E7E2]">
                    <button
                      type="button"
                      onClick={() => openStore(storeId)}
                      className="flex items-center gap-2 font-bold text-sm text-[#153D35] cursor-pointer"
                    >
                      <StoreIcon className="w-4 h-4" />
                      <span>{store?.name ?? 'متجر'}</span>
                    </button>
                    {store && <VerifiedBadge verified={store.verified} />}
                  </div>

                  <div className="divide-y divide-[#E4E7E2]">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.selectedSize}-${item.selectedColor}`}
                        className="py-3 flex gap-3"
                      >
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#E4E7E2]"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-xs font-bold text-[#252A28] line-clamp-2">
                            {item.name}
                          </div>
                          {(item.selectedSize || item.selectedColor) && (
                            <div className="text-[11px] text-[#78827D]">
                              {[item.selectedSize, item.selectedColor].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-extrabold text-[#153D35] tabular-nums">
                              {item.price * item.quantity} ₪
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label={`إنقاص كمية ${item.name}`}
                                onClick={() =>
                                  updateCartQty(
                                    storeId,
                                    item.productId,
                                    -1,
                                    item.selectedSize,
                                    item.selectedColor
                                  )
                                }
                                className="w-7 h-7 rounded-lg bg-[#F6F4EE] border border-[#E4E7E2] flex items-center justify-center cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold w-5 text-center tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label={`زيادة كمية ${item.name}`}
                                onClick={() =>
                                  updateCartQty(
                                    storeId,
                                    item.productId,
                                    1,
                                    item.selectedSize,
                                    item.selectedColor
                                  )
                                }
                                className="w-7 h-7 rounded-lg bg-[#F6F4EE] border border-[#E4E7E2] flex items-center justify-center cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                aria-label={`حذف ${item.name}`}
                                onClick={() =>
                                  removeCartItem(
                                    storeId,
                                    item.productId,
                                    item.selectedSize,
                                    item.selectedColor
                                  )
                                }
                                className="w-7 h-7 rounded-lg text-[#B54747] hover:bg-[#B54747]/10 flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#F6F4EE] rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#78827D]">المجموع الفرعي</span>
                      <span className="font-bold tabular-nums">{totals.subtotal} ₪</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#78827D]">رسوم التوصيل ({activeRegionForCalc})</span>
                      <span className="font-semibold tabular-nums">
                        {totals.deliveryFee !== null ? `${totals.deliveryFee} ₪` : 'تُحدد من المتجر'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-[#E4E7E2] text-sm font-extrabold text-[#153D35]">
                      <span>الإجمالي</span>
                      <span className="tabular-nums">{totals.total} ₪</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => startCheckoutForStore(storeId)}
                  >
                    إتمام الطلب من {store?.name}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // SCREEN 7: GUEST CHECKOUT
  const renderCheckout = () => {
    const store = storeMap.get(checkoutStoreId);
    const items = cartsByStore[checkoutStoreId] ?? [];
    const totals = calculateStoreCartTotals(items, store, guestRegion);

    const handleSubmitOrder = (channel: 'platform' | 'whatsapp') => {
      if (!guestName.trim() || !guestPhone.trim() || !guestAddress.trim()) {
        setCheckoutError('يرجى إدخال الاسم ورقم الهاتف والعنوان التفصيلي لإرسال الطلب.');
        return;
      }
      setCheckoutError(null);
      setOrderFailedBanner(false);

      const created = placeOrder({
        storeId: checkoutStoreId,
        customerName: guestName.trim(),
        customerPhone: guestPhone.trim(),
        region: guestRegion,
        address: guestAddress.trim(),
        notes: guestNotes.trim(),
        channel,
        deliveryFee: totals.deliveryFee,
        subtotal: totals.subtotal,
        total: totals.total,
      });

      if (channel === 'whatsapp' && store) {
        const msg = buildWhatsAppOrderMessage({
          storeName: store.name,
          orderNumber: created.orderNumber,
          customerName: guestName.trim(),
          customerPhone: guestPhone.trim(),
          region: guestRegion,
          address: guestAddress.trim(),
          items,
          subtotal: totals.subtotal,
          deliveryFee: totals.deliveryFee,
          total: totals.total,
          notes: guestNotes,
        });
        openWhatsAppSheet(store.name, store.whatsapp, msg);
      }
    };

    if (items.length === 0) {
      return (
        <div className="p-4">
          <EmptyState
            title="لا توجد منتجات في سلة هذا المتجر"
            description="أضف منتجات أولاً ثم ابدأ إتمام الطلب."
            actionLabel="العودة للسلة"
            onAction={() => setBuyerScreen('cart')}
          />
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBuyerScreen('cart')}
              className="w-9 h-9 rounded-xl bg-white border border-[#E4E7E2] flex items-center justify-center cursor-pointer"
              aria-label="العودة للسلة"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <h1 className="text-base font-extrabold text-[#252A28]">إتمام الطلب</h1>
          </div>
          <StatusBadge tone="info" label="طلب كضيف بدون تسجيل" />
        </div>

        {orderFailedBanner && (
          <div className="bg-[#B54747]/10 border border-[#B54747]/30 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-[#B54747]">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">تعذر إرسال الطلب مؤقتاً</div>
              <p className="text-[#252A28]">يرجى التحقق من الاتصال أو تجربة الإرسال عبر واتساب مباشرة.</p>
            </div>
          </div>
        )}

        {checkoutError && (
          <div className="bg-[#B54747]/10 border border-[#B54747]/30 rounded-xl p-3 text-xs font-semibold text-[#B54747]">
            {checkoutError}
          </div>
        )}

        {/* Buyer info form */}
        <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-bold text-[#153D35]">بيانات الاستلام</h2>
          {buyerAccount.addresses.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#78827D]">اختيار سريع من العناوين المحفوظة:</div>
              <div className="flex flex-wrap gap-1.5">
                {buyerAccount.addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setGuestRegion(addr.region);
                      setGuestAddress(addr.address);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#F6F4EE] hover:bg-[#E6EFEA] border border-[#E4E7E2] text-[11px] font-semibold text-[#153D35] text-right cursor-pointer"
                  >
                    {addr.region} — {addr.address}
                  </button>
                ))}
              </div>
            </div>
          )}
          <TextInput
            label="الاسم الكامل"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="مثال: خالد محمود"
          />
          <TextInput
            label="رقم الهاتف / الجوال"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="0599XXXXXX"
          />
          <SelectInput
            label="المنطقة"
            value={guestRegion}
            onChange={(e) => setGuestRegion(e.target.value as GazaRegion)}
          >
            {GAZA_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="العنوان التفصيلي"
            value={guestAddress}
            onChange={(e) => setGuestAddress(e.target.value)}
            placeholder="الحي، الشارع، أقرب معلم واضح"
          />
          <TextInput
            label="ملاحظات الطلب (اختياري)"
            value={guestNotes}
            onChange={(e) => setGuestNotes(e.target.value)}
            placeholder="مثال: التوصيل بعد الساعة 2 ظهراً"
          />
        </div>

        {/* Summary */}
        <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-bold text-[#153D35]">ملخص الطلب — {store?.name}</h2>
          <div className="space-y-2 text-xs">
            {items.map((i) => (
              <div key={i.productId} className="flex justify-between gap-2">
                <span className="text-[#252A28]">
                  {i.name} × {i.quantity}
                </span>
                <span className="font-bold tabular-nums shrink-0">{i.price * i.quantity} ₪</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-[#E4E7E2] space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#78827D]">رسوم التوصيل ({guestRegion})</span>
              <span className="tabular-nums">
                {totals.deliveryFee !== null ? `${totals.deliveryFee} ₪` : 'تُحدد بالتنسيق مع المتجر'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-[#153D35]">
              <span>الإجمالي التقديري</span>
              <span className="tabular-nums">{totals.total} ₪</span>
            </div>
          </div>
          <div className="bg-[#E6EFEA]/70 rounded-xl p-2.5 text-[11px] text-[#153D35]">
            الدفع يتم مباشرة بالتنسيق مع المتجر (نقداً عند الاستلام أو حسب الاتفاق) دون بوابة دفع إلكترونية.
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="primary" className="w-full" onClick={() => handleSubmitOrder('platform')}>
            إرسال الطلب داخل المنصة
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => handleSubmitOrder('whatsapp')}>
            <MessageCircle className="w-4 h-4" />
            إرسال الطلب عبر واتساب برسالة مجهزة
          </Button>
          <button
            type="button"
            onClick={() => setOrderFailedBanner(true)}
            className="w-full text-[11px] text-[#78827D] underline py-1 cursor-pointer"
          >
            معاينة حالة فشل إرسال الطلب
          </button>
        </div>
      </div>
    );
  };

  // SCREEN 8: ORDER SUCCESS & GUEST TRACKING
  const renderOrderTracking = () => {
    const order =
      orders.find(
        (o) =>
          o.id === activeOrderId ||
          (trackingLookup.trim() &&
            (o.orderNumber.toLowerCase().includes(trackingLookup.trim().toLowerCase()) ||
              o.customerPhone.includes(trackingLookup.trim())))
      ) || orders[0];

    const store = order ? storeMap.get(order.storeId) : undefined;
    const statusMeta = order ? ORDER_STATUS_META[order.status] : ORDER_STATUS_META.new;

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="bg-[#E6EFEA] border border-[#2F7D58]/20 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-[#2F7D58] shrink-0" />
          <div>
            <h1 className="text-sm font-extrabold text-[#153D35]">تم تسجيل ومتابعة الطلب</h1>
            <p className="text-xs text-[#252A28]">
              يمكنك متابعة حالة طلبك في أي وقت كضيف عبر رقم الطلب أو رقم الهاتف.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <SearchInputBar
            value={trackingLookup}
            onChange={setTrackingLookup}
            placeholder="أدخل رقم الطلب مثل #SG-1047 أو الهاتف..."
          />
        </div>

        {order && (
          <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E4E7E2]">
              <div>
                <div className="text-xs text-[#78827D]">رقم الطلب</div>
                <div className="text-base font-extrabold text-[#153D35] tabular-nums">
                  {order.orderNumber}
                </div>
              </div>
              <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#78827D]">المتجر</span>
                <button
                  type="button"
                  onClick={() => store && openStore(store.id)}
                  className="font-bold text-[#153D35] underline cursor-pointer"
                >
                  {order.storeName}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78827D]">المستلم</span>
                <span className="font-semibold">{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78827D]">العنوان</span>
                <span className="font-semibold">
                  {order.region} — {order.address}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78827D]">الإجمالي</span>
                <span className="font-extrabold text-[#153D35] tabular-nums">{order.total} ₪</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-2.5 pt-2 border-t border-[#E4E7E2]">
              <h2 className="text-xs font-bold text-[#252A28]">التسلسل الزمني لتحديثات الطلب</h2>
              <div className="space-y-3">
                {order.timeline.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#E6EFEA] text-[#153D35] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 tabular-nums">
                      {i + 1}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#252A28]">{step.label}</span>
                        <span className="text-[11px] text-[#78827D] tabular-nums">{step.timestamp}</span>
                      </div>
                      {step.note && <p className="text-[11px] text-[#78827D] mt-0.5">{step.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {store && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  openWhatsAppSheet(
                    store.name,
                    store.whatsapp,
                    `مرحباً ${store.name}، أستفسر عن حالة طلبي رقم ${order.orderNumber}.`
                  )
                }
              >
                <MessageCircle className="w-4 h-4" />
                التواصل مع المتجر بخصوص الطلب
              </Button>
            )}

            {order.status === 'new' && (
              <Button
                variant="danger"
                size="sm"
                className="w-full"
                onClick={() =>
                  updateOrderStatus(
                    order.id,
                    'cancelled',
                    'المشتري',
                    'تم إلغاء الطلب من المشتري قبل التجهيز'
                  )
                }
              >
                <XCircle className="w-4 h-4" />
                إلغاء الطلب قبل التجهيز
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  // SCREEN 9: OPTIONAL ACCOUNT
  const renderAccount = () => {
    const favoriteProducts = products.filter((p) => favorites.includes(p.id));

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E6EFEA] text-[#153D35] flex items-center justify-center font-bold text-lg">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-[#252A28]">
                  {buyerAccount.signedIn ? buyerAccount.name : 'تصفح وشراء كضيف'}
                </h1>
                <p className="text-[11px] text-[#78827D]">
                  {buyerAccount.signedIn
                    ? buyerAccount.phone
                    : 'التسجيل اختياري — يمكنك الطلب والمتابعة دون إنشاء حساب.'}
                </p>
              </div>
            </div>
            <Button
              variant={buyerAccount.signedIn ? 'outline' : 'primary'}
              size="sm"
              onClick={() => {
                toggleBuyerSignIn();
                showToast(
                  buyerAccount.signedIn ? 'تم تسجيل الخروج والعودة لوضع الضيف' : 'تم تسجيل الدخول بنجاح',
                  'info'
                );
              }}
            >
              {buyerAccount.signedIn ? 'تسجيل الخروج' : 'تسجيل الدخول'}
            </Button>
          </div>
        </div>

        {/* Account tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#E4E7E2]/60 text-[11px]">
          {[
            { id: 'orders', label: 'الطلبات' },
            { id: 'favorites', label: 'المفضلة' },
            { id: 'addresses', label: 'العناوين' },
            { id: 'notifications', label: 'الإشعارات' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAccountTab(t.id as typeof accountTab)}
              className={`py-2 rounded-lg font-bold cursor-pointer ${
                accountTab === t.id ? 'bg-white text-[#153D35]' : 'text-[#78827D]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {accountTab === 'orders' && (
          <div className="space-y-2.5">
            {orders.map((ord) => (
              <button
                key={ord.id}
                type="button"
                onClick={() => openOrderTracking(ord.id)}
                className="w-full text-right bg-white border border-[#E4E7E2] rounded-2xl p-3.5 space-y-2 cursor-pointer hover:border-[#153D35]/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#153D35] tabular-nums">
                    {ord.orderNumber}
                  </span>
                  <StatusBadge
                    tone={ORDER_STATUS_META[ord.status].tone}
                    label={ORDER_STATUS_META[ord.status].label}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[#78827D]">
                  <span>{ord.storeName}</span>
                  <span className="font-bold text-[#252A28] tabular-nums">{ord.total} ₪</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {accountTab === 'favorites' &&
          (favoriteProducts.length === 0 ? (
            <EmptyState
              title="قائمة المفضلة فارغة"
              description="اضغط على أيقونة القلب في أي منتج لحفظه هنا."
              actionLabel="استكشاف المنتجات"
              onAction={() => setBuyerScreen('home')}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {favoriteProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  store={storeMap.get(p.storeId)}
                  isFavorite={true}
                  onToggleFavorite={() => toggleFavorite(p.id)}
                  onOpenProduct={() => openProduct(p.id)}
                />
              ))}
            </div>
          ))}

        {accountTab === 'addresses' && (
          <div className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAddrText.trim()) return;
                addBuyerAddress(newAddrRegion, newAddrText);
                setNewAddrText('');
              }}
              className="bg-white border border-[#E4E7E2] rounded-2xl p-3.5 space-y-2.5"
            >
              <div className="text-xs font-bold text-[#153D35]">إضافة عنوان جديد</div>
              <SelectInput
                label="المنطقة"
                value={newAddrRegion}
                onChange={(e) => setNewAddrRegion(e.target.value as GazaRegion)}
              >
                {GAZA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                label="العنوان التفصيلي"
                value={newAddrText}
                onChange={(e) => setNewAddrText(e.target.value)}
                placeholder="مثال: الرمال — قرب مفترق السرايا"
                required
              />
              <Button type="submit" variant="primary" size="sm" className="w-full">
                <Plus className="w-4 h-4" />
                حفظ العنوان
              </Button>
            </form>

            {buyerAccount.addresses.length === 0 ? (
              <EmptyState
                title="لا توجد عناوين محفوظة"
                description="أضف عنوانك المعتاد لتسريع إتمام الطلب لاحقاً."
              />
            ) : (
              <div className="space-y-2">
                {buyerAccount.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="bg-white border border-[#E4E7E2] rounded-2xl p-3.5 flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-[#153D35]">{addr.region}</div>
                      <div className="text-xs text-[#252A28] break-words">{addr.address}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBuyerAddress(addr.id)}
                      className="w-8 h-8 rounded-xl border border-[#E4E7E2] text-[#B54747] flex items-center justify-center shrink-0 hover:bg-[#B54747]/10 cursor-pointer"
                      aria-label="حذف العنوان"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {accountTab === 'notifications' && (
          <div className="bg-white border border-[#E4E7E2] rounded-2xl divide-y divide-[#E4E7E2]">
            <div className="p-3.5 flex items-start gap-2.5 text-xs">
              <Bell className="w-4 h-4 text-[#153D35] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#252A28]">تحديث حالة الطلب #SG-1047</div>
                <p className="text-[#78827D] mt-0.5">تم تحويل طلبك إلى حالة قيد التجهيز.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderScreenBody = () => {
    switch (buyerScreen) {
      case 'home':
        return renderHome();
      case 'categories':
        return renderCategories();
      case 'search':
        return renderSearch();
      case 'product':
        return renderProductDetail();
      case 'store':
        return renderStorefront();
      case 'cart':
        return renderCart();
      case 'checkout':
        return renderCheckout();
      case 'order-tracking':
        return renderOrderTracking();
      case 'account':
        return renderAccount();
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between bg-[#F6F4EE] relative max-w-6xl mx-auto w-full">
      {isOffline && (
        <div className="p-3 pb-0">
          <OfflineBanner onReconnect={() => window.location.reload()} />
        </div>
      )}

      <div className="flex-1">
        <PageTransition screenKey={buyerScreen}>{renderScreenBody()}</PageTransition>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="تنقل المشتري السفلي"
        className="md:hidden sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E4E7E2] grid grid-cols-5 h-16 px-1"
      >
        {[
          { id: 'home', label: 'الرئيسية', icon: Home },
          { id: 'categories', label: 'التصنيفات', icon: LayoutGrid },
          { id: 'search', label: 'البحث', icon: Search },
          { id: 'cart', label: 'السلة', icon: ShoppingBag, badge: totalCartItems },
          { id: 'account', label: 'حسابي', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = buyerScreen === tab.id;
          const isCartTab = tab.id === 'cart';
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBuyerScreen(tab.id as typeof buyerScreen)}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] cursor-pointer transition-colors ${
                active ? 'text-[#153D35] font-extrabold' : 'text-[#78827D] font-medium'
              }`}
            >
              <motion.span
                key={isCartTab ? `nav-cart-${cartFeedbackCount}` : tab.id}
                initial={isCartTab && cartFeedbackCount > 0 ? { scale: 0.9 } : false}
                animate={
                  isCartTab && cartFeedbackCount > 0
                    ? { scale: [0.9, 1.24, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                className="relative"
              >
                <Icon className="w-5 h-5" />
                {tab.badge && tab.badge > 0 ? (
                  <motion.span
                    key={isCartTab ? `nav-badge-${tab.badge}-${cartFeedbackCount}` : undefined}
                    initial={isCartTab && cartFeedbackCount > 0 ? { scale: 0.5 } : false}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 460, damping: 18 }}
                    className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full bg-[#D5A64A] text-[#252A28] text-[9px] font-bold flex items-center justify-center tabular-nums"
                  >
                    {tab.badge}
                  </motion.span>
                ) : null}
              </motion.span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* WhatsApp Prefilled Message Modal */}
      <ModalDialog
        open={whatsappPreview.open}
        title={`رسالة واتساب مجهزة — ${whatsappPreview.storeName}`}
        onClose={() => setWhatsappPreview((p) => ({ ...p, open: false }))}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWhatsappPreview((p) => ({ ...p, open: false }))}
            >
              إغلاق
            </Button>
            <a
              href={`https://wa.me/${whatsappPreview.phone}?text=${encodeURIComponent(
                whatsappPreview.message
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F7D58] text-white text-xs font-bold"
            >
              <MessageCircle className="w-4 h-4" />
              فتح واتساب بالرسالة
            </a>
          </>
        }
      >
        <p className="text-xs text-[#78827D]">
          ستُفتح محادثة واتساب مع المتجر مع تعبئة الرسالة التالية تلقائياً:
        </p>
        <pre className="bg-[#F6F4EE] border border-[#E4E7E2] rounded-xl p-3 text-xs text-[#252A28] whitespace-pre-wrap font-sans leading-relaxed">
          {whatsappPreview.message}
        </pre>
      </ModalDialog>
    </div>
  );
}
