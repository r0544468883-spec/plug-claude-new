import { useRef, useEffect, useState } from 'react';

/**
 * LinkedIn-style sticky sidebar.
 *
 * Works inside an overflow-auto scroll container.
 * - If sidebar fits in viewport: sticks to top
 * - If sidebar is taller: sticks when its bottom reaches viewport bottom
 *
 * `topOffset` = height of any sticky headers INSIDE the scroll container
 * (e.g. the social header bar that's sticky within the <main>).
 */
export function useStickySidebar(topOffset = 96) {
  const ref = useRef<HTMLDivElement>(null);
  const [stickyTop, setStickyTop] = useState(topOffset);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const calculate = () => {
      const sidebarH = el.scrollHeight;
      // The scroll container is the <main> with overflow-auto
      const scrollParent = el.closest('[data-dashboard-scroll]') as HTMLElement;
      const viewportH = scrollParent ? scrollParent.clientHeight : window.innerHeight;
      const availableH = viewportH - topOffset;

      if (sidebarH <= availableH) {
        // Fits in visible area — stick to top
        setStickyTop(topOffset);
      } else {
        // Taller than visible area — stick when bottom aligns with container bottom
        setStickyTop(viewportH - sidebarH - 16);
      }
    };

    // Recalculate after content loads
    calculate();
    const timer = setTimeout(calculate, 500);

    const observer = new ResizeObserver(calculate);
    observer.observe(el);
    window.addEventListener('resize', calculate);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', calculate);
    };
  }, [topOffset]);

  return {
    ref,
    style: { position: 'sticky' as const, top: `${stickyTop}px` },
  };
}
