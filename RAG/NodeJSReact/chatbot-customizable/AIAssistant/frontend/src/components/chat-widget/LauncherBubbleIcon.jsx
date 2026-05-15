import React from 'react';

/**
 * Modern AI Chat Launcher Icon: Rounded speech bubble with a sparkle motif.
 */
export function LauncherBubbleIcon({ size = 28, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M26 15C26 20.5228 21.5228 25 16 25C14.4754 25 13.036 24.6589 11.75 24.0485L6 26L7.9515 20.25C7.34106 18.964 7 17.5246 7 16C7 10.4772 11.4772 6 17 6C21.9706 6 26 10.0294 26 15Z"
        fill="currentColor"
      />
      <path
        d="M16 11L17.2 13.8L20 15L17.2 16.2L16 19L14.8 16.2L12 15L14.8 13.8L16 11Z"
        fill="white"
        opacity="0.9"
      />
    </svg>
  );
}
