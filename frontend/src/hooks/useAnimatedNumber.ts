import { useEffect, useRef, useState } from 'react';

export interface AnimatedNumberOptions {
  duration?: number;
  precision?: number;
}

export function useAnimatedNumber(target: number, options?: AnimatedNumberOptions) {
  const { duration = 600, precision = 0 } = options ?? {};
  const [value, setValue] = useState(target);
  const previous = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    if (target === previous.current || duration === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target);
      previous.current = target;
      return;
    }
    const start = previous.current;
    const diff = target - start;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const startTime = now;

    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = start + diff * progress;
      const factor = Math.pow(10, precision);
      const rounded = Math.round(current * factor) / factor;
      setValue(rounded);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        previous.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration, precision]);

  return value;
}
