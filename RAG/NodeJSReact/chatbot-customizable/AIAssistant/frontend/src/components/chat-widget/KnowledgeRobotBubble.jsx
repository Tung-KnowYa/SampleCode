import React, { useId } from 'react';
import { KNOWLEDGE_ROBOT_W, KNOWLEDGE_ROBOT_H } from './knowledgeRobotDimensions';

const EMERALD = '#10b981';
const EMERALD_DIM = 'rgba(16, 185, 129, 0.45)';

/**
 * Draggable launcher — compact robot mascot (dark body + emerald accents).
 * `useId` keeps gradient/filter IDs unique if multiple instances exist.
 */
export function KnowledgeRobotBubble({ isDragging }) {
  const uid = `n${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const gidEmerald = `kb-robot-emerald-${uid}`;
  const gidEmeraldSoft = `kb-robot-emerald-soft-${uid}`;
  const gidBody = `kb-robot-body-${uid}`;
  const gidVisor = `kb-robot-visor-${uid}`;
  const gidShine = `kb-robot-shine-${uid}`;
  const fidGlow = `kb-robot-glow-${uid}`;
  const fidVisorGlow = `kb-robot-visor-glow-${uid}`;

  const dragClass = isDragging ? 'scale-[1.06]' : '';

  return (
    <div
      className={`relative flex flex-col items-center transition-transform duration-300 ease-out ${dragClass}`}
      style={{
        width: KNOWLEDGE_ROBOT_W,
        height: KNOWLEDGE_ROBOT_H,
        filter:
          'drop-shadow(0 12px 28px rgba(0,0,0,0.65)) drop-shadow(0 4px 12px rgba(16,185,129,0.18))',
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 80 104"
        width={KNOWLEDGE_ROBOT_W}
        height={KNOWLEDGE_ROBOT_H}
        className="shrink-0"
        role="img"
        aria-label="Knowledge assistant"
      >
        <defs>
          <linearGradient id={gidEmerald} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d1fae5" />
            <stop offset="35%" stopColor="#34d399" />
            <stop offset="55%" stopColor={EMERALD} />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
          <linearGradient id={gidEmeraldSoft} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(209,250,229,0.95)" />
            <stop offset="100%" stopColor="rgba(6,95,70,0.85)" />
          </linearGradient>
          <linearGradient id={gidBody} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#080808" />
          </linearGradient>
          <linearGradient id={gidVisor} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0a0a" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>
          <radialGradient id={gidShine} cx="35%" cy="28%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id={fidGlow} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={fidVisorGlow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Floating Head */}
        <path
          d="M18 34C18 24.0589 26.0589 16 36 16H44C53.9411 16 62 24.0589 62 34V40C62 44.4183 58.4183 48 54 48H26C21.5817 48 18 44.4183 18 40V34Z"
          fill={`url(#${gidBody})`}
          stroke={EMERALD}
          strokeWidth="1.5"
        />

        {/* Visor */}
        <path
          d="M22 30C22 27.7909 23.7909 26 26 26H54C56.2091 26 58 27.7909 58 30V38C58 40.2091 56.2091 42 54 42H26C23.7909 42 22 40.2091 22 38V30Z"
          fill={`url(#${gidVisor})`}
          stroke={`${EMERALD}44`}
          strokeWidth="1"
        />

        {/* Visor Light Stripe */}
        <path
          d="M26 32H54"
          stroke={EMERALD}
          strokeWidth="2"
          strokeLinecap="round"
          filter={`url(#${fidVisorGlow})`}
          opacity="0.8"
        >
          <animate
            attributeName="opacity"
            values="0.4;0.9;0.4"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>

        {/* Eyes (Scanning dots) */}
        <circle cx="32" cy="34" r="1.5" fill={EMERALD} filter={`url(#${fidGlow})`} />
        <circle cx="48" cy="34" r="1.5" fill={EMERALD} filter={`url(#${fidGlow})`} />

        {/* Neck / Connector */}
        <rect x="36" y="48" width="8" height="6" fill={EMERALD} opacity="0.6" />

        {/* Body (Egg/Pod shape) */}
        <path
          d="M10 70C10 58.9543 18.9543 50 30 50H50C61.0457 50 70 58.9543 70 70V84C70 92.8366 62.8366 100 54 100H26C17.1634 100 10 92.8366 10 84V70Z"
          fill={`url(#${gidBody})`}
          stroke={EMERALD}
          strokeWidth="1.5"
        />

        {/* Chest Plate / Core */}
        <circle
          cx="40"
          cy="75"
          r="12"
          fill="rgba(16,185,129,0.05)"
          stroke={EMERALD}
          strokeWidth="1"
          strokeDasharray="2 4"
        />
        <circle
          cx="40"
          cy="75"
          r="6"
          fill={EMERALD}
          filter={`url(#${fidGlow})`}
          opacity="0.9"
        >
          <animate
            attributeName="r"
            values="5;7;5"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>

        {/* KnowYa Text on Chest */}
        <text
          x="40"
          y="94"
          textAnchor="middle"
          fill={EMERALD}
          fontSize="8"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight="700"
          letterSpacing="0.05em"
          opacity="0.8"
        >
          KnowYa
        </text>

        {/* Shine Overlay */}
        <path
          d="M25 20C25 20 30 18 40 18C50 18 55 20 55 20"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.1"
        />
      </svg>
    </div>
  );
}
