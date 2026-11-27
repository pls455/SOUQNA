import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Inbox,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Store as StoreIcon,
  WifiOff,
  X,
} from 'lucide-react';
import type { Product, Store } from '../../types/marketplace';
import { EASE_OUT_EXPO } from './MotionPrimitives';

export const BRAND_ICON_SRC =
  '/assets/aistudio/e2311750-ea74-11f1-9078-8df5825b4959_6a8ff055.png';

/* 1. Brand Mark */
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-extrabold tracking-tight text-[#153D35] whitespace-nowrap shrink-0">
      <img
        src={BRAND_ICON_SRC}
        alt="شعار سوقنا"
        className="w-8 h-8 rounded-lg object-contain bg-white border border-[#E4E7E2] p-0.5 shrink-0"
      />
      {!compact && <span className="text-lg">سوقنا</span>}
    </span>
  );
}

/* 2. Buttons */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#153D35] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-[#153D35] text-white hover:bg-[#103029]',
    secondary: 'bg-[#E6EFEA] text-[#153D35] hover:bg-[#d8e7df]',
    outline: 'bg-white text-[#252A28] border border-[#E4E7E2] hover:bg-[#F6F4EE]',
    ghost: 'bg-transparent text-[#252A28] hover:bg-[#E6EFEA]/60',
    danger: 'bg-[#B54747] text-white hover:bg-[#9b3a3a]',
    gold: 'bg-[#D5A64A] text-[#252A28] hover:bg-[#c6983d]',
  };
  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-9 px-3 text-xs',
    md: 'min-h-[42px] px-4 py-2 text-sm',
    lg: 'min-h-[48px] px-5 py-2.5 text-sm',
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/* 3. Form Input & Select */
export function TextInput({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
}) {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#252A28]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border text-sm text-[#252A28] placeholder:text-[#78827D] focus:outline-none focus:ring-2 focus:ring-[#153D35]/20 focus:border-[#153D35] transition-colors ${
          error ? 'border-[#B54747]' : 'border-[#E4E7E2]'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs font-medium text-[#B54747]">{error}</p>}
      {!error && hint && <p className="text-xs text-[#78827D]">{hint}</p>}
    </div>
  );
}

export function SelectInput({
  label,
  className = '',
  id,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const selectId = id || (label ? `select-${label.replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-[#252A28]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#E4E7E2] text-sm text-[#252A28] focus:outline-none focus:ring-2 focus:ring-[#153D35]/20 focus:border-[#153D35] ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

/* 4. Status, Verification, and Sponsored Badges (icon + explicit text, never color alone) */
export function StatusBadge({
  tone,
  label,
}: {
  tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  label: string;
}) {
  const styles = {
    success: 'bg-[#E6EFEA] text-[#2F7D58] border-[#2F7D58]/20',
    danger: 'bg-[#B54747]/10 text-[#B54747] border-[#B54747]/20',
    warning: 'bg-[#D5A64A]/15 text-[#7a5812] border-[#D5A64A]/30',
    info: 'bg-[#153D35]/10 text-[#153D35] border-[#153D35]/20',
    neutral: 'bg-[#F6F4EE] text-[#78827D] border-[#E4E7E2]',
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap shrink-0 ${styles}`}
    >
      {label}
    </span>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#153D35] bg-[#E6EFEA] px-2 py-0.5 rounded-lg whitespace-nowrap shrink-0">
        <BadgeCheck className="w-3.5 h-3.5 text-[#2F7D58]" />
        متجر موثق
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#78827D] bg-[#F6F4EE] border border-[#E4E7E2] px-2 py-0.5 rounded-lg whitespace-nowrap shrink-0">
      <ShieldAlert className="w-3.5 h-3.5 text-[#78827D]" />
      غير موثق
    </span>
  );
}

/* 5. Resilient Image Container */
export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackTitle,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`bg-gradient-to-br from-[#E6EFEA] via-[#F0F4F1] to-[#F6F4EE] flex flex-col items-center justify-center text-[#153D35]/75 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-11 h-11 rounded-2xl bg-white/80 border border-[#153D35]/10 flex items-center justify-center mb-2 shadow-2xs">
          <Package className="w-5 h-5 text-[#153D35]" />
        </div>
        <span className="text-[11px] font-bold text-[#252A28]/80 line-clamp-2 max-w-[180px]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

/* 6. Search Bar */
export function SearchInputBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'ابحث عن منتج أو متجر...',
  onFocus,
}: {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  placeholder?: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className="relative flex-1"
    >
      <Search className="w-4 h-4 text-[#78827D] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full min-h-[42px] pr-10 pl-3 rounded-xl bg-white border border-[#E4E7E2] text-sm text-[#252A28] placeholder:text-[#78827D] focus:outline-none focus:border-[#153D35]"
      />
    </form>
  );
}

/* 7. Stat Card */
export function StatCard({
  title,
  value,
  subtext,
  icon,
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#78827D]">{title}</span>
        {icon && <span className="text-[#153D35]">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-[#252A28] tabular-nums">{value}</div>
      {subtext && <p className="text-[11px] text-[#78827D]">{subtext}</p>}
    </div>
  );
}

/* 8. Product Card (Clean Metadata, Image Zoom, Cart Feedback, zero pill spam) */
export function ProductCard({
  product,
  store,
  isFavorite,
  onToggleFavorite,
  onOpenProduct,
  onOpenStore,
  onQuickAdd,
}: {
  product: Product;
  store?: Store;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenProduct: () => void;
  onOpenStore?: () => void;
  onQuickAdd?: () => void;
}) {
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(false), 950);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  const handleQuickAddClick = () => {
    if (!onQuickAdd) return;
    onQuickAdd();
    setJustAdded(true);
  };

  return (
    <article className="group bg-white border border-[#E4E7E2] rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-[#F6F4EE] overflow-hidden">
        <button
          type="button"
          onClick={onOpenProduct}
          className="w-full h-full block text-right cursor-pointer overflow-hidden"
          aria-label={`عرض تفاصيل ${product.name}`}
        >
          <ImageWithFallback
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.08] will-change-transform"
            fallbackTitle={product.name}
          />
        </button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={onToggleFavorite}
          aria-label={isFavorite ? `إزالة ${product.name} من المفضلة` : `إضافة ${product.name} للمفضلة`}
          className="absolute top-2.5 left-2.5 w-9 h-9 rounded-full bg-white/95 border border-[#E4E7E2] flex items-center justify-center text-[#252A28] hover:text-[#B54747] cursor-pointer transition-colors"
        >
          <Heart className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-[#B54747] text-[#B54747]' : ''}`} />
        </motion.button>
      </div>

      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
        <div className="space-y-1">
          {store && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#78827D]">
              <button
                type="button"
                onClick={onOpenStore}
                className="hover:text-[#153D35] font-medium truncate max-w-[140px] cursor-pointer"
              >
                {store.name}
              </button>
              {store.verified && (
                <BadgeCheck className="w-3.5 h-3.5 text-[#2F7D58] shrink-0" aria-label="متجر موثق" />
              )}
            </div>
          )}

          <h3 className="text-sm font-bold text-[#252A28] leading-snug line-clamp-2">
            <button
              type="button"
              onClick={onOpenProduct}
              className="text-right hover:text-[#153D35] cursor-pointer"
            >
              {product.name}
            </button>
          </h3>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#E4E7E2]/60">
          <div className="flex items-baseline gap-1.5 tabular-nums whitespace-nowrap overflow-hidden">
            <span className="text-sm font-extrabold text-[#153D35] whitespace-nowrap">
              {product.price} ₪
            </span>
            {product.compareAtPrice && (
              <span className="text-[11px] text-[#78827D] line-through whitespace-nowrap">
                {product.compareAtPrice} ₪
              </span>
            )}
          </div>

          {onQuickAdd && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              disabled={!product.available || product.stock <= 0}
              onClick={handleQuickAddClick}
              className={`w-full min-h-[36px] px-3 rounded-xl text-xs font-bold transition-colors duration-200 disabled:opacity-40 whitespace-nowrap cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                justAdded
                  ? 'bg-[#2F7D58] text-white'
                  : 'bg-[#E6EFEA] text-[#153D35] hover:bg-[#153D35] hover:text-white'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  تمت الإضافة
                </>
              ) : product.available && product.stock > 0 ? (
                'أضف للسلة'
              ) : (
                'غير متوفر'
              )}
            </motion.button>
          )}
        </div>
      </div>
    </article>
  );
}

/* 9. Store Card */
export function StoreCard({
  store,
  onOpenStore,
}: {
  store: Store;
  onOpenStore: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpenStore}
      className="w-full text-right bg-white border border-[#E4E7E2] rounded-2xl p-3.5 flex items-center gap-3 hover:border-[#153D35]/40 transition-colors cursor-pointer"
    >
      <div className="w-12 h-12 rounded-xl bg-[#153D35] text-white font-bold text-lg flex items-center justify-center shrink-0">
        {store.logoText}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-[#252A28] truncate">{store.name}</span>
          {store.verified && (
            <BadgeCheck className="w-4 h-4 text-[#2F7D58] shrink-0" aria-label="متجر موثق" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#78827D]">
          <span>{store.region}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">★ {store.rating.toFixed(1)}</span>
          <span aria-hidden="true">·</span>
          <span dir="ltr" className="truncate">
            @{store.username}
          </span>
        </div>
      </div>
      <ChevronLeft className="w-4 h-4 text-[#78827D] shrink-0" />
    </button>
  );
}

/* 10. Loading, Empty, Error, Offline States */
export function LoadingSkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="جاري التحميل">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white border border-[#E4E7E2] rounded-2xl p-4 animate-pulse space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#E4E7E2]" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 bg-[#E4E7E2] rounded" />
              <div className="h-3 w-1/3 bg-[#F6F4EE] rounded" />
            </div>
          </div>
          <div className="h-3 w-full bg-[#F6F4EE] rounded" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E4E7E2] rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[#F6F4EE] text-[#78827D] flex items-center justify-center">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <div className="space-y-1 max-w-xs">
        <h3 className="text-base font-bold text-[#252A28]">{title}</h3>
        <p className="text-xs text-[#78827D] leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'تعذر تحميل البيانات',
  description = 'حدث خطأ مؤقت أثناء جلب المعلومات، يرجى المحاولة مجدداً.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-white border border-[#B54747]/30 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-[#B54747]/10 text-[#B54747] flex items-center justify-center">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="space-y-1 max-w-xs">
        <h3 className="text-sm font-bold text-[#252A28]">{title}</h3>
        <p className="text-xs text-[#78827D]">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

export function OfflineBanner({ onReconnect }: { onReconnect?: () => void }) {
  return (
    <div
      role="status"
      className="bg-[#252A28] text-white px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-[#D5A64A] shrink-0" />
        <span>لا يوجد اتصال بالإنترنت حالياً — يتم عرض البيانات المحفوظة محلياً.</span>
      </div>
      {onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          className="text-[#D5A64A] font-bold underline shrink-0 cursor-pointer"
        >
          تحديث الاتصال
        </button>
      )}
    </div>
  );
}

/* 11. Modal & Confirm Dialog with Smooth Overlay Transition */
export function ModalDialog({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            key="modal-panel"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E4E7E2] rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#E4E7E2] flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[#252A28]">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق النافذة"
                className="w-8 h-8 rounded-lg hover:bg-[#F6F4EE] flex items-center justify-center text-[#78827D] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
            {footer && (
              <div className="px-5 py-3.5 bg-[#F6F4EE] border-t border-[#E4E7E2] flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* 12. Pagination */
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E4E7E2]">
      <span className="text-xs text-[#78827D] tabular-nums">
        صفحة {page} من {totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="الصفحة السابقة"
          className="h-9 px-3 rounded-lg border border-[#E4E7E2] bg-white text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          السابق
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="الصفحة التالية"
          className="h-9 px-3 rounded-lg border border-[#E4E7E2] bg-white text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
        >
          التالي
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function StoreIconBadge() {
  return (
    <span className="w-8 h-8 rounded-lg bg-[#E6EFEA] text-[#153D35] flex items-center justify-center">
      <StoreIcon className="w-4 h-4" />
    </span>
  );
}
