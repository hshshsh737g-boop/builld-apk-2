
import React, { useEffect, useRef } from 'react';
import { X, Play, Maximize2, Terminal } from 'lucide-react';

interface CodePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: string;
}

const CodePreviewModal: React.FC<CodePreviewModalProps> = ({ isOpen, onClose, code, language }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        let content = code;
        
        // --- DARK MODE INJECTION ---
        // We inject these styles to ensure the preview is always dark, 
        // preventing the "White Screen of Death" blindness.
        const darkThemeStyles = `
          <style>
            body { 
              background-color: #0d0d0d; 
              color: #e5e7eb; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 1rem;
            }
            /* Custom Scrollbar */
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #1a1a1a; }
            ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }
          </style>
        `;

        // If it's NOT a full HTML doc, we wrap it with our dark shell
        if (!code.trim().toLowerCase().startsWith('<!doctype html>') && !code.trim().toLowerCase().startsWith('<html')) {
            if (language === 'css') {
                content = `
                  <!DOCTYPE html>
                  <html>
                    <head>${darkThemeStyles}<style>${code}</style></head>
                    <body>
                      <h3>CSS Preview Component</h3>
                      <div class="test-box">
                        This is a test element for your CSS.
                        <br><br>
                        <div style="border: 1px dashed #555; padding: 10px;">Target Element</div>
                      </div>
                    </body>
                  </html>`;
            } else if (language === 'javascript' || language === 'js') {
                content = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      ${darkThemeStyles}
                      <style>
                        .console-line { font-family: 'Consolas', monospace; border-bottom: 1px solid #222; padding: 4px 0; }
                        .console-log { color: #ccc; }
                        .console-error { color: #ff5555; }
                        .console-warn { color: #f1fa8c; }
                      </style>
                    </head>
                    <body>
                      <div style="font-family:monospace; font-size:12px; color:#666; margin-bottom:10px;">// CONSOLE OUTPUT</div>
                      <div id="output"></div>
                      <script>
                        const output = document.getElementById('output');
                        const logToScreen = (msg, type = 'log') => {
                            const div = document.createElement('div');
                            div.className = 'console-line console-' + type;
                            div.textContent = '> ' + (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg);
                            output.appendChild(div);
                        };
                        console.log = (msg) => logToScreen(msg, 'log');
                        console.error = (msg) => logToScreen(msg, 'error');
                        console.warn = (msg) => logToScreen(msg, 'warn');
                        
                        try { 
                          ${code} 
                        } catch(e) { 
                          console.error(e.toString()); 
                        }
                      </script>
                    </body>
                  </html>`;
            } else {
                // HTML Snippet Wrapper
                content = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      ${darkThemeStyles}
                    </head>
                    <body>
                      ${code}
                    </body>
                  </html>
                `;
            }
        } else {
            // Even if it IS full HTML, try to inject dark background if body style is missing
            // This is a safety patch for full HTML documents that don't specify background color
            if (!content.includes('background-color') && !content.includes('background:')) {
                 content = content.replace('</head>', `${darkThemeStyles}</head>`);
            }
        }
        
        doc.write(content);
        doc.close();
      }
    }
  }, [isOpen, code, language]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl h-[80vh] bg-[#0f0f10] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#151515] border-b border-white/5">
          <div className="flex items-center gap-2 text-gray-200">
            <Terminal size={16} className="text-emerald-500" />
            <span className="font-mono text-sm font-bold tracking-wider">SIMULATION_RUNNER // {language.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#0d0d0d] relative">
           <iframe 
             ref={iframeRef}
             title="Code Preview"
             className="absolute inset-0 w-full h-full border-none bg-[#0d0d0d]"
             sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
           />
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 bg-[#151515] border-t border-white/5 text-[10px] text-gray-500 font-mono flex justify-between">
            <span>SANDBOX ENVIRONMENT ACTIVE</span>
            <span>READ-ONLY</span>
        </div>
      </div>
    </div>
  );
};

export default CodePreviewModal;
