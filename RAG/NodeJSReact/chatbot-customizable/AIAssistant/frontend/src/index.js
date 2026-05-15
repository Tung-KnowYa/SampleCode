import React, { createRef } from 'react';
import { createRoot } from 'react-dom/client';
import DataChatbotWidget from './components/DataChatbotWidget';
import KnowledgeChatbotWidget from './components/KnowledgeChatbotWidget';
import {
  DEFAULT_API_BASE_AI_CHATBOT,
  DEFAULT_API_BASE_KNOWLEDGE_CHATBOT,
} from './components/chat-widget/defaultApiBases';
import tailwindStyles from './styles.css';

function injectShadowStyles(shadow) {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = tailwindStyles;
  shadow.appendChild(styleSheet);
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);
  return mountPoint;
}

/**
 * If `api-base` is absent, use widget-specific default. If present (even empty string),
 * use the attribute value (trimmed) so `api-base=""` keeps same-origin `/api/chat` only.
 */
function readApiBaseAttribute(el, defaultWhenAttributeMissing) {
  if (!el.hasAttribute('api-base')) {
    return (defaultWhenAttributeMissing || '').trim();
  }
  return (el.getAttribute('api-base') || '').trim();
}

/** `floating` = built-in launcher; `external` = hide launcher, use element `.open()` / `.close()` / `.toggle()` */
function readLauncherMode(el) {
  const v = (el.getAttribute('launcher') || 'floating').trim().toLowerCase();
  return v === 'external' ? 'external' : 'floating';
}

/** Plain-text first message sent when the panel opens (combined with programmatic `open('…')`; imperative prompt wins when both are set). */
function readInitialPromptAttribute(el) {
  return el.getAttribute('initial-prompt') ?? '';
}

/** Left chat session / history sidebar. `history-sidebar="false"` hides it for a single-thread-style panel. Default: visible. */
function readHistorySidebarAttribute(el) {
  if (!el.hasAttribute('history-sidebar')) return true;
  const v = (el.getAttribute('history-sidebar') || '').trim().toLowerCase();
  if (v === '' || v === 'true' || v === '1' || v === 'on' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'off' || v === 'no' || v === 'hidden') return false;
  return true;
}

/** `center-top` | `bottom-right` — default anchor for the knowledge-only floating launcher. */
function readLauncherPositionPreset(el) {
  const v = (el.getAttribute('launcher-position') || 'center-top').trim().toLowerCase();
  return v === 'bottom-right' ? 'bottom-right' : 'center-top';
}

/** Pixel coordinate for launcher center; attribute omitted or invalid → `undefined` (use preset). */
function readLauncherCoordAttribute(el, attrName) {
  const raw = el.getAttribute(attrName);
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** `none` | `panel-left` — align floating launcher to the left edge of the knowledge panel. */
function readLauncherAnchor(el) {
  const v = (el.getAttribute('launcher-anchor') || 'none').trim().toLowerCase();
  return v === 'panel-left' ? 'panel-left' : 'none';
}

/** Gap (px) between panel and launcher when `launcher-anchor="panel-left"`. */
function readLauncherPanelGap(el) {
  const raw = el.getAttribute('launcher-panel-gap');
  if (raw == null || raw === '') return 24;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 24;
}

/** Exact primary-key pin for Data tab (JSON `itemId`). */
function readItemIdAttribute(el) {
  const v = el.getAttribute('item-id');
  if (v == null) return '';
  return String(v).trim();
}

/** Optional operational table (public schema); JSON `itemDbTbl`. */
function readItemDbTblAttribute(el) {
  const v = el.getAttribute('item-db-tbl');
  if (v == null) return '';
  return String(v).trim();
}

/** Optional id column name; JSON `itemDbColId`. */
function readItemDbColIdAttribute(el) {
  const v = el.getAttribute('item-db-col-id');
  if (v == null) return '';
  return String(v).trim();
}

class AIChatbotWidget extends HTMLElement {
  constructor() {
    super();
    this._mount = null;
    /** @type {import('react-dom/client').Root | null} */
    this._root = null;
    this._apiRef = createRef();
  }

  static get observedAttributes() {
    return [
      'theme',
      'api-base',
      'launcher',
      'initial-prompt',
      'item-id',
      'item-db-tbl',
      'item-db-col-id',
      'history-sidebar',
    ];
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open' });
      this._mount = injectShadowStyles(shadow);
      this._root = createRoot(this._mount);
    } else if (!this._root && this._mount) {
      this._root = createRoot(this._mount);
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._root) this._render();
  }

  disconnectedCallback() {
    this._root?.unmount();
    this._root = null;
  }

  /**
   * Open the chat panel (works with `launcher="external"`).
   * @param {string | { prompt?: string }} [promptOrOpts] If set, sends this message immediately (same turn as opening).
   */
  open(promptOrOpts) {
    if (promptOrOpts == null) {
      this._apiRef.current?.open?.();
      return;
    }
    if (typeof promptOrOpts === 'string') {
      this._apiRef.current?.open?.(promptOrOpts);
      return;
    }
    this._apiRef.current?.open?.(promptOrOpts);
  }

  /** Close the chat panel. */
  close() {
    this._apiRef.current?.close?.();
  }

  /** Toggle the chat panel open/closed. */
  toggle() {
    this._apiRef.current?.toggle?.();
  }

  _render() {
    if (!this._root) return;
    const theme = this.getAttribute('theme') || 'light';
    const apiBase = readApiBaseAttribute(this, DEFAULT_API_BASE_AI_CHATBOT);
    const launcherMode = readLauncherMode(this);
    const initialPrompt = readInitialPromptAttribute(this);
    const itemId = readItemIdAttribute(this);
    const itemDbTbl = readItemDbTblAttribute(this);
    const itemDbColId = readItemDbColIdAttribute(this);
    const showHistorySidebar = readHistorySidebarAttribute(this);
    this._root.render(
      <DataChatbotWidget
        ref={this._apiRef}
        theme={theme}
        apiBase={apiBase}
        launcherMode={launcherMode}
        initialPrompt={initialPrompt}
        itemId={itemId}
        itemDbTbl={itemDbTbl}
        itemDbColId={itemDbColId}
        showHistorySidebar={showHistorySidebar}
      />
    );
  }
}

class KnowledgeChatbotWidgetElement extends HTMLElement {
  constructor() {
    super();
    this._mount = null;
    /** @type {import('react-dom/client').Root | null} */
    this._root = null;
    this._apiRef = createRef();
  }

  static get observedAttributes() {
    return [
      'theme',
      'api-base',
      'launcher',
      'initial-prompt',
      'launcher-position',
      'launcher-x',
      'launcher-y',
      'launcher-anchor',
      'launcher-panel-gap',
    ];
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open' });
      this._mount = injectShadowStyles(shadow);
      this._root = createRoot(this._mount);
    } else if (!this._root && this._mount) {
      this._root = createRoot(this._mount);
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._root) this._render();
  }

  disconnectedCallback() {
    this._root?.unmount();
    this._root = null;
  }

  /**
   * @param {string | { prompt?: string }} [promptOrOpts]
   */
  open(promptOrOpts) {
    if (promptOrOpts == null) {
      this._apiRef.current?.open?.();
      return;
    }
    if (typeof promptOrOpts === 'string') {
      this._apiRef.current?.open?.(promptOrOpts);
      return;
    }
    this._apiRef.current?.open?.(promptOrOpts);
  }

  close() {
    this._apiRef.current?.close?.();
  }

  toggle() {
    this._apiRef.current?.toggle?.();
  }

  _render() {
    if (!this._root) return;
    const theme = this.getAttribute('theme') || 'light-emerald';
    const apiBase = readApiBaseAttribute(this, DEFAULT_API_BASE_KNOWLEDGE_CHATBOT);
    const launcherMode = readLauncherMode(this);
    const initialPrompt = readInitialPromptAttribute(this);
    const launcherPosition = readLauncherPositionPreset(this);
    const launcherX = readLauncherCoordAttribute(this, 'launcher-x');
    const launcherY = readLauncherCoordAttribute(this, 'launcher-y');
    const launcherAnchor = readLauncherAnchor(this);
    const launcherPanelGap = readLauncherPanelGap(this);
    this._root.render(
      <KnowledgeChatbotWidget
        ref={this._apiRef}
        theme={theme}
        apiBase={apiBase}
        launcherMode={launcherMode}
        initialPrompt={initialPrompt}
        launcherPosition={launcherPosition}
        launcherX={launcherX}
        launcherY={launcherY}
        launcherAnchor={launcherAnchor}
        launcherPanelGap={launcherPanelGap}
      />
    );
  }
}

if (!customElements.get('ai-chatbot-widget')) {
  customElements.define('ai-chatbot-widget', AIChatbotWidget);
}

if (!customElements.get('knowledge-chatbot-widget')) {
  customElements.define('knowledge-chatbot-widget', KnowledgeChatbotWidgetElement);
}
