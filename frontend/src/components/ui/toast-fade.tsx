'use client'

import { useEffect, useState } from 'react';

interface ToastFadeProps {
  children: React.ReactNode
  blur?: boolean
  duration?: number
  easing?: string
  delay?: number
  initialOpacity?: number
  className?: string
}

const ToastFade: React.FC<ToastFadeProps> = ({
  children,
  blur = false,
  duration = 600,
  easing = 'ease-out',
  delay = 50,
  initialOpacity = 0,
  className = ''
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 컴포넌트가 마운트되면 바로 애니메이션 시작
    const timer = setTimeout(() => {
      setShow(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: show ? 1 : initialOpacity,
        transform: show 
          ? 'translateX(0px) translateY(0px) scale(1)' 
          : 'translateX(20px) translateY(12px) scale(0.94)',
        transition: `all ${duration}ms ${easing}`,
        filter: blur ? (show ? 'blur(0px)' : 'blur(5px)') : 'none',
      }}
    >
      {children}
    </div>
  );
};

export default ToastFade;