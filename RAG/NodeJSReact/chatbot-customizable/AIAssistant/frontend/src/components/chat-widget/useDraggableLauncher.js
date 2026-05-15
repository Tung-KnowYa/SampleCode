import { useState, useRef, useEffect, useCallback } from 'react';
import { KNOWLEDGE_ROBOT_W, KNOWLEDGE_ROBOT_H } from './knowledgeRobotDimensions';

const DRAG_THRESHOLD_PX = 8;
const EDGE_PAD = 12;
/** Extra gap below the viewport top for `center-top` preset (visual margin). */
const CENTER_TOP_MARGIN = 20;

function clampLauncherPosition(x, y) {
  if (typeof window === 'undefined') return { x, y };
  const hw = KNOWLEDGE_ROBOT_W / 2 + EDGE_PAD;
  const hh = KNOWLEDGE_ROBOT_H / 2 + EDGE_PAD;
  return {
    x: Math.min(Math.max(hw, x), window.innerWidth - hw),
    y: Math.min(Math.max(hh, y), window.innerHeight - hh),
  };
}

/**
 * @param {'center-top' | 'bottom-right'} preset
 * @param {number | undefined} defaultX — pixel X of launcher center (optional override)
 * @param {number | undefined} defaultY — pixel Y of launcher center (optional override)
 */
export function resolveLauncherPosition(preset, defaultX, defaultY) {
  if (typeof window === 'undefined') return { x: 120, y: 120 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  let x;
  let y;
  if (preset === 'bottom-right') {
    x = w - KNOWLEDGE_ROBOT_W - 28;
    y = h - KNOWLEDGE_ROBOT_H - 36;
  } else {
    x = w / 2;
    y = KNOWLEDGE_ROBOT_H / 2 + EDGE_PAD + CENTER_TOP_MARGIN;
  }
  if (typeof defaultX === 'number' && Number.isFinite(defaultX)) x = defaultX;
  if (typeof defaultY === 'number' && Number.isFinite(defaultY)) y = defaultY;
  return clampLauncherPosition(x, y);
}

const noopHandlers = {
  onPointerDown: undefined,
  onPointerMove: undefined,
  onPointerUp: undefined,
  onPointerCancel: undefined,
};

/**
 * Draggable fixed launcher: small movement toggles `onTap`, drag updates position.
 * @param {object} opts
 * @param {() => void} opts.onTap
 * @param {boolean} [opts.enabled] — set `false` when the robot is hidden (external launcher).
 * @param {'center-top' | 'bottom-right'} [opts.preset] — default placement when not overridden by `defaultX` / `defaultY`.
 * @param {number | undefined} [opts.defaultX] — optional pixel X of launcher center (HTML: `launcher-x`).
 * @param {number | undefined} [opts.defaultY] — optional pixel Y of launcher center (HTML: `launcher-y`).
 */
export function useDraggableLauncher({
  onTap,
  enabled = true,
  preset = 'center-top',
  defaultX,
  defaultY,
}) {
  const [launcherPos, setLauncherPos] = useState(() =>
    resolveLauncherPosition(preset, defaultX, defaultY)
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    setLauncherPos(resolveLauncherPosition(preset, defaultX, defaultY));
    const onResize = () => {
      setLauncherPos((p) => clampLauncherPosition(p.x, p.y));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [enabled, preset, defaultX, defaultY]);

  const onPointerDown = useCallback(
    (e) => {
      if (!enabled) return;
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        originX: launcherPos.x,
        originY: launcherPos.y,
        moved: false,
      };
    },
    [enabled, launcherPos.x, launcherPos.y]
  );

  const onPointerMove = useCallback((e) => {
    if (!enabled) return;
    const d = dragRef.current;
    if (d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) d.moved = true;
    if (d.moved) {
      setIsDragging(true);
      setLauncherPos(clampLauncherPosition(d.originX + dx, d.originY + dy));
    }
  }, [enabled]);

  const onPointerUp = useCallback(
    (e) => {
      if (!enabled) return;
      const d = dragRef.current;
      if (d.pointerId !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragRef.current = {
        pointerId: null,
        startClientX: 0,
        startClientY: 0,
        originX: 0,
        originY: 0,
        moved: false,
      };
      setIsDragging(false);
      if (!d.moved) onTap();
    },
    [enabled, onTap]
  );

  const onPointerCancel = useCallback((e) => {
    if (!enabled) return;
    setIsDragging(false);
    dragRef.current = {
      pointerId: null,
      startClientX: 0,
      startClientY: 0,
      originX: 0,
      originY: 0,
      moved: false,
    };
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  return {
    launcherPos,
    isDragging,
    launcherPointerHandlers: enabled
      ? {
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel,
        }
      : noopHandlers,
  };
}
