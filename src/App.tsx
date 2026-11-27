import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  CheckCircle2,
  Menu,
  Search,
  ShoppingBag,
  Store,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { AdminApp } from './components/admin/AdminApp';
import { BuyerApp } from './components/buyer/BuyerApp';
import { MerchantApp } from './components/merchant/MerchantApp';
import { BrandLogo } from './components/ui/DesignSystemKit';
import {
  EASE_OUT_EXPO,
  GlobalGreenCurtain,
  PageTransition,
  SmoothMenuOverlay,
} from './components/ui/MotionPrimitives';
import { MarketplaceProvider, useMarketplace } from './store/MarketplaceContext';
import type { BuyerScreenId, WorkspaceId } from './types/marketplace';

const BUYER_NAV_LINKS: { id: BuyerScreenId; label: string }[] = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'categories', label: 'التصنيفات' },
  { id: 'search', label: 'البحث' },
  { id: 'cart', label: 'السلة' },
  { id: 'account', label: 'حسابي' },
];

const WORKSPACE_TABS: {
  id: WorkspaceId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'buyer', label: 'المتجر', icon: ShoppingBag },
  { id: 'merchant', label: 'بوابة التاجر', icon: Store },
  { id: 'admin', label: 'لوحة الإدارة', icon: ShieldCheck },
];

function WorkspaceShell() {
  const {
    workspace,
    setWorkspace,
    buyerScreen,
    setBuyerScreen,
    merchantScreen,
    adminScreen,
    cartsByStore,
    toast,
  } = useMarketplace();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalCartItems = useMemo(
    () =>
      Object.values(cartsByStore)
        .flat()
        .reduce((sum, item) => sum + item.quantity, 0),
    [cartsByStore]
  );

  const activeScreen =
    workspace === 'buyer'
      ? buyerScreen
      : workspace === 'merchant'
      ? merchantScreen
      : adminScreen;

  const transitionKey = `${workspace}:${activeScreen}`;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [transitionKey]);

  const handleSelectBuyerScreen = (screen: BuyerScreenId) => {
    setWorkspace('buyer');
    setBuyerScreen(screen);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EE] text-[#252A28]">
      {/* Full-Screen Brand Green Transition Curtain (#153D35) */}
      <GlobalGreenCurtain transitionKey={transitionKey} />

      {/* Production Top Bar */}
      <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-md border-b border-[#E4E7E2]">
        <div className="max-w-7xl mx-auto h-full px-4 lg:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                handleSelectBuyerScreen('home');
              }}
              className="shrink-0"
            >
              <BrandLogo />
            </a>

            {/* Primary Buyer Storefront Navigation (Desktop) */}
            {workspace === 'buyer' && (
              <nav className="hidden md:flex items-center gap-1" aria-label="تصفح المتجر">
                {BUYER_NAV_LINKS.map((link) => {
                  const active = buyerScreen === link.id;
                  return (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => handleSelectBuyerScreen(link.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                        active
                          ? 'bg-[#E6EFEA] text-[#153D35]'
                          : 'text-[#78827D] hover:text-[#252A28] hover:bg-[#F6F4EE]'
                      }`}
                    >
                      <span>{link.label}</span>
                      {link.id === 'cart' && totalCartItems > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#153D35] text-white text-[10px] tabular-nums leading-none">
                          {totalCartItems}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {workspace === 'buyer' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectBuyerScreen('search')}
                  aria-label="بحث في المتجر"
                  className="hidden sm:flex w-9 h-9 rounded-xl bg-[#F6F4EE] hover:bg-[#E6EFEA] text-[#252A28] items-center justify-center transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectBuyerScreen('cart')}
                  aria-label="سلة المشتريات"
                  className="relative w-9 h-9 rounded-xl bg-[#F6F4EE] hover:bg-[#E6EFEA] text-[#252A28] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {totalCartItems > 0 && (
                    <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#153D35] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {totalCartItems}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Portal Switcher (Desktop) */}
            <div
              className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[#F6F4EE] border border-[#E4E7E2]"
              role="navigation"
              aria-label="التبديل بين بوابات المنصة"
            >
              {WORKSPACE_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = workspace === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setWorkspace(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#153D35] text-white shadow-xs'
                        : 'text-[#78827D] hover:text-[#252A28]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="فتح القائمة"
              className="md:hidden h-9 px-3 rounded-xl bg-[#F6F4EE] border border-[#E4E7E2] text-xs font-bold text-[#153D35] inline-flex items-center gap-1.5 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>القائمة</span>
            </button>
          </div>
        </div>
      </header>

      {/* Smooth Mobile Menu Overlay */}
      <SmoothMenuOverlay
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="قائمة التنقل"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#E4E7E2]">
          <span className="text-xs font-extrabold text-[#153D35]">بوابات سوقنا</span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="إغلاق القائمة"
            className="w-8 h-8 rounded-lg bg-[#F6F4EE] flex items-center justify-center text-[#78827D] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = workspace === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setWorkspace(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`px-2.5 py-2.5 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#153D35] text-white'
                    : 'bg-[#F6F4EE] text-[#252A28] hover:bg-[#E6EFEA]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {workspace === 'buyer' && (
          <div className="pt-2 border-t border-[#E4E7E2] space-y-2">
            <div className="text-[11px] font-bold text-[#78827D]">تصفح المتجر</div>
            <div className="grid grid-cols-2 gap-1.5">
              {BUYER_NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleSelectBuyerScreen(link.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold text-right cursor-pointer transition-colors flex items-center justify-between ${
                    buyerScreen === link.id
                      ? 'bg-[#153D35] text-white'
                      : 'bg-[#F6F4EE] text-[#252A28] hover:bg-[#E6EFEA]'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.id === 'cart' && totalCartItems > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] tabular-nums">
                      {totalCartItems}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {workspace !== 'buyer' && (
          <button
            type="button"
            onClick={() => handleSelectBuyerScreen('account')}
            className="w-full px-3 py-2.5 rounded-xl bg-[#F6F4EE] text-xs font-bold text-[#252A28] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>العودة لواجهة المشتري</span>
          </button>
        )}
      </SmoothMenuOverlay>

      {/* Main Production Viewport */}
      <PageTransition screenKey={workspace} className="flex-1 flex flex-col">
        {workspace === 'admin' ? (
          <AdminApp />
        ) : (
          <main className="flex-1 w-full bg-[#F6F4EE]">
            {workspace === 'buyer' ? <BuyerApp /> : <MerchantApp />}
          </main>
        )}
      </PageTransition>

      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
            className={`fixed bottom-5 left-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 ${
              toast.tone === 'danger'
                ? 'bg-[#B54747] text-white border-[#B54747]'
                : toast.tone === 'info'
                ? 'bg-[#252A28] text-white border-[#252A28]'
                : 'bg-[#153D35] text-white border-[#153D35]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <MarketplaceProvider>
        <WorkspaceShell />
      </MarketplaceProvider>
    </MotionConfig>
  );
}
