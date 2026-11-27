import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileText,
  Home,
  LayoutDashboard,
  Megaphone,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { GAZA_REGIONS } from '../../data/seedData';
import { uploadMediaImage } from '../../services/cloudflareMedia';
import { useMarketplace } from '../../store/MarketplaceContext';
import type { GazaRegion, OrderStatus, PlanTier, Product } from '../../types/marketplace';
import { buildStoreAnalyticsSeries } from '../../utils/analytics';
import {
  canAddProductForPlan,
  getNextOrderStatuses,
  getPlanRemainingProducts,
  ORDER_STATUS_META,
  PLAN_LIMITS,
  validateStoreUsername,
} from '../../utils/marketplace';
import {
  Button,
  EmptyState,
  ImageWithFallback,
  ModalDialog,
  OfflineBanner,
  SearchInputBar,
  SelectInput,
  StatCard,
  StatusBadge,
  TextInput,
  VerifiedBadge,
} from '../ui/DesignSystemKit';
import { HeroReveal, PageTransition, TextMaskReveal } from '../ui/MotionPrimitives';
import { MerchantAnalyticsCharts } from './MerchantAnalyticsCharts';
import { getSupabaseProfile, inviteTeamMember, signInSupabaseEmail } from '../../lib/supabaseClient';

export function MerchantApp() {
  const {
    merchantScreen,
    setMerchantScreen,
    isOffline,
    integrationsStatus,
    activeMerchantStoreId,
    setActiveMerchantStoreId,
    stores,
    categories,
    products,
    orders,
    applications,
    plans,
    staff,
    staffActivity,
    payments,
    submitStoreApplication,
    addProduct,
    updateProduct,
    duplicateProduct,
    deleteProduct,
    updateOrderStatus,
    updateOrderInternalNote,
    upgradeStorePlan,
    addStaffMember,
    toggleStaffActive,
    updateStoreSettings,
    toggleStoreFeatured,
    showToast,
    signOut,
    authProfile,
  } = useMarketplace();

  const currentStore =
    stores.find((s) => s.id === activeMerchantStoreId) || stores[0];
  const storeProducts = useMemo(
    () => products.filter((p) => p.storeId === currentStore?.id),
    [products, currentStore?.id]
  );
  const storeOrders = useMemo(
    () => orders.filter((o) => o.storeId === currentStore?.id),
    [orders, currentStore?.id]
  );

  // Auth / Onboarding states
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('register');
  const [loginEmail, setLoginEmail] = useState('sales@oliveharvest.ps');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Onboarding form
  const [appStoreName, setAppStoreName] = useState('');
  const [appOwnerName, setAppOwnerName] = useState('');
  const [appUsername, setAppUsername] = useState('');
  const [appEmail, setAppEmail] = useState('');
  const [appPhone, setAppPhone] = useState('');
  const [appRegion, setAppRegion] = useState<GazaRegion>('مدينة غزة');
  const [appDescription, setAppDescription] = useState('');
  const [appProofName, setAppProofName] = useState('project_proof_document.pdf');
  const [appLogoUploaded, setAppLogoUploaded] = useState(true);
  const [appCoverUploaded, setAppCoverUploaded] = useState(true);
  const [appLogoPreview, setAppLogoPreview] = useState<string>('');
  const [appCoverPreview, setAppCoverPreview] = useState<string>('');
  const [appError, setAppError] = useState<string | null>(null);
  const [latestSubmittedAppId, setLatestSubmittedAppId] = useState<string>('app-1');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageFileSelect = async (
    file: File | undefined,
    folder: 'products' | 'stores' | 'proofs',
    onLoaded: (url: string, fileName: string) => void
  ) => {
    if (!file) return;
    setUploadingImage(true);
    const result = await uploadMediaImage(file, folder);
    setUploadingImage(false);
    if (!result.ok || !result.url) {
      showToast(result.error || 'تعذر رفع الصورة.', 'danger');
      return;
    }
    onLoaded(result.url, file.name);
    showToast(
      result.source === 'cloudflare-r2'
        ? 'تم رفع الصورة إلى Cloudflare R2 بنجاح'
        : 'تم تجهيز الصورة للمعاينة (اربط Cloudflare R2 للنشر السحابي)',
      'success'
    );
  };

  // Product management states
  const [prodQuery, setProdQuery] = useState('');
  const [prodFilter, setProdFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    categoryId: categories[0]?.id || 'cat-food',
    price: '45',
    compareAtPrice: '',
    stock: '10',
    sizes: 'قياسي, كبير',
    colors: 'أخضر, عاجي',
    description: '',
    image: '',
  });
  const [confirmDeleteProd, setConfirmDeleteProd] = useState<Product | null>(null);

  // Orders management states
  const [orderTab, setOrderTab] = useState<'all' | OrderStatus>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(storeOrders[0]?.id || '');
  const [internalNoteDraft, setInternalNoteDraft] = useState('');

  // Analytics period compare
  const [comparePeriod, setComparePeriod] = useState<'week' | 'month'>('week');

  // Staff modal
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    role: 'منسق طلبات',
    manageProducts: false,
    manageOrders: true,
    viewAnalytics: true,
  });
  const [staffInviteLoading, setStaffInviteLoading] = useState(false);

  // Settings form
  const [settingsName, setSettingsName] = useState(currentStore?.name || '');
  const [settingsUsername, setSettingsUsername] = useState(currentStore?.username || '');
  const [settingsPhone, setSettingsPhone] = useState(currentStore?.phone || '');
  const [settingsHours, setSettingsHours] = useState(currentStore?.workingHours || '');
  const [settingsPolicies, setSettingsPolicies] = useState(currentStore?.policies || '');
  const [settingsDeliveryGaza, setSettingsDeliveryGaza] = useState(
    String(currentStore?.deliveryFees?.['مدينة غزة'] ?? 10)
  );
  const [settingsNotif, setSettingsNotif] = useState(currentStore?.orderNotificationsEnabled ?? true);

  const usernameValidation = useMemo(
    () => validateStoreUsername(appUsername, stores),
    [appUsername, stores]
  );

  // 1. AUTH & ONBOARDING
  const renderAuth = () => {
    const handleRegisterSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!appStoreName.trim() || !appOwnerName.trim() || !appEmail.trim() || !appPhone.trim()) {
        setAppError('يرجى تعبئة اسم المتجر واسم المالك والبريد ورقم التواصل.');
        return;
      }
      if (!usernameValidation.valid) {
        setAppError(usernameValidation.error || 'اسم المستخدم غير صالح.');
        return;
      }
      setAppError(null);
      const created = submitStoreApplication({
        storeName: appStoreName.trim(),
        username: usernameValidation.normalized,
        ownerName: appOwnerName.trim(),
        email: appEmail.trim(),
        phone: appPhone.trim(),
        whatsapp: appPhone.trim().startsWith('970') ? appPhone.trim() : `970${appPhone.trim().replace(/^0/, '')}`,
        region: appRegion,
        description: appDescription.trim() || 'متجر محلي مسجل عبر تطبيق التاجر.',
        proofDocumentName: appProofName,
        proofSummary: 'مستند إثبات النشاط التجاري المرفوع من التاجر.',
      });
      setLatestSubmittedAppId(created.id);
      setMerchantScreen('review-status');
    };

    return (
      <div className="p-4 space-y-4 pb-24">
        <HeroReveal className="bg-[#153D35] text-white rounded-2xl p-4 space-y-1">
          <h1 className="text-base font-extrabold">
            <TextMaskReveal trigger="mount" delay={0.08}>
              بوابة التاجر — سوقنا
            </TextMaskReveal>
          </h1>
          <p className="text-xs text-white/80">
            سجّل متجرك، ارفع إثبات النشاط، وأدر منتجاتك وطلباتك بسهولة من الهاتف.
          </p>
        </HeroReveal>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#E4E7E2]/60 text-xs">
          {[
            { id: 'register', label: 'تقديم متجر' },
            { id: 'login', label: 'دخول التاجر' },
            { id: 'forgot', label: 'استعادة' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAuthTab(t.id as typeof authTab)}
              className={`py-2 rounded-lg font-bold cursor-pointer ${
                authTab === t.id ? 'bg-white text-[#153D35]' : 'text-[#78827D]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {authTab === 'login' && (
          <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
            <TextInput
              label="البريد الإلكتروني"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
            <TextInput
              label="كلمة المرور"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <Button
              variant="primary"
              className="w-full"
              onClick={async () => {
                setLoginError(null);
                setLoginLoading(true);
                const result = await signInSupabaseEmail(loginEmail.trim(), loginPassword);
                const profile = result.user ? await getSupabaseProfile(result.user.id) : null;
                setLoginLoading(false);
                if (!result.user || !profile || profile.status !== 'active' || !['merchant', 'store_owner', 'store_manager', 'store_staff'].includes(profile.role)) {
                  setLoginError(result.error || 'هذا الحساب لا يملك صلاحية دخول بوابة التاجر.');
                  return;
                }
                showToast('تم تسجيل الدخول إلى لوحة التاجر', 'success');
                setMerchantScreen('dashboard');
              }}
            >
              {loginLoading ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
            </Button>
            {loginError && <div className="text-xs font-semibold text-[#B54747]">{loginError}</div>}
          </div>
        )}

        {authTab === 'forgot' && (
          <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
            <TextInput
              label="البريد الإلكتروني المسجل"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="merchant@example.com"
            />
            {forgotSent && (
              <div className="bg-[#E6EFEA] text-[#153D35] rounded-xl p-3 text-xs font-semibold">
                تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.
              </div>
            )}
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setForgotSent(true)}
            >
              إرسال رابط الاستعادة
            </Button>
          </div>
        )}

        {authTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-[#153D35]">بيانات المتجر والمالك</h2>
            {appError && (
              <div className="bg-[#B54747]/10 border border-[#B54747]/30 rounded-xl p-3 text-xs font-semibold text-[#B54747]">
                {appError}
              </div>
            )}
            <TextInput
              label="اسم المتجر"
              value={appStoreName}
              onChange={(e) => setAppStoreName(e.target.value)}
              placeholder="مثال: مخابز النخيل"
            />
            <TextInput
              label="اسم صاحب المتجر"
              value={appOwnerName}
              onChange={(e) => setAppOwnerName(e.target.value)}
              placeholder="الاسم الكامل"
            />
            <div className="space-y-1.5">
              <TextInput
                label="اسم المستخدم الفريد للمتجر (Username)"
                dir="ltr"
                value={appUsername}
                onChange={(e) => setAppUsername(e.target.value)}
                placeholder="gaza_crafts.01"
                error={appUsername ? (usernameValidation.valid ? undefined : usernameValidation.error) : undefined}
              />
              <div className="text-[11px] text-[#78827D] space-y-0.5 bg-[#F6F4EE] p-2.5 rounded-xl">
                <div>قواعد اسم المستخدم:</div>
                <div>· يبدأ بحرف إنجليزي، 3 أحرف على الأقل</div>
                <div>· يسمح بالإنجليزية والأرقام والنقطة (.) والشرطة السفلية (_)</div>
                <div>· لا يتكرر بين المتاجر (غير حساس لحالة الأحرف)</div>
                {appUsername && usernameValidation.valid && (
                  <div className="text-[#2F7D58] font-bold pt-1">
                    الاسم متاح وصالح: @{usernameValidation.normalized}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <TextInput
                label="البريد الإلكتروني"
                type="email"
                value={appEmail}
                onChange={(e) => setAppEmail(e.target.value)}
                placeholder="name@store.ps"
              />
              <TextInput
                label="هاتف / واتساب"
                value={appPhone}
                onChange={(e) => setAppPhone(e.target.value)}
                placeholder="0599XXXXXX"
              />
            </div>

            <SelectInput
              label="المنطقة"
              value={appRegion}
              onChange={(e) => setAppRegion(e.target.value as GazaRegion)}
            >
              {GAZA_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectInput>

            <TextInput
              label="وصف النشاط التجاري"
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder="نبذة مختصرة عن منتجات المتجر"
            />

            <div className="grid grid-cols-2 gap-2">
              <label
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer ${
                  appLogoUploaded ? 'bg-[#E6EFEA] border-[#2F7D58]/30 text-[#153D35]' : 'bg-[#F6F4EE] border-[#E4E7E2]'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    void handleImageFileSelect(e.target.files?.[0], 'stores', (dataUrl) => {
                      setAppLogoPreview(dataUrl);
                      setAppLogoUploaded(true);
                      showToast('تم تحميل شعار المتجر', 'success');
                    })
                  }
                />
                {appLogoPreview ? (
                  <img src={appLogoPreview} alt="معاينة الشعار" className="w-9 h-9 rounded-lg object-cover border border-[#E4E7E2]" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{appLogoPreview ? 'تغيير الشعار' : appLogoUploaded ? 'رفع شعار من الجهاز' : 'رفع الشعار'}</span>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer ${
                  appCoverUploaded ? 'bg-[#E6EFEA] border-[#2F7D58]/30 text-[#153D35]' : 'bg-[#F6F4EE] border-[#E4E7E2]'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    void handleImageFileSelect(e.target.files?.[0], 'stores', (dataUrl) => {
                      setAppCoverPreview(dataUrl);
                      setAppCoverUploaded(true);
                      showToast('تم تحميل صورة الغلاف', 'success');
                    })
                  }
                />
                {appCoverPreview ? (
                  <img src={appCoverPreview} alt="معاينة الغلاف" className="w-14 h-9 rounded-lg object-cover border border-[#E4E7E2]" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{appCoverPreview ? 'تغيير الغلاف' : appCoverUploaded ? 'رفع غلاف من الجهاز' : 'رفع الغلاف'}</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <TextInput
                label="إثبات وجود المشروع (اسم المستند المرفق)"
                value={appProofName}
                onChange={(e) => setAppProofName(e.target.value)}
                hint="مثال: صورة المتجر أو رخصة الحرفة أو صفحة النشاط"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F6F4EE] border border-[#E4E7E2] text-[11px] font-bold text-[#153D35] cursor-pointer hover:bg-[#E6EFEA]">
                <Upload className="w-3.5 h-3.5" />
                <span>إرفاق ملف إثبات من الجهاز (صورة أو PDF)</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAppProofName(file.name);
                      showToast(`تم إرفاق المستند: ${file.name}`, 'info');
                    }
                  }}
                />
              </label>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              إرسال الطلب للمراجعة الإدارية
            </Button>
          </form>
        )}
      </div>
    );
  };

  // 2. REVIEW STATUS
  const renderReviewStatus = () => {
    const selectedApp =
      applications.find((a) => a.id === latestSubmittedAppId) || applications[0];

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-extrabold text-[#252A28]">حالة مراجعة طلب المتجر</h1>
          <Button variant="outline" size="sm" onClick={() => setMerchantScreen('auth')}>
            تقديم طلب جديد
          </Button>
        </div>

        {/* Switch between existing application states */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {applications.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => setLatestSubmittedAppId(app.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                selectedApp?.id === app.id
                  ? 'bg-[#153D35] text-white border-[#153D35]'
                  : 'bg-white text-[#252A28] border-[#E4E7E2]'
              }`}
            >
              {app.storeName}
            </button>
          ))}
        </div>

        {selectedApp && (
          <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-[#252A28]">{selectedApp.storeName}</h2>
                <div className="text-xs text-[#78827D]" dir="ltr">
                  @{selectedApp.username}
                </div>
              </div>
              <StatusBadge
                tone={
                  selectedApp.status === 'approved'
                    ? 'success'
                    : selectedApp.status === 'rejected'
                    ? 'danger'
                    : selectedApp.status === 'needs_info'
                    ? 'warning'
                    : 'info'
                }
                label={
                  selectedApp.status === 'approved'
                    ? 'الطلب مقبول'
                    : selectedApp.status === 'rejected'
                    ? 'الطلب مرفوض'
                    : selectedApp.status === 'needs_info'
                    ? 'طلب استكمال البيانات'
                    : 'قيد المراجعة'
                }
              />
            </div>

            {selectedApp.status === 'pending' && (
              <div className="bg-[#153D35]/5 border border-[#153D35]/20 rounded-xl p-3.5 text-xs text-[#252A28] space-y-1">
                <div className="font-bold text-[#153D35]">طلبك قيد المراجعة من فريق إدارة سوقنا</div>
                <p className="text-[#78827D]">
                  سيتم التحقق من إثبات المشروع (@{selectedApp.username}) والرد خلال 24 ساعة.
                </p>
              </div>
            )}

            {selectedApp.status === 'approved' && (
              <div className="bg-[#E6EFEA] border border-[#2F7D58]/20 rounded-xl p-3.5 text-xs text-[#153D35] space-y-2">
                <div className="font-bold">تهانينا! تم اعتماد متجرك ويمكنك البدء بإضافة المنتجات.</div>
                <Button variant="primary" size="sm" onClick={() => setMerchantScreen('dashboard')}>
                  الدخول إلى لوحة التاجر
                </Button>
              </div>
            )}

            {selectedApp.status === 'rejected' && (
              <div className="bg-[#B54747]/10 border border-[#B54747]/30 rounded-xl p-3.5 text-xs space-y-2">
                <div className="font-bold text-[#B54747]">سبب الرفض:</div>
                <p className="text-[#252A28]">{selectedApp.rejectionReason}</p>
                <Button variant="outline" size="sm" onClick={() => setMerchantScreen('auth')}>
                  تعديل وإعادة التقديم
                </Button>
              </div>
            )}

            {selectedApp.status === 'needs_info' && (
              <div className="bg-[#D5A64A]/15 border border-[#D5A64A]/40 rounded-xl p-3.5 text-xs space-y-2">
                <div className="font-bold text-[#7a5812]">مطلوب استكمال البيانات التالية:</div>
                <p className="text-[#252A28]">{selectedApp.infoRequestNote}</p>
                <Button variant="primary" size="sm" onClick={() => setMerchantScreen('auth')}>
                  استكمال البيانات الآن
                </Button>
              </div>
            )}

            <div className="pt-2 border-t border-[#E4E7E2] text-xs space-y-1 text-[#78827D]">
              <div>المالك: {selectedApp.ownerName}</div>
              <div>المنطقة: {selectedApp.region}</div>
              <div>المستند المرفق: {selectedApp.proofDocumentName}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 3. MERCHANT DASHBOARD
  const renderDashboard = () => {
    const activeProducts = storeProducts.filter((p) => !p.archived && p.available);
    const totalSales = storeOrders
      .filter((o) => o.status !== 'rejected' && o.status !== 'cancelled')
      .reduce((s, o) => s + o.total, 0);
    const planMeta = PLAN_LIMITS[currentStore.plan];

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-[#78827D]">لوحة تحكم المتجر</div>
              <h1 className="text-base font-extrabold text-[#252A28] truncate">{currentStore.name}</h1>
              <div className="text-[11px] text-[#78827D]" dir="ltr">
                @{currentStore.username}
              </div>
            </div>
            <VerifiedBadge verified={currentStore.verified} />
          </div>

          <SelectInput
            label="تبديل المتجر للمعاينة"
            value={currentStore.id}
            onChange={(e) => setActiveMerchantStoreId(e.target.value)}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard title="المبيعات المسجلة" value={`${totalSales} ₪`} subtext={`${storeOrders.length} طلبات`} />
          <StatCard
            title="المنتجات النشطة"
            value={activeProducts.length}
            subtext={`من أصل ${storeProducts.length} منتجات`}
          />
          <StatCard title="زيارات المتجر" value={currentStore.views} subtext="آخر 30 يوماً" />
          <StatCard
            title="الطلبات الجديدة"
            value={storeOrders.filter((o) => o.status === 'new').length}
            subtext="تحتاج إجراء"
          />
        </div>

        {/* Plan usage & Quick Add */}
        <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#252A28]">حدود الخطة الحالية: {planMeta.label}</span>
            <span className="font-bold text-[#153D35] tabular-nums">
              {storeProducts.length} / {planMeta.maxProducts === 999 ? 'غير محدود' : planMeta.maxProducts}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#F6F4EE] overflow-hidden">
            <div
              className="h-full bg-[#153D35] rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  (storeProducts.length / (planMeta.maxProducts === 999 ? 100 : planMeta.maxProducts)) * 100
                )}%`,
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => {
                setEditingProductId(null);
                setProdForm({
                  name: '',
                  categoryId: categories[0]?.id || 'cat-food',
                  price: '50',
                  compareAtPrice: '',
                  stock: '12',
                  sizes: 'قياسي, كبير',
                  colors: 'أخضر, عاجي',
                  description: '',
                  image: '',
                });
                setProductModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              إضافة منتج
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMerchantScreen('subscriptions')}
            >
              ترقية الخطة
            </Button>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-[#E6EFEA] border border-[#2F7D58]/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-[#153D35]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">تنبيهات المتجر</div>
            <p className="text-[#252A28] mt-0.5">
              يوجد {storeOrders.filter((o) => o.status === 'new').length} طلب جديد بانتظار القبول أو التجهيز.
            </p>
          </div>
        </div>

        {/* Latest Orders */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#252A28]">آخر الطلبات</h2>
            <button
              type="button"
              onClick={() => setMerchantScreen('orders')}
              className="text-xs font-bold text-[#153D35] cursor-pointer"
            >
              إدارة الطلبات
            </button>
          </div>
          {storeOrders.slice(0, 3).map((ord) => (
            <button
              key={ord.id}
              type="button"
              onClick={() => {
                setSelectedOrderId(ord.id);
                setMerchantScreen('orders');
              }}
              className="w-full text-right bg-white border border-[#E4E7E2] rounded-2xl p-3.5 flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="text-xs font-extrabold text-[#153D35] tabular-nums">
                  {ord.orderNumber} — {ord.customerName}
                </div>
                <div className="text-[11px] text-[#78827D] mt-0.5">
                  {ord.region} · {ord.total} ₪
                </div>
              </div>
              <StatusBadge
                tone={ORDER_STATUS_META[ord.status].tone}
                label={ORDER_STATUS_META[ord.status].label}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  // 4. PRODUCTS MANAGEMENT
  const renderProducts = () => {
    const canAdd = canAddProductForPlan(currentStore.plan, storeProducts.length);
    const remaining = getPlanRemainingProducts(currentStore.plan, storeProducts.length);
    const filtered = storeProducts.filter((p) => {
      if (prodFilter === 'active' && p.archived) return false;
      if (prodFilter === 'archived' && !p.archived) return false;
      if (prodQuery.trim() && !p.name.toLowerCase().includes(prodQuery.trim().toLowerCase())) {
        return false;
      }
      return true;
    });

    const openEditModal = (p: Product) => {
      setEditingProductId(p.id);
      setProdForm({
        name: p.name,
        categoryId: p.categoryId,
        price: String(p.price),
        compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
        stock: String(p.stock),
        sizes: p.sizes.join(', '),
        colors: p.colors.join(', '),
        description: p.description,
        image: p.images[0] || '',
      });
      setProductModalOpen(true);
    };

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-extrabold text-[#252A28]">إدارة المنتجات</h1>
            <p className="text-[11px] text-[#78827D] tabular-nums">
              المستخدم: {storeProducts.length} · المتبقي:{' '}
              {currentStore.plan === 'business' ? 'غير محدود' : remaining}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={!canAdd}
            onClick={() => {
              setEditingProductId(null);
              setProductModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            منتج جديد
          </Button>
        </div>

        <SearchInputBar value={prodQuery} onChange={setProdQuery} placeholder="ابحث في منتجاتك..." />

        <div className="flex gap-1.5">
          {[
            { id: 'all', label: `الكل (${storeProducts.length})` },
            { id: 'active', label: 'النشطة' },
            { id: 'archived', label: 'المؤرشفة' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setProdFilter(f.id as typeof prodFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                prodFilter === f.id
                  ? 'bg-[#153D35] text-white border-[#153D35]'
                  : 'bg-white text-[#252A28] border-[#E4E7E2]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="لا توجد منتجات مطابقة"
            description="أضف منتجك الأول أو غيّر معايير التصفية."
            actionLabel="إضافة منتج"
            onAction={() => setProductModalOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-[#E4E7E2] rounded-2xl p-3.5 space-y-3"
              >
                <div className="flex gap-3">
                  <ImageWithFallback
                    src={p.images[0]}
                    alt={p.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#E4E7E2]"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-[#252A28] line-clamp-2">{p.name}</h3>
                      <StatusBadge
                        tone={p.archived ? 'neutral' : p.stock > 0 ? 'success' : 'danger'}
                        label={p.archived ? 'مؤرشف' : p.stock > 0 ? `مخزون ${p.stock}` : 'نفد'}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs tabular-nums">
                      <span className="font-extrabold text-[#153D35]">{p.price} ₪</span>
                      <span className="text-[#78827D]">· {p.views} مشاهدة</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#E4E7E2]">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(p)}>
                    تعديل
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => duplicateProduct(p.id)}>
                    <Copy className="w-3.5 h-3.5" />
                    نسخ
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateProduct(p.id, { archived: !p.archived })}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    {p.archived ? 'إظهار' : 'أرشفة'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#B54747]"
                    onClick={() => setConfirmDeleteProd(p)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ModalDialog
          open={Boolean(confirmDeleteProd)}
          title="تأكيد حذف المنتج"
          onClose={() => setConfirmDeleteProd(null)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteProd(null)}>
                تراجع
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirmDeleteProd) deleteProduct(confirmDeleteProd.id);
                  setConfirmDeleteProd(null);
                }}
              >
                حذف نهائي
              </Button>
            </>
          }
        >
          <p className="text-xs text-[#252A28]">
            هل أنت متأكد من حذف المنتج "{confirmDeleteProd?.name}"؟ يمكنك استخدام الأرشفة بدلاً من الحذف للحفاظ على سجل الطلبات.
          </p>
        </ModalDialog>
      </div>
    );
  };

  // 5. ORDERS MANAGEMENT
  const renderOrders = () => {
    const filtered = storeOrders.filter((o) => orderTab === 'all' || o.status === orderTab);
    const activeOrder = filtered.find((o) => o.id === selectedOrderId) || filtered[0];

    return (
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-base font-extrabold text-[#252A28]">إدارة الطلبات</h1>

        <div className="flex gap-1.5 overflow-x-auto pb-1 thin-scroll">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'new', label: 'الجديدة' },
            { id: 'accepted', label: 'المقبولة' },
            { id: 'preparing', label: 'قيد التجهيز' },
            { id: 'out_for_delivery', label: 'خرجت للتوصيل' },
            { id: 'completed', label: 'المكتملة' },
            { id: 'rejected', label: 'مرفوضة/ملغاة' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOrderTab(t.id as typeof orderTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                orderTab === t.id
                  ? 'bg-[#153D35] text-white border-[#153D35]'
                  : 'bg-white text-[#252A28] border-[#E4E7E2]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات في هذه الحالة"
            description="ستظهر الطلبات هنا فور وصولها من المشترين."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((ord) => {
              const isSelected = activeOrder?.id === ord.id;
              const nextActions = getNextOrderStatuses(ord.status);
              return (
                <div
                  key={ord.id}
                  className={`bg-white border rounded-2xl p-4 space-y-3 ${
                    isSelected ? 'border-[#153D35]' : 'border-[#E4E7E2]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(ord.id);
                      setInternalNoteDraft(ord.internalNote || '');
                    }}
                    className="w-full text-right flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-extrabold text-[#153D35] tabular-nums">
                        {ord.orderNumber} · {ord.customerName}
                      </div>
                      <div className="text-[11px] text-[#78827D]">
                        {ord.customerPhone} · {ord.region}
                      </div>
                    </div>
                    <StatusBadge
                      tone={ORDER_STATUS_META[ord.status].tone}
                      label={ORDER_STATUS_META[ord.status].label}
                    />
                  </button>

                  {isSelected && (
                    <div className="pt-3 border-t border-[#E4E7E2] space-y-3 text-xs">
                      <div className="bg-[#F6F4EE] rounded-xl p-3 space-y-1">
                        <div>العنوان: {ord.address}</div>
                        {ord.notes && <div>ملاحظة المشتري: {ord.notes}</div>}
                        <div className="font-bold text-[#153D35] tabular-nums pt-1">
                          الإجمالي: {ord.total} ₪ ({ord.channel === 'whatsapp' ? 'واتساب' : 'المنصة'})
                        </div>
                      </div>

                      {nextActions.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="font-bold text-[#252A28]">تحديث حالة الطلب:</div>
                          <div className="flex flex-wrap gap-2">
                            {nextActions.map((ns) => (
                              <Button
                                key={ns}
                                size="sm"
                                variant={ns === 'rejected' || ns === 'cancelled' ? 'danger' : 'primary'}
                                onClick={() => updateOrderStatus(ord.id, ns, 'التاجر')}
                              >
                                تحويل إلى: {ORDER_STATUS_META[ns].label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <TextInput
                          label="ملاحظة داخلية للتاجر"
                          value={internalNoteDraft}
                          onChange={(e) => setInternalNoteDraft(e.target.value)}
                          placeholder="ملاحظة خاصة بفريق التجهيز..."
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateOrderInternalNote(ord.id, internalNoteDraft)}
                        >
                          حفظ الملاحظة الداخلية
                        </Button>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#E4E7E2]">
                        <div className="font-bold text-[#252A28]">سجل تغييرات الحالة:</div>
                        {ord.timeline.map((t, i) => (
                          <div key={i} className="flex justify-between text-[11px] text-[#78827D]">
                            <span>
                              {t.label} ({t.actor})
                            </span>
                            <span className="tabular-nums">{t.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 6. ANALYTICS (Recharts Interactive Weekly & Monthly Charts)
  const renderAnalytics = () => {
    const totalProdViews = storeProducts.reduce((s, p) => s + p.views, 0);
    const analyticsData = buildStoreAnalyticsSeries({
      store: currentStore,
      orders: storeOrders,
      products: storeProducts,
      period: comparePeriod,
    });

    const handleDownloadCsv = () => {
      const rows = [
        ['المنتج', 'السعر', 'المشاهدات', 'المخزون'],
        ...storeProducts.map((p) => [p.name, String(p.price), String(p.views), String(p.stock)]),
      ];
      const csv = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `souqna-${currentStore.username}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('تم تنزيل تقرير الإحصائيات (CSV)', 'success');
    };

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-extrabold text-[#252A28]">الإحصائيات والتقارير التفاعلية</h1>
          <Button variant="secondary" size="sm" onClick={handleDownloadCsv}>
            <Download className="w-3.5 h-3.5" />
            تنزيل التقرير
          </Button>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-[#E4E7E2]/60 text-xs max-w-md">
          <button
            type="button"
            onClick={() => setComparePeriod('week')}
            className={`flex-1 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
              comparePeriod === 'week' ? 'bg-white text-[#153D35] shadow-2xs' : 'text-[#78827D]'
            }`}
          >
            المبيعات والزيارات الأسبوعية
          </button>
          <button
            type="button"
            onClick={() => setComparePeriod('month')}
            className={`flex-1 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
              comparePeriod === 'month' ? 'bg-white text-[#153D35] shadow-2xs' : 'text-[#78827D]'
            }`}
          >
            المبيعات والزيارات الشهرية
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="إجمالي الزيارات"
            value={analyticsData.totalVisits}
            subtext={comparePeriod === 'week' ? 'خلال آخر 7 أيام' : 'خلال آخر 6 أشهر'}
          />
          <StatCard
            title="مشاهدات المنتجات"
            value={totalProdViews}
            subtext={`${storeProducts.length} منتجاً نشطاً`}
          />
          <StatCard
            title="الطلبات المسجلة"
            value={storeOrders.length}
            subtext={`معدل التحويل ${analyticsData.conversionRate}%`}
          />
          <StatCard
            title="المبيعات المسجلة"
            value={`${analyticsData.totalSales} ₪`}
            subtext="إجمالي الطلبات"
          />
        </div>

        <MerchantAnalyticsCharts
          period={comparePeriod}
          series={analyticsData.series}
          productBreakdown={analyticsData.productBreakdown}
        />
      </div>
    );
  };

  // 7. SUBSCRIPTIONS & PROMOTIONS
  const renderSubscriptions = () => {
    const storePayments = payments.filter((p) => p.storeId === currentStore.id);

    return (
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-base font-extrabold text-[#252A28]">الاشتراكات والترويج</h1>

        <div className="bg-[#153D35] text-white rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/80">الباقة الحالية</span>
            <span className="text-xs font-bold bg-[#D5A64A] text-[#252A28] px-2.5 py-0.5 rounded-lg">
              {PLAN_LIMITS[currentStore.plan].label}
            </span>
          </div>
          <div className="text-xs text-white/90 tabular-nums">
            من {currentStore.planStartDate} إلى {currentStore.planEndDate}
          </div>
          <div className="text-xs text-white/80 tabular-nums">
            الحد المسموح: {PLAN_LIMITS[currentStore.plan].maxProducts === 999 ? 'غير محدود' : `${PLAN_LIMITS[currentStore.plan].maxProducts} منتجاً`}
          </div>
        </div>

        {/* Plans List */}
        <div className="space-y-3">
          {plans.map((pl) => {
            const isCurrent = currentStore.plan === pl.id;
            return (
              <div
                key={pl.id}
                className={`bg-white border rounded-2xl p-4 space-y-2.5 ${
                  isCurrent ? 'border-[#153D35]' : 'border-[#E4E7E2]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#252A28]">{pl.name}</h2>
                    <p className="text-[11px] text-[#78827D]">{pl.subtitle}</p>
                  </div>
                  <div className="text-base font-extrabold text-[#153D35] tabular-nums">
                    {pl.monthlyPrice === 0 ? 'مجاناً' : `${pl.monthlyPrice} ₪/شهر`}
                  </div>
                </div>
                <ul className="space-y-1 text-xs text-[#252A28]">
                  {pl.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2F7D58] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => upgradeStorePlan(currentStore.id, pl.id as PlanTier)}
                  >
                    الترقية إلى {pl.name}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Featured Storefront Toggle */}
        <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#252A28]">إبراز المتجر في الصفحة الرئيسية</h2>
              <StatusBadge
                tone={currentStore.featured ? 'success' : 'neutral'}
                label={currentStore.featured ? 'متجر مميز' : 'عادي'}
              />
            </div>
            <p className="text-[11px] text-[#78827D]">
              يظهر المتجر ضمن قسم "متاجر مميزة" في شاشة المشتري الرئيسية لزيادة الزيارات.
            </p>
          </div>
          <Button
            size="sm"
            variant={currentStore.featured ? 'outline' : 'gold'}
            onClick={() => toggleStoreFeatured(currentStore.id)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {currentStore.featured ? 'إلغاء الإبراز' : 'تفعيل الإبراز'}
          </Button>
        </div>

        {/* Payments History */}
        <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-2.5">
          <h2 className="text-xs font-bold text-[#252A28]">سجل المدفوعات</h2>
          {storePayments.length === 0 ? (
            <p className="text-xs text-[#78827D]">لا توجد مدفوعات مسجلة بعد.</p>
          ) : (
            <div className="divide-y divide-[#E4E7E2]">
              {storePayments.map((pay) => (
                <div key={pay.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-[#252A28]">{pay.description}</div>
                    <div className="text-[11px] text-[#78827D] tabular-nums">{pay.date}</div>
                  </div>
                  <span className="font-extrabold text-[#153D35] tabular-nums">{pay.amount} ₪</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 8. STAFF MANAGEMENT (BUSINESS PLAN)
  const renderStaff = () => {
    const allowsStaff = PLAN_LIMITS[currentStore.plan].allowsStaff;
    const storeStaff = staff.filter((s) => s.storeId === currentStore.id);

    if (!allowsStaff) {
      return (
        <div className="p-4 space-y-4 pb-24">
          <h1 className="text-base font-extrabold text-[#252A28]">إدارة الموظفين والصلاحيات</h1>
          <EmptyState
            title="ميزة متاحة في خطة الأعمال (Business)"
            description="قم بالترقية إلى خطة Business لإضافة موظفين وتحديد صلاحيات المنتجات والطلبات ومتابعة سجل النشاط."
            actionLabel="الترقية الآن لخطة Business"
            onAction={() => upgradeStorePlan(currentStore.id, 'business')}
          />
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-extrabold text-[#252A28]">فريق العمل والصلاحيات</h1>
          <Button variant="primary" size="sm" onClick={() => setStaffModalOpen(true)}>
            <Plus className="w-4 h-4" />
            إضافة موظف
          </Button>
        </div>

        <div className="space-y-2.5">
          {storeStaff.map((m) => (
            <div key={m.id} className="bg-white border border-[#E4E7E2] rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#252A28]">{m.name}</div>
                  <div className="text-[11px] text-[#78827D]">
                    {m.role} · {m.email}
                  </div>
                </div>
                <StatusBadge
                  tone={m.active ? 'success' : 'danger'}
                  label={m.active ? 'مفعل' : 'معطل'}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#78827D] pt-2 border-t border-[#E4E7E2]">
                <span>
                  الصلاحيات:{' '}
                  {[
                    m.permissions.manageProducts && 'المنتجات',
                    m.permissions.manageOrders && 'الطلبات',
                    m.permissions.viewAnalytics && 'الإحصائيات',
                  ]
                    .filter(Boolean)
                    .join('، ')}
                </span>
                <button
                  type="button"
                  onClick={() => toggleStaffActive(m.id)}
                  className="font-bold text-[#153D35] underline cursor-pointer"
                >
                  {m.active ? 'تعطيل الوصول' : 'إعادة التفعيل'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-2">
          <h2 className="text-xs font-bold text-[#252A28]">سجل نشاط الموظفين</h2>
          <div className="space-y-2 text-xs">
            {staffActivity.map((act) => (
              <div key={act.id} className="flex justify-between gap-2 text-[#78827D]">
                <span>
                  <strong className="text-[#252A28]">{act.staffName}:</strong> {act.action}
                </span>
                <span className="tabular-nums shrink-0">{act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

        <ModalDialog
          open={staffModalOpen}
          title="إضافة موظف جديد"
          onClose={() => setStaffModalOpen(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!staffForm.name.trim() || !staffForm.email.trim()) return;
              setStaffInviteLoading(true);
              const invitation = await inviteTeamMember({
                action: 'store_staff',
                fullName: staffForm.name.trim(),
                email: staffForm.email.trim(),
                storeId: currentStore.id,
              });
              setStaffInviteLoading(false);
              if (!invitation.ok) {
                showToast(invitation.error || 'تعذر إرسال دعوة الموظف.', 'danger');
                return;
              }
              addStaffMember({
                storeId: currentStore.id,
                name: staffForm.name.trim(),
                email: staffForm.email.trim(),
                role: staffForm.role,
                permissions: {
                  manageProducts: staffForm.manageProducts,
                  manageOrders: staffForm.manageOrders,
                  viewAnalytics: staffForm.viewAnalytics,
                },
                active: true,
              });
              setStaffModalOpen(false);
            }}
            className="space-y-3"
          >
            <TextInput
              label="اسم الموظف"
              value={staffForm.name}
              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
              required
            />
            <TextInput
              label="البريد الإلكتروني"
              type="email"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              required
            />
            <TextInput
              label="المسمى الوظيفي"
              value={staffForm.role}
              onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
            />
            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-[#252A28]">الصلاحيات:</div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={staffForm.manageProducts}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, manageProducts: e.target.checked })
                  }
                />
                إدارة المنتجات
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={staffForm.manageOrders}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, manageOrders: e.target.checked })
                  }
                />
                إدارة الطلبات
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={staffForm.viewAnalytics}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, viewAnalytics: e.target.checked })
                  }
                />
                عرض الإحصائيات
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setStaffModalOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" disabled={staffInviteLoading}>
                {staffInviteLoading ? 'جارٍ إرسال الدعوة...' : 'إرسال دعوة الموظف'}
              </Button>
            </div>
          </form>
        </ModalDialog>
      </div>
    );
  };

  // 9. STORE SETTINGS
  const renderSettings = () => {
    const checkUsername = validateStoreUsername(settingsUsername, stores, currentStore.id);

    return (
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-base font-extrabold text-[#252A28]">إعدادات المتجر</h1>
        <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
          <TextInput
            label="اسم المتجر"
            value={settingsName}
            onChange={(e) => setSettingsName(e.target.value)}
          />
          <TextInput
            label="اسم المستخدم (Username)"
            dir="ltr"
            value={settingsUsername}
            onChange={(e) => setSettingsUsername(e.target.value)}
            error={checkUsername.valid ? undefined : checkUsername.error}
          />
          <TextInput
            label="رقم التواصل وواتساب"
            value={settingsPhone}
            onChange={(e) => setSettingsPhone(e.target.value)}
          />
          <TextInput
            label="ساعات العمل"
            value={settingsHours}
            onChange={(e) => setSettingsHours(e.target.value)}
          />
          <TextInput
            label="رسوم التوصيل لمدينة غزة (₪)"
            type="number"
            value={settingsDeliveryGaza}
            onChange={(e) => setSettingsDeliveryGaza(e.target.value)}
          />
          <TextInput
            label="سياسات المتجر والاستبدال"
            value={settingsPolicies}
            onChange={(e) => setSettingsPolicies(e.target.value)}
          />
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#F6F4EE] text-xs font-semibold cursor-pointer">
            <span>تفعيل إشعارات الطلبات الفورية</span>
            <input
              type="checkbox"
              checked={settingsNotif}
              onChange={(e) => setSettingsNotif(e.target.checked)}
            />
          </label>
          <Button
            variant="primary"
            className="w-full"
            disabled={!checkUsername.valid}
            onClick={() =>
              updateStoreSettings(currentStore.id, {
                name: settingsName,
                username: checkUsername.normalized,
                phone: settingsPhone,
                workingHours: settingsHours,
                policies: settingsPolicies,
                orderNotificationsEnabled: settingsNotif,
                deliveryFees: {
                  ...currentStore.deliveryFees,
                  'مدينة غزة': Number(settingsDeliveryGaza) || 0,
                },
              })
            }
          >
            حفظ الإعدادات
          </Button>
          <Button
            variant="outline"
            className="w-full text-[#B54747]"
            onClick={() => void signOut()}
          >
            تسجيل الخروج
          </Button>
        </div>
      </div>
    );
  };

  const merchantAuthorized = Boolean(
    authProfile &&
      authProfile.status === 'active' &&
      ['merchant', 'store_owner', 'store_manager', 'store_staff'].includes(authProfile.role)
  );

  const renderScreen = () => {
    if (!merchantAuthorized && merchantScreen !== 'auth') return renderAuth();
    switch (merchantScreen) {
      case 'auth':
        return renderAuth();
      case 'review-status':
        return renderReviewStatus();
      case 'dashboard':
        return renderDashboard();
      case 'products':
        return renderProducts();
      case 'orders':
        return renderOrders();
      case 'analytics':
        return renderAnalytics();
      case 'subscriptions':
        return renderSubscriptions();
      case 'staff':
        return renderStaff();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between bg-[#F6F4EE] max-w-5xl mx-auto w-full">
      {isOffline && (
        <div className="p-3 pb-0">
          <OfflineBanner onReconnect={() => window.location.reload()} />
        </div>
      )}

      {/* Desktop Merchant Navigation Strip */}
      <div className="hidden md:flex items-center gap-1.5 px-4 pt-4 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'لوحة التاجر' },
          { id: 'products', label: 'المنتجات' },
          { id: 'orders', label: 'الطلبات' },
          { id: 'analytics', label: 'الإحصائيات والرسوم البيانية' },
          { id: 'subscriptions', label: 'الباقات والاشتراك' },
          { id: 'staff', label: 'فريق العمل' },
          { id: 'settings', label: 'إعدادات المتجر' },
          { id: 'auth', label: 'تسجيل متجر جديد' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMerchantScreen(tab.id as typeof merchantScreen)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              merchantScreen === tab.id
                ? 'bg-[#153D35] text-white'
                : 'bg-white border border-[#E4E7E2] text-[#252A28] hover:bg-[#E6EFEA]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        <PageTransition screenKey={merchantScreen}>{renderScreen()}</PageTransition>
      </div>

      {/* Add/Edit Product Modal (available directly from Dashboard & Products without page transition) */}
      <ModalDialog
        open={productModalOpen}
        title={editingProductId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        onClose={() => setProductModalOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!prodForm.name.trim() || !prodForm.price) return;
            const payload = {
              storeId: currentStore.id,
              categoryId: prodForm.categoryId,
              name: prodForm.name.trim(),
              description: prodForm.description.trim() || 'منتج محلي بجودة مضمونة.',
              price: Number(prodForm.price) || 0,
              compareAtPrice: prodForm.compareAtPrice
                ? Number(prodForm.compareAtPrice)
                : undefined,
              images: prodForm.image.trim() ? [prodForm.image.trim()] : [],
              sizes: prodForm.sizes
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              colors: prodForm.colors
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              stock: Number(prodForm.stock) || 0,
              available: (Number(prodForm.stock) || 0) > 0,
              archived: false,
            };
            if (editingProductId) {
              updateProduct(editingProductId, payload);
            } else {
              addProduct(payload);
            }
            setProductModalOpen(false);
          }}
          className="space-y-3"
        >
          <TextInput
            label="اسم المنتج"
            value={prodForm.name}
            onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
            placeholder="مثال: زيتون أخضر مكبوس"
            required
          />
          <SelectInput
            label="التصنيف"
            value={prodForm.categoryId}
            onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectInput>
          <div className="grid grid-cols-3 gap-2">
            <TextInput
              label="السعر (₪)"
              type="number"
              value={prodForm.price}
              onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
              required
            />
            <TextInput
              label="قبل الخصم"
              type="number"
              value={prodForm.compareAtPrice}
              onChange={(e) => setProdForm({ ...prodForm, compareAtPrice: e.target.value })}
            />
            <TextInput
              label="المخزون"
              type="number"
              value={prodForm.stock}
              onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
            />
          </div>
          <TextInput
            label="الأحجام (مفصولة بفاصلة)"
            value={prodForm.sizes}
            onChange={(e) => setProdForm({ ...prodForm, sizes: e.target.value })}
          />
          <TextInput
            label="الألوان (مفصولة بفاصلة)"
            value={prodForm.colors}
            onChange={(e) => setProdForm({ ...prodForm, colors: e.target.value })}
          />
          <div className="space-y-2">
            <TextInput
              label="رابط صورة المنتج (Cloudflare R2 CDN)"
              dir="ltr"
              value={prodForm.image}
              onChange={(e) => setProdForm({ ...prodForm, image: e.target.value })}
              placeholder="https://cdn.souqna.ps/products/..."
              hint={
                integrationsStatus.cloudflareR2Configured
                  ? 'متصل بـ Cloudflare R2 — الرفع السحابي مفعل'
                  : 'أدخل رابط Cloudflare CDN أو ارفع صورة مباشرة من الجهاز'
              }
            />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#E4E7E2] shrink-0">
                <ImageWithFallback
                  src={prodForm.image}
                  alt="معاينة صورة المنتج"
                  className="w-full h-full object-cover"
                  fallbackTitle="صورة"
                />
              </div>
              <label className="flex-1 px-3 py-2 rounded-xl bg-[#F6F4EE] border border-[#E4E7E2] text-xs font-bold text-[#153D35] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#E6EFEA]">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingImage ? 'جاري الرفع...' : 'رفع صورة إلى Cloudflare R2'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={uploadingImage}
                  className="hidden"
                  onChange={(e) =>
                    void handleImageFileSelect(e.target.files?.[0], 'products', (url) => {
                      setProdForm((prev) => ({ ...prev, image: url }));
                    })
                  }
                />
              </label>
            </div>
          </div>
          <TextInput
            label="وصف المنتج"
            value={prodForm.description}
            onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setProductModalOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit">
              حفظ المنتج
            </Button>
          </div>
        </form>
      </ModalDialog>

      <nav
        aria-label="تنقل التاجر السفلي"
        className="md:hidden sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E4E7E2] grid grid-cols-5 h-16 px-1"
      >
        {[
          { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
          { id: 'products', label: 'المنتجات', icon: Package },
          { id: 'orders', label: 'الطلبات', icon: ClipboardList },
          { id: 'analytics', label: 'الإحصائيات', icon: BarChart3 },
          { id: 'settings', label: 'الإعدادات', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = merchantScreen === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMerchantScreen(tab.id as typeof merchantScreen)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] cursor-pointer ${
                active ? 'text-[#153D35] font-extrabold' : 'text-[#78827D] font-medium'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
