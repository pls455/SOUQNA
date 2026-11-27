import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface ScrollContainerCtxValue {
  containerRef: React.RefObject<HTMLDivElement | null> | null;
  isFrameScrollable: boolean;
}

const ScrollContainerContext = createContext<ScrollContainerCtxValue>({
  containerRef: null,
  isFrameScrollable: false,
});

export function ScrollContainerProvider({
  containerRef,
  enabled,
  children,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [isFrameScrollable, setIsFrameScrollable] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!enabled || !el) {
      setIsFrameScrollable(false);
      return;
    }

    const check = () => {
      const style = window.getComputedStyle(el);
      const overflows =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.clientHeight > 0 &&
        el.scrollHeight > el.clientHeight + 2;
      setIsFrameScrollable(overflows);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [containerRef, enabled]);

  return (
    <ScrollContainerContext.Provider value={{ containerRef, isFrameScrollable }}>
      {children}
    </ScrollContainerContext.Provider>
  );
}

export function useScrollContainer() {
  return useContext(ScrollContainerContext);
}

/* 1. Hero Reveal */
export function HeroReveal({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* 2. Text Mask Reveal for Headlines */
export function TextMaskReveal({
  children,
  delay = 0,
  trigger = 'inView',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  trigger?: 'mount' | 'inView';
  className?: string;
}) {
  const { containerRef, isFrameScrollable } = useScrollContainer();

  return (
    <span className={`block overflow-hidden ${className}`}>
      <motion.span
        className="block"
        initial={{ y: '105%', opacity: 0 }}
        {...(trigger === 'mount'
          ? { animate: { y: '0%', opacity: 1 } }
          : {
              whileInView: { y: '0%', opacity: 1 },
              viewport: {
                once: true,
                amount: 0.1,
                root: isFrameScrollable && containerRef ? containerRef : undefined,
              },
            })}
        transition={{ duration: 0.44, delay, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* 3. Scroll Reveal for Page Sections */
export function ScrollReveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { containerRef, isFrameScrollable } = useScrollContainer();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{
        once: true,
        amount: 0.08,
        root: isFrameScrollable && containerRef ? containerRef : undefined,
      }}
      transition={{ duration: 0.42, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* 4. Parallax Wrapper for Large Feature Visuals */
export function ParallaxImage({
  children,
  className = '',
  intensity = 18,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const { containerRef, isFrameScrollable } = useScrollContainer();

  const { scrollYProgress } = useScroll({
    target: targetRef,
    container: isFrameScrollable && containerRef ? containerRef : undefined,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [-intensity, intensity]);

  return (
    <div ref={targetRef} className={`relative overflow-hidden ${className}`}>
      <motion.div
        style={{ y }}
        className="w-full h-full scale-[1.12] will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* 5. Full-Screen Brand Green Page Transition Curtain (#153D35, slow & graceful ~1.05s) */
export function GlobalGreenCurtain({ transitionKey }: { transitionKey: string }) {
  const prefersReduced = useReducedMotion();
  const prevKeyRef = useRef(transitionKey);
  const [burstId, setBurstId] = useState<number | null>(null);

  useEffect(() => {
    if (prevKeyRef.current === transitionKey) return;
    prevKeyRef.current = transitionKey;
    if (prefersReduced) return;

    const id = Date.now() + Math.random();
    setBurstId(id);
    const timer = window.setTimeout(() => {
      setBurstId((curr) => (curr === id ? null : curr));
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [transitionKey, prefersReduced]);

  return (
    <AnimatePresence>
      {burstId !== null && (
        <motion.div
          key={burstId}
          data-testid="green-page-curtain"
          aria-hidden="true"
          initial={{ y: '100%' }}
          animate={{ y: ['100%', '0%', '0%', '-100%'] }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 1.05,
            times: [0, 0.3, 0.7, 1],
            ease: [0.22, 1, 0.36, 1],
          }}
          className="fixed inset-0 z-[90] bg-[#153D35] pointer-events-none flex items-center justify-center will-change-transform"
        >
          <motion.div
            initial={{ scale: 0.92 }}
            animate={{ scale: [0.92, 1, 1, 0.98] }}
            transition={{ duration: 1.05, times: [0, 0.3, 0.72, 1], ease: EASE_OUT_EXPO }}
            className="flex flex-col items-center gap-3 text-white"
          >
            <span className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-lg flex items-center justify-center">
              <img
                src="/assets/aistudio/e2311750-ea74-11f1-9078-8df5825b4959_6a8ff055.png"
                alt=""
                className="w-full h-full object-contain"
              />
            </span>
            <span className="text-2xl font-extrabold tracking-tight">سوقنا</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* 6. Page Transition Container (mounts immediately behind the green curtain) */
export function PageTransition({
  screenKey,
  children,
  className = '',
}: {
  screenKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={screenKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, delay: 0.28, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* 7. Smooth Menu Overlay for Mobile / Navigation Drawers */
export function SmoothMenuOverlay({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
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
          key="menu-overlay-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-[#252A28]/40 backdrop-blur-[3px] flex flex-col justify-start"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            key="menu-overlay-panel"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-b border-[#E4E7E2] shadow-xl rounded-b-2xl p-4 space-y-3 max-h-[82vh] overflow-y-auto"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
