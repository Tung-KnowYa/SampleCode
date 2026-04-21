import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatWidget from './components/ChatWidget';
import tailwindStyles from './styles.css';

class AIChatbotWidget extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = tailwindStyles;
    shadow.appendChild(styleSheet);

    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    const theme = this.getAttribute('theme') || 'light';

    const root = createRoot(mountPoint);
    root.render(<ChatWidget theme={theme} />);
  }
}

if (!customElements.get('ai-chatbot-widget')) {
  customElements.define('ai-chatbot-widget', AIChatbotWidget);
}