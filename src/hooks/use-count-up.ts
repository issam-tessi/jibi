import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

/** Animates a number from 0 up to `target` (ease-out), e.g. for a dramatic total. */
export function useCountUp(target: number, duration = 1400, delay = 0) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      start ||= now + delay;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay, reduced]);

  return reduced ? target : value;
}
