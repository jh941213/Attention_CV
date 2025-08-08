'use client'

import { useRef, useEffect, useState } from 'react';

interface FadeContentProps {
  children: React.ReactNode
  blur?: boolean
  duration?: number
  easing?: string
  delay?: number
  threshold?: number
  initialOpacity?: number
  className?: string
}

const FadeContent: React.FC<FadeContentProps> = ({
  children,
  blur = false,
  duration = 1000,
  easing = 'ease-out',
  delay = 0,
  threshold = 0.1,
  initialOpacity = 0,
  className = ''
}) => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (ref.current) {
            observer.unobserve(ref.current);
          }
          setTimeout(() => {
            setInView(true);
          }, delay);
        }
      },
      { threshold }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [threshold, delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : initialOpacity,
        transform: inView ? 'translateX(0px) scale(1)' : 'translateX(20px) scale(0.95)',
        transition: `all ${duration}ms ${easing}`,
        filter: blur ? (inView ? 'blur(0px)' : 'blur(8px)') : 'none',
      }}
    >
      {children}
    </div>
  );
};

export default FadeContent;