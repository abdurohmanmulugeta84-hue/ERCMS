/**
 * useScrollReveal — IntersectionObserver hook for scroll-triggered animations.
 *
 * Returns a ref to attach to any element. When that element enters the
 * viewport, the `inView` state flips to true so you can apply CSS classes.
 *
 * Usage:
 *   const { ref, inView } = useScrollReveal({ threshold: 0.15 });
 *   <div ref={ref} className={`reveal ${inView ? 'in-view' : ''}`} />
 */
import { useState, useEffect, useRef } from 'react';

export function useScrollReveal(options = {}) {
  const { threshold = 0.15, rootMargin = '0px 0px -50px 0px', once = true } = options;
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}

/**
 * useParallax — returns a Y offset based on scroll position for parallax effects.
 * The element moves slower than the scroll, creating depth.
 *
 * Usage:
 *   const { ref, offset } = useParallax(0.3);
 *   <div ref={ref} style={{ transform: `translateY(${offset}px)` }} />
 */
export function useParallax(speed = 0.3) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      // Only apply when element is near viewport
      if (rect.top < windowHeight && rect.bottom > 0) {
        const scrolled = windowHeight - rect.top;
        setOffset(scrolled * speed);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return { ref, offset };
}
