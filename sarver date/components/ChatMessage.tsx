
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageRole } from '../types';
import { Bot, User, AlertTriangle, Copy, Check, Pencil, X, Save, File as FileIcon, Play, Download, ChevronDown, Brain, Globe, Zap } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  onEdit?: (id: string, newText: string) => void;
  onRunCode?: (code: string, lang: string) => void;
  onImageClick?: (src: string) => void;
}

const CodeBlock = ({ code, lang, onRunCode }: { code: string, lang: string, onRunCode?: (code: string, lang: string) => void }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Map lang to extension
    const extMap: Record<string, string> = {
      javascript: 'js', js: 'js', typescript: 'ts', ts: 'ts',
      python: 'py', py: 'py', html: 'html', css: 'css',
      json: 'json', java: 'java', cpp: 'cpp', c: 'c',
      csharp: 'cs', cs: 'cs', go: 'go', rust: 'rs',
      php: 'php', ruby: 'rb', swift: 'swift', kotlin: 'kt',
      sql: 'sql', shell: 'sh', bash: 'sh', xml: 'xml',
      yaml: 'yaml', markdown: 'md', md: 'md'
    };
    const extension = extMap[lang.toLowerCase()] || 'txt';
    
    a.download = `dark_ai_script.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isRunnable = ['html', 'javascript', 'js', 'css'].includes(lang.toLowerCase());

  return (
    <div className="my-5 rounded-xl overflow-hidden glass-panel border border-white/10 shadow-lg group/code transition-all duration-300 transform hover:scale-[1.005]">
      <div className="flex items-center justify-between px-4 py-3 bg-[#000]/20 border-b border-white/5 select-none backdrop-blur-sm" onDoubleClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
           <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">{lang || 'TEXT'}</span>
           <div className={`text-gray-600 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
             <ChevronDown size={12} />
           </div>
        </div>
        <div className="flex items-center gap-2">
            {isRunnable && onRunCode && !isCollapsed && (
                <button 
                    onClick={() => onRunCode(code, lang)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-900/20 text-emerald-500 hover:bg-emerald-900/40 hover:text-emerald-400 transition-all text-xs font-bold border border-emerald-900/30"
                    title="Run Simulation"
                >
                    <Play size={10} fill="currentColor" />
                    <span>RUN</span>
                </button>
            )}
            <button 
                onClick={handleDownload}
                className="p-1.5 rounded-md hover:bg-white/10 text-gray-500 hover:text-blue-400 transition-colors"
                title="Download File"
            >
                <Download size={14} />
            </button>
            <button 
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                title="Copy Code"
            >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="relative animate-fade-in-down">
            <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre bg-[#0d0d0d] scrollbar-thin">
                <code>{code}</code>
            </pre>
        </div>
      )}
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onEdit, onRunCode, onImageClick }) => {
  const isUser = message.role === MessageRole.USER;
  const isSystem = message.role === MessageRole.SYSTEM;
  
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const copyText = () => {
    navigator.clipboard.writeText(message.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (editText.trim() !== message.text) {
      onEdit?.(message.id, editText);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(message.text || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-6 animate-message">
        <div className="text-xs text-red-400/90 font-mono bg-red-950/10 px-4 py-2 rounded-full border border-red-900/20 flex items-center gap-2">
          <AlertTriangle className="w-3 h-3" />
          {message.text}
        </div>
      </div>
    );
  }

  // --- DISCRETE MODE RENDERER ---
  // If this is an internal image request, show a sleek status instead of a chat bubble
  if (message.mode === 'thinker_image') {
    return (
      <div className="flex justify-center my-4 animate-pulse">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-900/10 border border-green-500/20 rounded-full text-green-400 text-xs font-mono tracking-widest">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
           INITIALIZING VISUALIZATION PROTOCOL...
        </div>
      </div>
    );
  }

  // --- LINK & MARKDOWN PARSER ---
  const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

  const renderTextWithLinks = (text: string, keyPrefix: string) => {
    if (!text) return null;
    try {
        // Combined Regex for:
        // 1. Links: [label](url)
        // 2. Bold: **text**
        // 3. Raw URLs: https://...
        const regex = /(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(https?:\/\/[^\s]+)/g;
        
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Push text before match
            if (match.index > lastIndex) {
                parts.push(<span key={`${keyPrefix}-text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
            }
            
            const fullMatch = match[0];

            if (fullMatch.startsWith('[')) {
                // MARKDOWN LINK: [label](url)
                const linkLabel = fullMatch.match(/\[([^\]]+)\]/)?.[1] || 'Link';
                const linkUrl = fullMatch.match(/\(([^)]+)\)/)?.[1] || '#';
                parts.push(
                    <a 
                    key={`${keyPrefix}-mdlink-${match.index}`} 
                    href={linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/30 transition-colors font-medium break-all cursor-pointer mx-1"
                    >
                    {linkLabel}
                    </a>
                );
            } else if (fullMatch.startsWith('**')) {
                // BOLD: **text**
                const boldText = fullMatch.slice(2, -2);
                parts.push(
                    <strong key={`${keyPrefix}-bold-${match.index}`} className="font-bold text-white mx-0.5">
                        {boldText}
                    </strong>
                );
            } else if (fullMatch.startsWith('http')) {
                // RAW URL: https://...
                parts.push(
                    <a 
                    key={`${keyPrefix}-rawlink-${match.index}`} 
                    href={fullMatch} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/30 transition-colors font-medium break-all cursor-pointer mx-1"
                    >
                    {fullMatch}
                    </a>
                );
            }

            lastIndex = regex.lastIndex;
        }

        // Push remaining text
        if (lastIndex < text.length) {
            parts.push(<span key={`${keyPrefix}-text-end`}>{text.substring(lastIndex)}</span>);
        }

        return parts.length > 0 ? parts : text;
    } catch (e) {
        return text;
    }
  };

  const renderContent = (inputRaw: string) => {
    // CLEANUP
    // 1. Remove IMG tags
    // 2. Remove single backticks around URLs
    // 3. Remove {{filename}} headers (but keep content if needed, or hide if completely redundant with attachment card)
    //    The user wants clean UI. We have an attachment card.
    //    Our format in App.tsx is: "{{filename}}\n" + content
    //    We should probably hide the whole block if it matches our injected format perfectly?
    //    Actually, let's just hiding the header "{{...}}" line, so the content remains VISIBLE as text?
    //    Wait, user said "Hide the content from UI" in previous turn (Step 2586).
    //    So we should hide the ENTIRE block if it starts with {{...}}?
    //    Let's try to remove the header "{{...}}" first. 
    //    Actually, if I hide the content, the user won't see what they sent.
    //    But they have the attachment card!
    //    So yes, hide the whole thing if it matches the pattern we injected.
    
    let text = (inputRaw || '')
        .replace(/\/\/\/IMG:[\s\S]*?\/\/\//g, '')
        .replace(/(?<!`)`\s*(https?:\/\/[^\s`]+)\s*`(?!`)/g, '$1');

    // Remove the injected file header and content IF it matches our pattern
    // Pattern: start of string {{filename}} ...
    // Note: We need to be careful not to hide user text *before* the file.
    // In App.tsx: `${userInputText}\n\n{{${filePayload.name}}}\n${filePayload.data}`
    // We want to keep userInputText, and remove the file part.
    text = text.replace(/\n\n\{\{.*?\}\}[\s\S]*/, ''); // Remove appended file part
    text = text.replace(/^\{\{.*?\}\}[\s\S]*/, '');   // Remove if it's ONLY file (no user text)

    text = text.trim();
    
    if (!text) return null;

    try {
        // 0. CHECK FOR SHADOW PROTOCOL IMAGES
        const shadowImgRegex = /<<<DARK_AI_IMG_START>>>(.*?)<<<DARK_AI_IMG_END>>>/s;
        const shadowMatch = text.match(shadowImgRegex);

        if (shadowMatch && shadowMatch[1]) {
           const rawContent = shadowMatch[1];
           
           if (rawContent.trim().startsWith('http')) {
               // URL Mode
               const parts = text.split(shadowImgRegex);
               return parts.map((part, index) => {
                  if (index === 1) { 
                     const src = rawContent.trim();
                     return (
                      <div key={`shadow-img-url`} className="my-2 rounded-lg overflow-hidden border border-green-500/50 shadow-[0_0_15px_rgba(0,255,0,0.2)] animate-fade-in group relative" dir="ltr">
                        <img 
                          src={src} 
                          alt="Dark AI Generated Content" 
                          className="w-full h-auto object-cover max-h-[500px] cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => onImageClick?.(src)}
                        />
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">Click to Zoom</span>
                        </div>
                      </div>
                     );
                  }
                  if (!part.trim()) return null;
                  const isRTL = isArabic(part);
                  return (
                    <div key={`text-part-${index}`} className={`whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {renderTextWithLinks(part, `text-${index}`)}
                    </div>
                  );
               });
           }

           // Base64 Mode
           const [mimeType, base64Data] = rawContent.split("|||");
           if (mimeType && base64Data) {
             const parts = text.split(shadowImgRegex);
             return parts.map((part, index) => {
                if (index === 1) {
                   const src = `data:${mimeType};base64,${base64Data.trim()}`;
                   return (
                    <div key={`shadow-img-base64`} className="my-2 rounded-lg overflow-hidden border border-green-500/50 shadow-[0_0_15px_rgba(0,255,0,0.2)] animate-fade-in" dir="ltr">
                      <img 
                        src={src} 
                        alt="Dark AI Generated Content" 
                        className="w-full h-auto object-cover max-h-[500px] cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => onImageClick?.(src)}
                      />
                    </div>
                   );
                }
                if (!part.trim()) return null;
                const isRTL = isArabic(part);
                return (
                    <div key={`text-part-${index}`} className={`whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {renderTextWithLinks(part, `text-${index}`)}
                    </div>
                );
             });
           }
        }

        // 1. Split images first (Legacy/Standard Markdown)
        const imageRegex = /!\[GENERATED_IMAGE\]\((data:image\/.*?;base64,.*?)\)/;
        const parts = text.split(imageRegex);

        return parts.map((part, index) => {
            if (part && part.startsWith('data:image')) {
                return (
                <div key={`img-${index}`} className="my-3 rounded-lg overflow-hidden border border-white/10 shadow-lg animate-fade-in" dir="ltr">
                    <img 
                        src={part} 
                        alt="Generated" 
                        className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => onImageClick?.(part)}
                    />
                </div>
                );
            }

            // 2. Split Code Blocks
            const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
            const subParts = [];
            let lastIndex = 0;
            let match;

            while ((match = codeBlockRegex.exec(part)) !== null) {
                if (match.index > lastIndex) {
                    const textBefore = part.substring(lastIndex, match.index);
                    const isRTL = isArabic(textBefore);
                    subParts.push(
                        <div key={`text-${index}-${lastIndex}`} className={`whitespace-pre-wrap leading-7 block my-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {renderTextWithLinks(textBefore, `link-${index}-${lastIndex}`)}
                        </div>
                    );
                }
                
                const lang = match[1] || 'text';
                const code = match[2] ? match[2].trim() : '';
                
                // THE CODE BOX (Terminal Box) - Uses new Subcomponent
                // FORCE LTR for code blocks
                subParts.push(
                    <div key={`code-wrapper-${index}-${match.index}`} dir="ltr" className="text-left">
                        <CodeBlock 
                            key={`code-${index}-${match.index}`}
                            code={code}
                            lang={lang}
                            onRunCode={onRunCode}
                        />
                    </div>
                );

                lastIndex = codeBlockRegex.lastIndex;
            }
            
            if (lastIndex < part.length) {
                const textAfter = part.substring(lastIndex);
                const isRTL = isArabic(textAfter);
                subParts.push(
                    <div key={`text-${index}-end`} className={`whitespace-pre-wrap leading-7 block my-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {renderTextWithLinks(textAfter, `link-${index}-end`)}
                    </div>
                );
            }
            
            if (subParts.length > 0) return subParts;

            // Pure Text Part
            const isRTL = isArabic(part);
            return (
                <div key={`plain-${index}`} className={`whitespace-pre-wrap leading-7 block my-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {renderTextWithLinks(part, `plain-${index}`)}
                </div>
            );
        });
    } catch (e) {
        return <span className="whitespace-pre-wrap leading-7 text-red-400">{text}</span>;
    }
  };

  const getFileIcon = (mimeType?: string) => {
    // Simple icon check to avoid large switch statements
    if (!mimeType) return <FileIcon size={24} className="text-gray-400"/>;
    if (mimeType.includes('pdf')) return <FileIcon size={24} className="text-red-400" />;
    if (mimeType.includes('json') || mimeType.includes('script')) return <FileIcon size={24} className="text-yellow-400" />;
    return <FileIcon size={24} className="text-blue-400" />;
  };

  return (
    <div className={`flex w-full mb-8 animate-slide-up ${isUser ? 'justify-end' : 'justify-start'} group max-w-4xl mx-auto`}>
      <div className={`flex max-w-[95%] sm:max-w-[90%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
          isUser 
            ? 'bg-[#2d2d2d] text-gray-300' 
            : message.mode?.includes('thinker') 
                ? 'bg-purple-900/20 text-purple-400 border border-purple-500/20' 
            : message.mode?.includes('search') 
                ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-900/20 text-red-500 border border-red-900/20'
        }`}>
          {isUser ? <User size={16} /> : 
           message.mode?.includes('thinker') ? <Brain size={16} /> :
           message.mode?.includes('search') ? <Globe size={16} /> :
           <Bot size={16} />}
        </div>

        <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'} flex-1`}>
          <div className={`px-6 py-4 rounded-2xl text-[15px] shadow-sm w-full transition-all duration-200 ${
            isUser
              ? 'glass-card text-gray-100 rounded-tr-none border border-white/5 animate-slide-in-right'
              : 'bg-transparent text-gray-200 px-0 py-0 shadow-none border-l-2 border-red-500/20 pl-6'
          }`}>
            {message.attachment && (
              <div className="mb-3 animate-fade-in">
                {message.attachment.startsWith('data:image') ? (
                   <div className="rounded-lg overflow-hidden border border-white/10 shadow-lg max-w-[300px]">
                      <img src={message.attachment} alt="User attachment" className="w-full h-auto object-cover" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1a] border border-white/10 max-w-sm hover:bg-[#252525] transition-colors">
                    <div className="p-2 bg-white/5 rounded-lg">
                      {getFileIcon(message.attachmentType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-200 truncate">
                        {message.attachmentName || 'Attached File'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono uppercase">
                         {message.attachmentType?.split('/')[1] || 'FILE'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[200px]">
                <textarea
                  ref={textareaRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-[#1a1a1a] text-white p-3 rounded-md border border-white/10 focus:border-red-500/50 focus:outline-none resize-none text-sm leading-relaxed"
                  rows={1}
                />
                <div className="flex justify-end gap-2 mt-1">
                  <button onClick={handleCancel} className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-400">
                    <X size={14} />
                  </button>
                  <button onClick={handleSave} className="p-1.5 rounded bg-red-900/20 hover:bg-red-900/40 text-red-400">
                    <Save size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className={`${!isUser ? 'prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#161616] prose-pre:border prose-pre:border-white/5 max-w-none' : ''}`}>
                 {renderContent(message.text || '')}
              </div>
            )}
          </div>
          
          {!isEditing && (
            <div className={`flex items-center gap-2 mt-1 ${isUser ? 'mr-1' : 'ml-1'} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
              <button 
                onClick={copyText}
                className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors rounded-lg"
                title="Copy Message"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              {isUser && onEdit && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 transition-colors rounded-lg"
                  title="Edit Message"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



export default ChatMessage;
