import { useState, useEffect, useMemo } from 'react';

const DEFAULT_INTERVAL_MS = 2200;

/**
 * Advances through `steps` while `active` is true; stays on the last step until the request completes.
 *
 * @param {boolean} active
 * @param {readonly string[]} steps
 * @param {number} [intervalMs]
 * @returns {{ label: string, index: number, total: number }}
 */
export function useThinkingSteps(active, steps, intervalMs = DEFAULT_INTERVAL_MS) {
  const safeSteps = useMemo(() => {
    if (Array.isArray(steps) && steps.length > 0) return steps;
    return ['Working…'];
  }, [steps]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return undefined;
    }

    setIndex(0);
    const tick = setInterval(() => {
      setIndex((i) => Math.min(i + 1, safeSteps.length - 1));
    }, intervalMs);

    return () => clearInterval(tick);
  }, [active, intervalMs, safeSteps]);

  const capped = Math.min(index, safeSteps.length - 1);
  return {
    label: safeSteps[capped] ?? safeSteps[0],
    index: capped,
    total: safeSteps.length,
  };
}
