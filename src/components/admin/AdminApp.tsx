import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  BadgeCheck,
  Ban,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  CreditCard,
  Database,
  FileCheck2,
  FileText,
  FolderTree,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageSquareWarning,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store as StoreIcon,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { useMarketplace } from '../../store/MarketplaceContext';
import type { AdminScreenId, PlanTier, Store, StoreStatus } from '../../types/marketplace';
import { ORDER_STATUS_META, PLAN_LIMITS } from '../../utils/marketplace';
import {
  BrandLogo,
  Button,
  EmptyState,
  ImageWithFallback,
  ModalDialog,
  OfflineBanner,
  Pagination,
  SearchInputBar,
  SelectInput,
  StatCard,
  StatusBadge,
  TextInput,
  VerifiedBadge,
} from '../ui/DesignSystemKit';
import { PageTransition, SmoothMenuOverlay } from '../ui/MotionPrimitives';
import { getSupabaseProfile, inviteTeamMember, signInSupabaseEmail } from '../../lib/supabaseClient';

const ADMIN_NAV_ITEMS: { id: AdminScreenId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'لوحة المؤشرات', icon: LayoutDashboard },
  { id: 'store-applications', label: 'طلبات المتاجر', icon: ClipboardCheck },
  { id: 'application-details', label: 'تفاصيل الطلب والمستندات', icon: FileCheck2 },
  { id: 'stores', label: 'المتاجر المعتمدة والموقوفة', icon: StoreIcon },
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'products', label: 'المنتجات', icon: Package },
  { id: 'reports', label: 'مراجعة البلاغات', icon: AlertTriangle },
  { id: 'orders-complaints', label: 'الطلبات والشكاوى', icon: MessageSquareWarning },
  { id: 'categories', label: 'التصنيفات', icon: FolderTree },
  { id: 'plans', label: 'الباقات والاشتراكات', icon: BarChart3 },
  { id: 'payments-coupons', label: 'المدفوعات والكوبونات', icon: Ticket },
  { id: 'settings', label: 'إعدادات المنصة والتكامل', icon: Settings },
  { id: 'audit-log', label: 'سجل العمليات Audit Log', icon: Activity },
  { id: 'login', label: 'شاشة دخول الإدارة', icon: Lock },
];

export function AdminApp() {
  const {
    adminScreen,
    setAdminScreen,
    adminAuthenticated,
    setAdminAuthenticated,
    isOffline,
    integrationsStatus,
    stores,
    products,
    orders,
    applications,
    selectedApplicationId,
    setSelectedApplicationId,
    categories,
    plans,
    payments,
    coupons,
    users,
    reports,
    complaints,
    auditLogs,
    platformSettings,
    reviewStoreApplication,
    updateStoreStatus,
    toggleStoreVerification,
    updateProduct,
    addCategory,
    renameCategory,
    toggleCategoryActive,
    updatePlan,
    toggleCouponActive,
    addCoupon,
    resolveReport,
    updateComplaintStatus,
    toggleUserStatus,
    updatePlatformSettings,
    resetDemoData,
    signOut,
    authProfile,
    showToast,
  } = useMarketplace();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Login screen form
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerInviteLoading, setManagerInviteLoading] = useState(false);

  // Application decision modal
  const [decisionNote, setDecisionNote] = useState('');
  const [verifyOnApprove, setVerifyOnApprove] = useState(true);

  // Explicit confirmation modal before suspend / archive
  const [storeActionModal, setStoreActionModal] = useState<{
    store: Store;
    nextStatus: StoreStatus;
  } | null>(null);
  const [storeActionReason, setStoreActionReason] = useState('');

  // Filters & Pagination
  const [storeSearch, setStoreSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<'all' | 'verified' | 'unverified' | 'suspended'>('all');
  const [storePage, setStorePage] = useState(1);

  // Categories & Coupons forms
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPercent, setNewCouponPercent] = useState('15');
  const [newCouponScope, setNewCouponScope] = useState('ترقية الباقات');

  // Plan editor modal
  const [editingPlan, setEditingPlan] = useState<{
    id: PlanTier;
    name: string;
    monthlyPrice: string;
    maxProducts: string;
    subtitle: string;
  } | null>(null);

  // Platform settings draft & reset confirm
  const [settingsDraft, setSettingsDraft] = useState(platformSettings);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    setSettingsDraft(platformSettings);
  }, [platformSettings]);

  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  // 1. ADMIN LOGIN
  if (adminScreen === 'login' || !adminAuthenticated) {
    return (
      <div className="min-h-[680px] flex items-center justify-center p-6 bg-[#F6F4EE]">
        <div className="w-full max-w-md bg-white border border-[#E4E7E2] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <BrandLogo />
            <StatusBadge tone="info" label="بوابة الإدارة" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[#252A28]">تسجيل دخول إدارة سوقنا</h1>
            <p className="text-xs text-[#78827D] mt-1">
              لإدارة طلبات المتاجر، التوثيق، البلاغات، الاشتراكات وسجل التدقيق.
            </p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginError(null);
              setLoginLoading(true);
              const result = await signInSupabaseEmail(adminEmail.trim(), adminPass);
              const profile = result.user ? await getSupabaseProfile(result.user.id) : null;
              setLoginLoading(false);
              if (!result.user || !profile || profile.status !== 'active' || !['platform_owner', 'platform_admin', 'admin'].includes(profile.role)) {
                setLoginError(result.error || 'هذا الحساب لا يملك صلاحية دخول لوحة الإدارة.');
                return;
              }
              setAdminAuthenticated(true);
              setAdminScreen('dashboard');
            }}
            className="space-y-3"
          >
            <TextInput
              label="البريد الإداري"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
            <TextInput
              label="كلمة المرور"
              type="password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
            />
            {loginError && <div className="text-xs font-semibold text-[#B54747]">{loginError}</div>}
            <Button type="submit" variant="primary" className="w-full">
              {loginLoading ? 'جارٍ التحقق...' : 'دخول لوحة الإدارة'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const renderMainScreen = () => {
    switch (adminScreen) {
      // 2. DASHBOARD
      case 'dashboard': {
        const pendingApps = applications.filter((a) => a.status === 'pending').length;
        const verifiedCount = stores.filter((s) => s.verified && s.status === 'approved').length;
        const revenue = payments
          .filter((p) => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-extrabold text-[#252A28]">لوحة المؤشرات وإحصائيات المنصة</h1>
                <p className="text-xs text-[#78827D]">نظرة فورية على المتاجر والطلبات والبلاغات والاشتراكات</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAdminScreen('store-applications')}>
                  مراجعة الطلبات ({pendingApps})
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAdminScreen('audit-log')}>
                  سجل العمليات
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="إجمالي المتاجر"
                value={stores.length}
                subtext={`${verifiedCount} موثق · ${stores.filter((s) => s.status === 'suspended').length} موقوف`}
                icon={<StoreIcon className="w-4 h-4" />}
              />
              <StatCard
                title="طلبات إنشاء متجر"
                value={pendingApps}
                subtext="بانتظار المراجعة والاعتماد"
                icon={<ClipboardCheck className="w-4 h-4" />}
              />
              <StatCard
                title="الطلبات المسجلة"
                value={orders.length}
                subtext={`${products.length} منتجاً نشطاً ومؤرشفاً`}
                icon={<ShoppingBag className="w-4 h-4" />}
              />
              <StatCard
                title="إيرادات الاشتراكات والترويج"
                value={`${revenue} ₪`}
                subtext="المدفوعات المؤكدة"
                icon={<CreditCard className="w-4 h-4" />}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Pending Applications Summary */}
              <div className="bg-white border border-[#E4E7E2] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#252A28]">أحدث طلبات المتاجر</h2>
                  <button
                    type="button"
                    onClick={() => setAdminScreen('store-applications')}
                    className="text-xs font-bold text-[#153D35] cursor-pointer"
                  >
                    عرض الكل
                  </button>
                </div>
                <div className="divide-y divide-[#E4E7E2]">
                  {applications.slice(0, 4).map((app) => (
                    <div key={app.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-[#252A28]">{app.storeName}</div>
                        <div className="text-[11px] text-[#78827D]">
                          {app.region} · @{app.username}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedApplicationId(app.id);
                          setAdminScreen('application-details');
                        }}
                      >
                        مراجعة
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Audit Log */}
              <div className="bg-white border border-[#E4E7E2] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#252A28]">أحدث العمليات الإدارية</h2>
                  <button
                    type="button"
                    onClick={() => setAdminScreen('audit-log')}
                    className="text-xs font-bold text-[#153D35] cursor-pointer"
                  >
                    السجل الكامل
                  </button>
                </div>
                <div className="divide-y divide-[#E4E7E2]">
                  {auditLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-[#252A28]">{log.action}: </span>
                        <span className="text-[#153D35] font-semibold">{log.target}</span>
                        <div className="text-[11px] text-[#78827D] mt-0.5">{log.details}</div>
                      </div>
                      <span className="text-[11px] text-[#78827D] tabular-nums shrink-0">
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // 3. STORE APPLICATIONS LIST
      case 'store-applications': {
        return (
          <div className="space-y-4">
            <h1 className="text-xl font-extrabold text-[#252A28]">مراجعة طلبات إنشاء المتاجر</h1>
            <div className="bg-white border border-[#E4E7E2] rounded-2xl overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F6F4EE] border-b border-[#E4E7E2] text-[#78827D]">
                  <tr>
                    <th className="py-3 px-4 font-bold">اسم المتجر</th>
                    <th className="py-3 px-4 font-bold">Username</th>
                    <th className="py-3 px-4 font-bold">المالك</th>
                    <th className="py-3 px-4 font-bold">المنطقة</th>
                    <th className="py-3 px-4 font-bold">الحالة</th>
                    <th className="py-3 px-4 font-bold">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7E2]">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-[#F6F4EE]/50">
                      <td className="py-3 px-4 font-bold text-[#252A28]">{app.storeName}</td>
                      <td className="py-3 px-4 font-mono text-[#78827D]" dir="ltr">
                        @{app.username}
                      </td>
                      <td className="py-3 px-4">{app.ownerName}</td>
                      <td className="py-3 px-4">{app.region}</td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          tone={
                            app.status === 'approved'
                              ? 'success'
                              : app.status === 'rejected'
                              ? 'danger'
                              : app.status === 'needs_info'
                              ? 'warning'
                              : 'info'
                          }
                          label={
                            app.status === 'approved'
                              ? 'مقبول'
                              : app.status === 'rejected'
                              ? 'مرفوض'
                              : app.status === 'needs_info'
                              ? 'استكمال بيانات'
                              : 'قيد المراجعة'
                          }
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedApplicationId(app.id);
                            setAdminScreen('application-details');
                          }}
                        >
                          فحص المستندات
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // 4. APPLICATION DETAILS WITH DOCUMENTS
      case 'application-details': {
        const app = applications.find((a) => a.id === selectedApplicationId) || applications[0];
        if (!app) return <EmptyState title="لا توجد طلبات" description="لم يتم اختيار طلب متجر." />;

        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-extrabold text-[#252A28]">تفاصيل طلب المتجر والمستندات</h1>
                <p className="text-xs text-[#78827D]">
                  مراجعة إثبات النشاط التجاري قبل اعتماد المتجر أو منحه شارة التوثيق
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setAdminScreen('store-applications')}>
                العودة لقائمة الطلبات
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white border border-[#E4E7E2] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E4E7E2]">
                  <div>
                    <h2 className="text-base font-extrabold text-[#252A28]">{app.storeName}</h2>
                    <div className="text-xs text-[#78827D]" dir="ltr">
                      @{app.username}
                    </div>
                  </div>
                  <StatusBadge
                    tone={
                      app.status === 'approved'
                        ? 'success'
                        : app.status === 'rejected'
                        ? 'danger'
                        : app.status === 'needs_info'
                        ? 'warning'
                        : 'info'
                    }
                    label={
                      app.status === 'approved'
                        ? 'مقبول'
                        : app.status === 'rejected'
                        ? 'مرفوض'
                        : app.status === 'needs_info'
                        ? 'مطلوب استكمال'
                        : 'قيد المراجعة'
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#78827D]">اسم المالك: </span>
                    <strong className="text-[#252A28]">{app.ownerName}</strong>
                  </div>
                  <div>
                    <span className="text-[#78827D]">المنطقة: </span>
                    <strong className="text-[#252A28]">{app.region}</strong>
                  </div>
                  <div>
                    <span className="text-[#78827D]">البريد: </span>
                    <strong className="text-[#252A28]">{app.email}</strong>
                  </div>
                  <div>
                    <span className="text-[#78827D]">الهاتف / واتساب: </span>
                    <strong className="text-[#252A28] tabular-nums">{app.phone}</strong>
                  </div>
                </div>

                <div className="bg-[#F6F4EE] rounded-xl p-3.5 text-xs space-y-1">
                  <div className="font-bold text-[#252A28]">وصف النشاط:</div>
                  <p className="text-[#78827D]">{app.description}</p>
                </div>

                <div className="border border-[#E4E7E2] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#153D35]">
                      <FileText className="w-4 h-4" />
                      <span>مستند إثبات المشروع: {app.proofDocumentName}</span>
                    </div>
                    <StatusBadge tone="info" label="مرفق للمعاينة" />
                  </div>
                  <p className="text-xs text-[#78827D]">{app.proofSummary}</p>
                </div>
              </div>

              {/* Decision Panel */}
              <div className="bg-white border border-[#E4E7E2] rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-[#252A28]">قرار المراجعة</h2>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#E6EFEA] text-xs font-bold text-[#153D35] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifyOnApprove}
                    onChange={(e) => setVerifyOnApprove(e.target.checked)}
                  />
                  <span>منح شارة "متجر موثق" عند الاعتماد</span>
                </label>

                <TextInput
                  label="ملاحظة / سبب الرفض أو الاستكمال"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="اكتب السبب عند الرفض أو طلب الاستكمال..."
                />

                <div className="space-y-2 pt-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() =>
                      reviewStoreApplication(app.id, 'approved', {
                        verifyStore: verifyOnApprove,
                      })
                    }
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    اعتماد المتجر
                  </Button>
                  <Button
                    variant="gold"
                    className="w-full"
                    onClick={() =>
                      reviewStoreApplication(app.id, 'needs_info', {
                        reason: decisionNote || 'يرجى استكمال مستند إثبات النشاط.',
                      })
                    }
                  >
                    طلب استكمال البيانات
                  </Button>
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() =>
                      reviewStoreApplication(app.id, 'rejected', {
                        reason: decisionNote || 'المستندات المرفقة غير كافية.',
                      })
                    }
                  >
                    رفض الطلب
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // 5. STORES MANAGEMENT (VERIFIED vs UNVERIFIED + EXPLICIT CONFIRMATION)
      case 'stores': {
        const filteredStores = stores.filter((s) => {
          if (storeFilter === 'verified' && !s.verified) return false;
          if (storeFilter === 'unverified' && s.verified) return false;
          if (storeFilter === 'suspended' && s.status !== 'suspended') return false;
          if (
            storeSearch.trim() &&
            !s.name.toLowerCase().includes(storeSearch.trim().toLowerCase()) &&
            !s.username.toLowerCase().includes(storeSearch.trim().toLowerCase())
          ) {
            return false;
          }
          return true;
        });

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-extrabold text-[#252A28]">إدارة المتاجر المعتمدة والموقوفة</h1>
                <p className="text-xs text-[#78827D]">
                  التمييز الواضح بين المتجر الموثق وغير الموثق، مع تأكيد صريح قبل الإيقاف أو الأرشفة.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-72">
                <SearchInputBar
                  value={storeSearch}
                  onChange={setStoreSearch}
                  placeholder="بحث باسم المتجر أو Username..."
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: `الكل (${stores.length})` },
                  { id: 'verified', label: 'الموثقة فقط' },
                  { id: 'unverified', label: 'غير الموثقة' },
                  { id: 'suspended', label: 'الموقوفة' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStoreFilter(f.id as typeof storeFilter)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      storeFilter === f.id
                        ? 'bg-[#153D35] text-white border-[#153D35]'
                        : 'bg-white text-[#252A28] border-[#E4E7E2]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E4E7E2] rounded-2xl overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F6F4EE] border-b border-[#E4E7E2] text-[#78827D]">
                  <tr>
                    <th className="py-3 px-4 font-bold">المتجر</th>
                    <th className="py-3 px-4 font-bold">التوثيق</th>
                    <th className="py-3 px-4 font-bold">حالة التشغيل</th>
                    <th className="py-3 px-4 font-bold">المنطقة والباقة</th>
                    <th className="py-3 px-4 font-bold">إجراءات إدارية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7E2]">
                  {filteredStores.map((st) => (
                    <tr key={st.id}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#252A28]">{st.name}</div>
                        <div className="text-[11px] text-[#78827D]" dir="ltr">
                          @{st.username}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <VerifiedBadge verified={st.verified} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          tone={
                            st.status === 'approved'
                              ? 'success'
                              : st.status === 'suspended'
                              ? 'danger'
                              : 'neutral'
                          }
                          label={
                            st.status === 'approved'
                              ? 'معتمد ونشط'
                              : st.status === 'suspended'
                              ? 'موقوف مؤقتاً'
                              : 'مؤرشف'
                          }
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div>{st.region}</div>
                        <div className="text-[11px] text-[#78827D]">{PLAN_LIMITS[st.plan].label}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => toggleStoreVerification(st.id)}
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                            {st.verified ? 'إلغاء التوثيق' : 'منح التوثيق'}
                          </Button>
                          {st.status === 'approved' ? (
                            <>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  setStoreActionReason('');
                                  setStoreActionModal({ store: st, nextStatus: 'suspended' });
                                }}
                              >
                                <Ban className="w-3.5 h-3.5" />
                                إيقاف
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setStoreActionReason('');
                                  setStoreActionModal({ store: st, nextStatus: 'archived' });
                                }}
                              >
                                <Archive className="w-3.5 h-3.5" />
                                أرشفة
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() =>
                                updateStoreStatus(st.id, 'approved', 'إعادة تفعيل المتجر من الإدارة')
                              }
                            >
                              إعادة تفعيل
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 pb-3">
                <Pagination page={storePage} totalPages={2} onChange={setStorePage} />
              </div>
            </div>
          </div>
        );
      }

      // 6. USERS MANAGEMENT
      case 'users':
        return (
          <div className="space-y-4">
            <h1 className="text-xl font-extrabold text-[#252A28]">إدارة المستخدمين</h1>
            {authProfile?.role === 'platform_owner' && (
              <form
                className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!managerName.trim() || !managerEmail.trim()) return;
                  setManagerInviteLoading(true);
                  const result = await inviteTeamMember({ action: 'platform_admin', fullName: managerName.trim(), email: managerEmail.trim() });
                  setManagerInviteLoading(false);
                  if (result.ok) {
                    setManagerName('');
                    setManagerEmail('');
                    showToast('تم إرسال دعوة المدير إلى البريد الإلكتروني.', 'success');
                  } else {
                    showToast(result.error || 'تعذر إرسال الدعوة.', 'danger');
                  }
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#153D35]">إضافة مدير منصة</h2>
                    <p className="text-[11px] text-[#78827D] mt-1">سيصل للمدير رابط إنشاء كلمة المرور عبر Supabase Auth.</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-[#2F7D58]" />
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  <TextInput label="اسم المدير" value={managerName} onChange={(event) => setManagerName(event.target.value)} />
                  <TextInput label="بريد المدير" type="email" value={managerEmail} onChange={(event) => setManagerEmail(event.target.value)} />
                </div>
                <Button type="submit" variant="primary" disabled={managerInviteLoading}>
                  {managerInviteLoading ? 'جارٍ إرسال الدعوة...' : 'إرسال دعوة المدير'}
                </Button>
              </form>
            )}
            <div className="bg-white border border-[#E4E7E2] rounded-2xl overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F6F4EE] border-b border-[#E4E7E2] text-[#78827D]">
                  <tr>
                    <th className="py-3 px-4">الاسم</th>
                    <th className="py-3 px-4">البريد والهاتف</th>
                    <th className="py-3 px-4">الدور</th>
                    <th className="py-3 px-4">المنطقة</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7E2]">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-4 font-bold">{u.name}</td>
                      <td className="py-3 px-4">
                        <div>{u.email}</div>
                        <div className="text-[11px] text-[#78827D] tabular-nums">{u.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        {u.role === 'admin' ? 'إدارة' : u.role === 'merchant' ? 'تاجر' : 'مشتري'}
                      </td>
                      <td className="py-3 px-4">{u.region}</td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          tone={u.status === 'active' ? 'success' : 'danger'}
                          label={u.status === 'active' ? 'نشط' : 'محظور'}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant={u.status === 'active' ? 'outline' : 'primary'}
                          onClick={() => toggleUserStatus(u.id)}
                        >
                          {u.status === 'active' ? 'حظر مؤقت' : 'فك الحظر'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      // 7. ADMIN PRODUCTS
      case 'products':
        return (
          <div className="space-y-4">
            <h1 className="text-xl font-extrabold text-[#252A28]">إدارة المنتجات على المنصة</h1>
            <div className="bg-white border border-[#E4E7E2] rounded-2xl overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F6F4EE] border-b border-[#E4E7E2] text-[#78827D]">
                  <tr>
                    <th className="py-3 px-4">المنتج</th>
                    <th className="py-3 px-4">المتجر</th>
                    <th className="py-3 px-4">السعر</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7E2]">
                  {products.map((p) => {
                    const st = storeMap.get(p.storeId);
                    return (
                      <tr key={p.id}>
                        <td className="py-3 px-4 flex items-center gap-2.5">
                          <ImageWithFallback
                            src={p.images[0]}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-[#E4E7E2]"
                          />
                          <span className="font-bold text-[#252A28]">{p.name}</span>
                        </td>
                        <td className="py-3 px-4">{st?.name}</td>
                        <td className="py-3 px-4 font-bold tabular-nums">{p.price} ₪</td>
                        <td className="py-3 px-4">
                          <StatusBadge
                            tone={p.archived ? 'neutral' : 'success'}
                            label={p.archived ? 'مؤرشف' : 'معروض'}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateProduct(p.id, { archived: !p.archived })}
                          >
                            {p.archived ? 'إعادة نشر' : 'أرشفة إدارية'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );

      // 8. REPORTS
      case 'reports':
        return (
          <div className="space-y-4">
            <h1 className="text-xl font-extrabold text-[#252A28]">مراجعة المنتجات والبلاغات</h1>
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-white border border-[#E4E7E2] rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#252A28]">{rep.targetName}</span>
                      <StatusBadge
                        tone={
                          rep.status === 'open'
                            ? 'danger'
                            : rep.status === 'resolved'
                            ? 'success'
                            : 'neutral'
                        }
                        label={
                          rep.status === 'open'
                            ? 'مفتوح'
                            : rep.status === 'resolved'
                            ? 'تمت المعالجة'
                            : 'محفوظ'
                        }
                      />
                    </div>
                    <p className="text-xs text-[#78827D]">
                      سبب البلاغ: {rep.reason} · المبلّغ: {rep.reporterLabel} ({rep.createdAt})
                    </p>
                  </div>
                  {rep.status === 'open' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => resolveReport(rep.id, 'resolved')}
                      >
                        اتخاذ إجراء وحل البلاغ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveReport(rep.id, 'dismissed')}
                      >
                        حفظ البلاغ
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      // 9. ORDERS & COMPLAINTS
      case 'orders-complaints':
        return (
          <div className="space-y-6">
            <h1 className="text-xl font-extrabold text-[#252A28]">إدارة الطلبات والشكاوى</h1>

            <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-[#153D35]">الشكاوى المفتوحة والمحلولة</h2>
              {complaints.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-[#F6F4EE] flex items-center justify-between gap-3 flex-wrap text-xs"
                >
                  <div>
                    <div className="font-bold text-[#252A28]">
                      {c.orderNumber} · {c.storeName} ({c.customerName})
                    </div>
                    <p className="text-[#78827D] mt-0.5">{c.subject}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      tone={c.status === 'resolved' ? 'success' : c.status === 'investigating' ? 'warning' : 'danger'}
                      label={c.status === 'resolved' ? 'تم الحل' : c.status === 'investigating' ? 'قيد المتابعة' : 'مفتوحة'}
                    />
                    {c.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateComplaintStatus(c.id, 'resolved')}
                      >
                        إغلاق الشكوى
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-[#E4E7E2] rounded-2xl overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F6F4EE] border-b border-[#E4E7E2] text-[#78827D]">
                  <tr>
                    <th className="py-3 px-4">رقم الطلب</th>
                    <th className="py-3 px-4">المتجر</th>
                    <th className="py-3 px-4">المشتري</th>
                    <th className="py-3 px-4">القناة</th>
                    <th className="py-3 px-4">الإجمالي</th>
                    <th className="py-3 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7E2]">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-3 px-4 font-bold tabular-nums">{o.orderNumber}</td>
                      <td className="py-3 px-4">{o.storeName}</td>
                      <td className="py-3 px-4">{o.customerName}</td>
                      <td className="py-3 px-4">{o.channel === 'whatsapp' ? 'واتساب' : 'المنصة'}</td>
                      <td className="py-3 px-4 font-bold tabular-nums">{o.total} ₪</td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          tone={ORDER_STATUS_META[o.status].tone}
                          label={ORDER_STATUS_META[o.status].label}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      // 10. CATEGORIES MANAGEMENT
      case 'categories':
        return (
          <div className="space-y-4">
            <h1 className="text-xl font-extrabold text-[#252A28]">إدارة التصنيفات</h1>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addCategory(newCategoryName);
                setNewCategoryName('');
              }}
              className="bg-white border border-[#E4E7E2] rounded-2xl p-4 flex gap-3 items-end"
            >
              <TextInput
                label="إضافة تصنيف جديد"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="مثال: القرطاسية والكتب"
              />
              <Button type="submit" variant="primary">
                <Plus className="w-4 h-4" />
                إضافة
              </Button>
            </form>

            <div className="bg-white border border-[#E4E7E2] rounded-2xl divide-y divide-[#E4E7E2]">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 flex items-center justify-between gap-3 flex-wrap text-xs">
                  {editingCatId === cat.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingCatName.trim()) {
                          renameCategory(cat.id, editingCatName);
                        }
                        setEditingCatId(null);
                      }}
                      className="flex items-center gap-2 flex-1 min-w-[220px]"
                    >
                      <TextInput
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        aria-label="اسم التصنيف"
                      />
                      <Button type="submit" size="sm" variant="primary">
                        حفظ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCatId(null)}
                      >
                        إلغاء
                      </Button>
                    </form>
                  ) : (
                    <div>
                      <div className="font-bold text-[#252A28]">{cat.name}</div>
                      <div className="text-[11px] text-[#78827D] tabular-nums">
                        الترتيب: {cat.sortOrder} · {cat.productCount} منتج
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      tone={cat.active ? 'success' : 'neutral'}
                      label={cat.active ? 'مفعل' : 'مخفي'}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditingCatName(cat.name);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleCategoryActive(cat.id)}
                    >
                      {cat.active ? 'إخفاء' : 'تفعيل'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // 11. PLANS & SUBSCRIPTIONS
      case 'plans':
        return (
          <div className="space-y-5">
            <h1 className="text-xl font-extrabold text-[#252A28]">إدارة الباقات والاشتراكات</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((pl) => (
                <div key={pl.id} className="bg-white border border-[#E4E7E2] rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-[#252A28]">{pl.name}</h2>
                      <span className="text-base font-extrabold text-[#153D35] tabular-nums">
                        {pl.monthlyPrice === 0 ? 'مجاني' : `${pl.monthlyPrice} ₪/شهر`}
                      </span>
                    </div>
                    <p className="text-xs text-[#78827D]">{pl.subtitle}</p>
                    <div className="text-xs font-semibold text-[#252A28] pt-2 border-t border-[#E4E7E2]">
                      الحد الأقصى للمنتجات: {pl.maxProducts === 999 ? 'غير محدود' : pl.maxProducts}
                    </div>
                    <div className="text-xs text-[#78827D] tabular-nums">
                      المتاجر المشتركة حالياً: {stores.filter((s) => s.plan === pl.id).length}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      setEditingPlan({
                        id: pl.id,
                        name: pl.name,
                        monthlyPrice: String(pl.monthlyPrice),
                        maxProducts: String(pl.maxProducts),
                        subtitle: pl.subtitle,
                      })
                    }
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    تعديل الباقة
                  </Button>
                </div>
              ))}
            </div>

            <ModalDialog
              open={Boolean(editingPlan)}
              title={`تعديل باقة ${editingPlan?.name || ''}`}
              onClose={() => setEditingPlan(null)}
            >
              {editingPlan && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updatePlan(editingPlan.id, {
                      monthlyPrice: Math.max(0, Number(editingPlan.monthlyPrice) || 0),
                      maxProducts: Math.max(1, Number(editingPlan.maxProducts) || 10),
                      subtitle: editingPlan.subtitle.trim() || undefined,
                    });
                    setEditingPlan(null);
                  }}
                  className="space-y-3"
                >
                  <TextInput
                    label="السعر الشهري (₪)"
                    type="number"
                    value={editingPlan.monthlyPrice}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, monthlyPrice: e.target.value })
                    }
                    required
                  />
                  <TextInput
                    label="الحد الأقصى للمنتجات (999 = غير محدود)"
                    type="number"
                    value={editingPlan.maxProducts}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, maxProducts: e.target.value })
                    }
                    required
                  />
                  <TextInput
                    label="وصف الباقة المختصر"
                    value={editingPlan.subtitle}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, subtitle: e.target.value })
                    }
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setEditingPlan(null)}>
                      إلغاء
                    </Button>
                    <Button type="submit" variant="primary">
                      حفظ التعديلات
                    </Button>
                  </div>
                </form>
              )}
            </ModalDialog>
          </div>
        );

      // 12. PAYMENTS & COUPONS
      case 'payments-coupons':
        return (
          <div className="space-y-6">
            <h1 className="text-xl font-extrabold text-[#252A28]">إدارة المدفوعات والكوبونات</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
                <h2 className="text-sm font-bold text-[#252A28]">سجل المدفوعات</h2>
                <div className="divide-y divide-[#E4E7E2]">
                  {payments.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#252A28]">{p.storeName}</div>
                        <div className="text-[11px] text-[#78827D]">{p.description}</div>
                      </div>
                      <div className="text-left">
                        <div className="font-extrabold text-[#153D35] tabular-nums">{p.amount} ₪</div>
                        <StatusBadge
                          tone={p.status === 'paid' ? 'success' : p.status === 'failed' || p.status === 'cancelled' ? 'danger' : 'warning'}
                          label={p.status === 'paid' ? 'مدفوع' : p.status === 'processing' ? 'قيد المعالجة' : p.status === 'pending' ? 'معلق' : p.status === 'cancelled' ? 'ملغي' : 'فشل'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
                <h2 className="text-sm font-bold text-[#252A28]">الكوبونات</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addCoupon(newCouponCode, Number(newCouponPercent) || 10, newCouponScope);
                    setNewCouponCode('');
                  }}
                  className="grid grid-cols-3 gap-2 items-end"
                >
                  <TextInput
                    label="الكود"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    placeholder="SPRING25"
                  />
                  <TextInput
                    label="الخصم %"
                    type="number"
                    value={newCouponPercent}
                    onChange={(e) => setNewCouponPercent(e.target.value)}
                  />
                  <Button type="submit" variant="primary">
                    إنشاء
                  </Button>
                </form>

                <div className="divide-y divide-[#E4E7E2]">
                  {coupons.map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-[#153D35]">{c.code}</div>
                        <div className="text-[11px] text-[#78827D] tabular-nums">
                          خصم {c.discountPercent}% · {c.scope} · استخدام {c.usageCount}/{c.maxUsage}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={c.active ? 'outline' : 'primary'}
                        onClick={() => toggleCouponActive(c.id)}
                      >
                        {c.active ? 'تعطيل' : 'تفعيل'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      // 12. PLATFORM SETTINGS & INTEGRATIONS
      case 'settings':
        return (
          <div className="space-y-5 max-w-2xl">
            <h1 className="text-xl font-extrabold text-[#252A28]">إعدادات المنصة والربط السحابي</h1>

            {/* Supabase & Cloudflare R2 Readiness Panel */}
            <div className="bg-white border border-[#E4E7E2] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-[#153D35]">حالة الربط الإنتاجي</h2>
                <StatusBadge
                  tone={
                    integrationsStatus.supabaseConfigured && integrationsStatus.cloudflareR2Configured
                      ? 'success'
                      : 'warning'
                  }
                  label={
                    integrationsStatus.supabaseConfigured && integrationsStatus.cloudflareR2Configured
                      ? 'متصل بالكامل'
                      : 'جاهز للربط عبر المفاتيح'
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F6F4EE] border border-[#E4E7E2] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#252A28] inline-flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-[#153D35]" />
                      Supabase (البيانات والمستخدمون)
                    </span>
                    <StatusBadge
                      tone={integrationsStatus.supabaseConfigured ? 'success' : 'neutral'}
                      label={integrationsStatus.supabaseConfigured ? 'متصل' : 'بانتظار الإعداد'}
                    />
                  </div>
                  <p className="text-[11px] text-[#78827D] leading-relaxed">
                    مخطط الجداول وسياسات RLS جاهزة للتفعيل فور إضافة عنوان المشروع ومفتاح الوصول العام.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F6F4EE] border border-[#E4E7E2] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#252A28] inline-flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-[#153D35]" />
                      Cloudflare R2 (تخزين الصور)
                    </span>
                    <StatusBadge
                      tone={integrationsStatus.cloudflareR2Configured ? 'success' : 'neutral'}
                      label={integrationsStatus.cloudflareR2Configured ? 'متصل' : 'بانتظار الإعداد'}
                    />
                  </div>
                  <p className="text-[11px] text-[#78827D] leading-relaxed">
                    نقطة الرفع الخادومية الآمنة والتوقيع المباشر جاهزان للعمل مع حاوية R2 العامة.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E4E7E2] rounded-2xl p-5 space-y-4">
              <TextInput
                label="اسم المنصة"
                value={settingsDraft.platformName}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, platformName: e.target.value })
                }
              />
              <TextInput
                label="واتساب الدعم الفني"
                value={settingsDraft.supportWhatsapp}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, supportWhatsapp: e.target.value })
                }
              />
              <TextInput
                label="ملخص شروط المشتري والدفع"
                value={settingsDraft.buyerTermsSummary}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, buyerTermsSummary: e.target.value })
                }
              />
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#F6F4EE] text-xs font-semibold cursor-pointer">
                <span>السماح بالشراء كضيف دون إنشاء حساب</span>
                <input
                  type="checkbox"
                  checked={settingsDraft.guestCheckoutEnabled}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      guestCheckoutEnabled: e.target.checked,
                    })
                  }
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#F6F4EE] text-xs font-semibold cursor-pointer">
                <span>تفعيل وضع الصيانة</span>
                <input
                  type="checkbox"
                  checked={settingsDraft.maintenanceMode}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      maintenanceMode: e.target.checked,
                    })
                  }
                />
              </label>
              <Button variant="primary" onClick={() => updatePlatformSettings(settingsDraft)}>
                حفظ إعدادات المنصة
              </Button>
            </div>

            <div className="bg-white border border-[#B54747]/30 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-[#B54747]">استعادة بيانات العرض الافتراضية</h2>
                <p className="text-xs text-[#78827D]">
                  يتم حفظ جميع التغييرات محلياً في المتصفح لحين ربط قاعدة البيانات. يمكنك إعادة ضبط البيانات في أي وقت.
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setResetConfirmOpen(true)}>
                <RotateCcw className="w-3.5 h-3.5" />
                استعادة البيانات الافتراضية
              </Button>
            </div>

            <ModalDialog
              open={resetConfirmOpen}
              title="تأكيد استعادة البيانات الافتراضية"
              onClose={() => setResetConfirmOpen(false)}
              footer={
                <>
                  <Button variant="ghost" size="sm" onClick={() => setResetConfirmOpen(false)}>
                    تراجع
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      resetDemoData();
                      setResetConfirmOpen(false);
                    }}
                  >
                    نعم، استعادة البيانات
                  </Button>
                </>
              }
            >
              <p className="text-xs text-[#252A28]">
                سيؤدي هذا الإجراء إلى مسح التعديلات المحفوظة محلياً واسترجاع المتاجر والمنتجات والطلبات الأولية.
              </p>
            </ModalDialog>
          </div>
        );

      // 17. AUDIT LOG
      case 'audit-log':
        return (
          <div className="space-y-4">
            <h1 className="text-xl font-extrabold text-[#252A28]">سجل العمليات الإدارية (Audit Log)</h1>
            <div className="bg-white border border-[#E4E7E2] rounded-2xl divide-y divide-[#E4E7E2]">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        tone={
                          log.severity === 'danger'
                            ? 'danger'
                            : log.severity === 'warning'
                            ? 'warning'
                            : 'info'
                        }
                        label={log.action}
                      />
                      <span className="font-bold text-[#252A28]">{log.target}</span>
                    </div>
                    <p className="text-[#78827D]">
                      {log.details} — بواسطة: {log.actor}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#78827D] tabular-nums shrink-0">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#F6F4EE] flex flex-col lg:flex-row">
      {/* Desktop Sidebar (260px) */}
      <aside className="hidden lg:flex w-[260px] shrink-0 bg-white border-l border-[#E4E7E2] flex-col justify-between p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4E7E2]">
            <span className="text-sm font-extrabold text-[#153D35]">لوحة الإدارة</span>
            <span className="text-[11px] font-semibold text-[#78827D]">{ADMIN_NAV_ITEMS.length} قسماً</span>
          </div>
          <nav className="space-y-1" aria-label="قائمة لوحة الإدارة">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = adminScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAdminScreen(item.id)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 text-right transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#153D35] text-white'
                      : 'text-[#252A28] hover:bg-[#F6F4EE]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void signOut()}
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </Button>
      </aside>

      {/* Mobile Admin Header Bar */}
      <div className="lg:hidden bg-white border-b border-[#E4E7E2] px-4 py-3 flex items-center justify-between">
        <BrandLogo />
        <button
          type="button"
          onClick={() => setMobileNavOpen((v) => !v)}
          className="h-9 px-3 rounded-xl bg-[#F6F4EE] border border-[#E4E7E2] inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer"
        >
          {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          قائمة الإدارة
        </button>
      </div>

      <SmoothMenuOverlay
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title="قائمة لوحة الإدارة"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#E4E7E2]">
          <span className="text-xs font-extrabold text-[#153D35]">قائمة لوحة الإدارة</span>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="w-8 h-8 rounded-lg bg-[#F6F4EE] text-[#252A28] inline-flex items-center justify-center cursor-pointer"
            aria-label="إغلاق القائمة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ADMIN_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setAdminScreen(item.id);
                setMobileNavOpen(false);
              }}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold text-right cursor-pointer transition-colors ${
                adminScreen === item.id
                  ? 'bg-[#153D35] text-white'
                  : 'bg-[#F6F4EE] text-[#252A28] hover:bg-[#E6EFEA]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </SmoothMenuOverlay>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1200px] w-full mx-auto space-y-4">
        {isOffline && <OfflineBanner />}
        <PageTransition screenKey={adminScreen}>{renderMainScreen()}</PageTransition>
      </main>

      {/* Explicit Confirmation Modal before Suspend / Archive */}
      <ModalDialog
        open={Boolean(storeActionModal)}
        title={
          storeActionModal?.nextStatus === 'suspended'
            ? `تأكيد إيقاف متجر: ${storeActionModal?.store.name}`
            : `تأكيد أرشفة متجر: ${storeActionModal?.store.name}`
        }
        onClose={() => setStoreActionModal(null)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setStoreActionModal(null)}>
              تراجع
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (storeActionModal) {
                  updateStoreStatus(
                    storeActionModal.store.id,
                    storeActionModal.nextStatus,
                    storeActionReason.trim() ||
                      (storeActionModal.nextStatus === 'suspended'
                        ? 'إيقاف مؤقت من لوحة الإدارة'
                        : 'أرشفة المتجر')
                  );
                }
                setStoreActionModal(null);
              }}
            >
              {storeActionModal?.nextStatus === 'suspended' ? 'تأكيد الإيقاف' : 'تأكيد الأرشفة'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="bg-[#B54747]/10 border border-[#B54747]/25 rounded-xl p-3 text-[#B54747] font-semibold">
            {storeActionModal?.nextStatus === 'suspended'
              ? 'تنبيه: سيؤدي إيقاف المتجر إلى إخفاء جميع منتجاته فوراً عن المشترين ومنع استقبال طلبات جديدة حتى إعادة تفعيله.'
              : 'تنبيه: ستؤدي الأرشفة إلى إخراج المتجر من الواجهة العامة مع الإبقاء على سجل الطلبات والتقارير.'}
          </div>
          <TextInput
            label="سبب الإجراء (يُسجّل في Audit Log)"
            value={storeActionReason}
            onChange={(e) => setStoreActionReason(e.target.value)}
            placeholder="مثال: مخالفة شروط التسعير أو عدم استجابة المتجر"
          />
        </div>
      </ModalDialog>
    </div>
  );
}
