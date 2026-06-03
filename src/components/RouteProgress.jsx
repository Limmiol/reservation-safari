import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteProgress() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef([]);

  const clear = () => timers.current.forEach(clearTimeout);

  useEffect(() => {
    clear();
    setProgress(0);
    setVisible(true);

    const t1 = setTimeout(() => setProgress(40), 30);
    const t2 = setTimeout(() => setProgress(70), 200);
    const t3 = setTimeout(() => setProgress(88), 500);
    const t4 = setTimeout(() => {
      setProgress(100);
      const t5 = setTimeout(() => setVisible(false), 300);
      timers.current.push(t5);
    }, 700);

    timers.current = [t1, t2, t3, t4];
    return clear;
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9998,
        pointerEvents: 'none',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
      }}
    >
      <div
        style={{
          height: '100%',
          background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
          width: `${progress}%`,
          transition:
            progress === 100
              ? 'width 0.2s ease, opacity 0.3s ease'
              : 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: progress === 100 ? 0 : 1,
          borderRadius: '0 2px 2px 0',
          boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
        }}
      />
    </div>
  );
}
