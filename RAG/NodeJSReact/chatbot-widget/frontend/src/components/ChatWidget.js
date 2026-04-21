import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Plus, Send, MoreVertical, LayoutTemplate, BarChart2, PieChart, FileText, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

const themes = {
  light: {
    container: 'bg-white text-gray-900 border-gray-200 shadow-2xl',
    header: 'bg-gray-50/80 border-b border-gray-200',
    body: 'bg-white', // Clean white background for chat
    input: 'bg-gray-100 border-t border-gray-200',
    bubbleAssistant: 'bg-gray-100 border-gray-200 text-gray-800',
  },
  dark: {
    container: 'bg-[#1a1a1a] text-gray-100 border-white/10 shadow-2xl ring-1 ring-white/5',
    header: 'bg-[#242424] border-b border-white/10', // Lighter header
    body: 'bg-[#0f0f0f]', // Deep black body for contrast
    input: 'bg-[#242424] border-t border-white/10', // Lighter input area
    bubbleAssistant: 'bg-[#2d2d2d] border-white/10 text-gray-200',
  },
  'dark-gold': {
    container: 'bg-[#121212] text-[#d4af37] border-[#d4af37]/30 shadow-2xl',
    header: 'bg-[#1c1c1c] border-b border-[#d4af37]/20',
    body: 'bg-[#0a0a0a]',
    input: 'bg-[#1c1c1c] border-t border-[#d4af37]/20',
    bubbleAssistant: 'bg-[#1c1c1c] border-[#d4af37]/20 text-[#fcf6ba]',
  },
  'light-gold': {
    container: 'bg-[#fdfbf7] text-[#5e4b1f] border-[#d4af37]/40 shadow-2xl ring-1 ring-[#d4af37]/20',
    header: 'bg-[#f5f0e1] border-[#d4af37]/30 text-[#8a6a24]', // Slightly darker parchment
    body: 'bg-[#fffcf0]', // Very light cream
    input: 'bg-[#f5f0e1] border-[#d4af37]/30', // Matches header
    bubbleAssistant: 'bg-white border-[#d4af37]/30 text-[#5e4b1f] shadow-sm',
    bubbleUser: 'bg-[#8a6a24] text-white border-[#5e4b1f]/20', // Deep bronze user bubble
  }
};

export default function ChatWidget({ theme = 'light' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const messagesEndRef = useRef(null);

  const themeClasses = themes[theme] || themes.light;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input, tool: selectedTool };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowTools(false);
    setIsThinking(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, tool: userMsg.tool })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Oops! ${error.message}` }]);
    } finally {
      setIsThinking(false);
      setSelectedTool(null);
    }
  };

  const renderContent = (content) => {
    // Basic parser to detect chart JSON inside markdown
    const chartRegex = /```json chart\n([\s\S]*?)\n```/;
    const match = content.match(chartRegex);

    if (match) {
      const textBefore = content.replace(chartRegex, '');
      let chartData = [];
      try { chartData = JSON.parse(match[1]); } catch (e) {}

      return (
        <div>
          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose max-w-none dark:prose-invert">
            {textBefore}
          </ReactMarkdown>
          {chartData.length > 0 && (
            <div className="h-64 w-full mt-4 bg-white/5 p-4 rounded-lg">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      );
    }

    return <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose max-w-none dark:prose-invert">{content}</ReactMarkdown>;
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all z-50 border border-white/20 ring-4 ring-blue-600/10"
      >
        <MessageSquare size={28} />
      </button>
    );
  }

  return (
    <div className={`fixed inset-4 md:inset-10 z-50 flex flex-col rounded-2xl overflow-hidden border ${themeClasses.container}`}>
      
      {/* 1. HEADER: Solid Surface Color */}
      <div className={`p-5 flex justify-between items-center backdrop-blur-md z-10 ${themeClasses.header}`}>
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            AI Assistant 
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          </h2>
          <p className="text-xs opacity-60 font-medium uppercase tracking-widest">Enterprise Knowledge Base</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* 2. CHAT AREA: The Deepest Layer */}
      <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${themeClasses.body}`}>
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${
              m.role === 'user' 
                ? (theme.includes('gold') ? themeClasses.bubbleUser : 'bg-blue-600 text-white border-blue-500')
                : themeClasses.bubbleAssistant
            }`}>
              {m.role === 'user' && m.tool && (
                <div className="text-[10px] font-bold uppercase tracking-tighter opacity-70 mb-2 bg-black/20 w-fit px-1.5 rounded">
                  {m.tool}
                </div>
              )}
              {renderContent(m.content)}
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div className="flex justify-start">
            <div className={`rounded-2xl p-4 animate-pulse border ${themeClasses.bubbleAssistant}`}>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. INPUT AREA: Elevated Surface Color */}
      <div className={`p-6 relative ${themeClasses.input}`}>
        {/* Show label Selected Tool (Badge) */}
        {selectedTool && (
          <div className="absolute -top-12 left-6 flex items-center gap-2 animate-in slide-in-from-bottom-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold shadow-sm
              ${theme.includes('gold') 
                ? 'bg-[#d4af37]/20 border-[#d4af37]/50 text-[#d4af37]' 
                : 'bg-blue-500/10 border-blue-500/30 text-blue-500'}`}
            >
              <span className="uppercase tracking-wider">Mode: {selectedTool}</span>
              
              {/* Button X to remove the selected tool */}
              <button 
                onClick={() => setSelectedTool(null)}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                title="Remove tool"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Shadow Overlay to separate from chat */}
        <div className="absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        {showTools && (
          <div className={`absolute bottom-full left-6 mb-4 p-2 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border-2 z-20 min-w-[220px] 
            ${theme === 'light' ? 'bg-gray-200 border-gray-200' : ''}
            ${theme === 'dark' ? 'bg-[#242424] border-white/20' : ''}
            ${theme === 'dark-gold' ? 'bg-[#1c1c1c] border-[#d4af37]/50' : ''}
            ${theme === 'light-gold' ? 'bg-[#f5f0e1] border-[#d4af37]/60' : ''}
          `}>
            <div className="text-[10px] font-bold px-3 py-2 opacity-50 uppercase tracking-widest">
              Reports & Formats
            </div>
            {[
              { name: 'Table Report', icon: LayoutTemplate },
              { name: 'Chart Report', icon: BarChart2 },
              /*{ name: 'Diagram', icon: PieChart },
              { name: 'Infographics', icon: FileText },*/
              { name: 'Insights Report', icon: Lightbulb }
            ].map(tool => (
              <button 
                key={tool.name}
                onClick={() => { setSelectedTool(tool.name); setShowTools(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/10 rounded-lg transition-colors">
                <tool.icon size={16} /> {tool.name}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex items-end gap-3">
          <button 
            onClick={() => setShowTools(!showTools)}
            className={`p-3 rounded-xl transition-all active:scale-95 border ${
              selectedTool ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
            }`}>
            <Plus size={22} />
          </button>

          <div className="flex-1 bg-black/20 rounded-xl border border-white/10 focus-within:border-blue-500/50 transition-all flex items-end">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}              
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="w-full bg-transparent p-3.5 max-h-40 min-h-[52px] outline-none resize-none text-[15px]"
              placeholder={selectedTool ? `Ask a question (formatting as ${selectedTool})...` : "Ask anything..."}
              rows={1}
            />
          </div>

          <button 
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="p-3.5 rounded-xl bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            <Send size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}