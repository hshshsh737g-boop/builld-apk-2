import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Bot, Paperclip, X, File as FileIcon, Square } from 'lucide-react';
import { Message, MessageRole, ChatState, ChatSession } from './types';
import { initializeChat, sendMessageToDarkAI } from './services/darkAiService';
import { ChatStorage } from './services/chatStorage';
import { CloudStorage } from './services/firebaseService';
import TerminalHeader from './components/TerminalHeader';
import ChatMessage from './components/ChatMessage';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import CodePreviewModal from './components/CodePreviewModal'; 
import LoginPage from './components/LoginPage';
import MatrixBackground from './components/MatrixBackground';
import { User } from 'firebase/auth';

// Define structure for the selected file state
interface SelectedFile {
  data: string;
  name: string;
  type: string;
}

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => ChatStorage.loadSessions());

  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isConnected: false,
    currentSessionId: null,
    isThinkerMode: false,
    isFasterMode: false,
    isGhostMode: false 
  });

  const [cloudStatus, setCloudStatus] = useState<'offline' | 'syncing' | 'connected' | 'error'>('offline');
  const [isReadyToSync, setIsReadyToSync] = useState(false);
  
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // CODE PREVIEW STATE
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState('');
  const [previewLang, setPreviewLang] = useState('');

  // IMAGE PREVIEW STATE
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortController = useRef<boolean>(false);

  // 1. Auth Listener & Boot Sequence
  useEffect(() => {
    const initConnection = async () => {
        const isConnected = await CloudStorage.connect();
        if (!isConnected) setCloudStatus('offline');
    };
    initConnection();

    const unsubscribe = CloudStorage.onAuthStateChange(async (user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);

      if (user) {
        setCloudStatus('connected');
        setIsReadyToSync(false); 

        const aiSuccess = await initializeChat([], state.isThinkerMode, state.isFasterMode, state.isGhostMode);
        if (aiSuccess) {
            setState(prev => ({ ...prev, isConnected: true }));
        }

        try {
            console.log("[App] Fetching cloud memory...");
            const cloudSessions = await CloudStorage.pullFromCloud();
            
            setSessions(prevLocal => {
                let merged: ChatSession[] = [];
                if (cloudSessions && cloudSessions.length > 0) {
                    const cloudMap = new Map(cloudSessions.map(s => [s.id, s]));
                    prevLocal.forEach(localS => {
                        const cloudS = cloudMap.get(localS.id);
                        if (cloudS) {
                            if (localS.lastUpdated > cloudS.lastUpdated) cloudMap.set(localS.id, localS);
                        } else {
                            if (localS.messages.length > 0) cloudMap.set(localS.id, localS);
                        }
                    });
                    merged = Array.from(cloudMap.values());
                } else {
                    merged = prevLocal;
                }
                return merged.sort((a, b) => b.lastUpdated - a.lastUpdated);
            });

            setTimeout(() => {
                setSessions(currentSessions => {
                    // FORCE NEW CHAT LOGIC (Refined)
                    // Check if the latest session is ALREADY a specific empty "New Operation"
                    if (currentSessions.length > 0 && 
                        currentSessions[0].title === "New Operation" && 
                        currentSessions[0].messages.length === 0) {
                        
                        // Reuse the existing empty session
                        loadSession(currentSessions[0].id, currentSessions);
                    } else {
                        // Create fresh one
                        handleNewChat();
                    }
                    return currentSessions;
                });
                setIsReadyToSync(true);  
            }, 500);

        } catch (err) {
            setIsReadyToSync(true);
        }
      } else {
          setCloudStatus('offline');
          setIsReadyToSync(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Save Logic
  useEffect(() => {
    ChatStorage.saveSessions(sessions);
    if (!isReadyToSync) return;
    if (currentUser) {
        // 1. Sync Logic (Debounced)
        const timeoutId = setTimeout(() => {
            setCloudStatus('syncing');
            CloudStorage.syncToCloud(sessions).then(success => {
                setCloudStatus(success ? 'connected' : 'error');
            });
        }, 2000);
        return () => clearTimeout(timeoutId);
    }
  }, [sessions, currentUser, isReadyToSync]);

  const currentSessionRef = useRef<string | null>(null);

  useEffect(() => {
    currentSessionRef.current = state.currentSessionId;
  }, [state.currentSessionId]);

  // 3. Real-time Subscription (Isolated to prevent loop)
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = CloudStorage.subscribeToCloud((cloudSessions) => {
        setSessions(prevLocal => {
            const sessionMap = new Map(prevLocal.map(s => [s.id, s]));
            
            cloudSessions.forEach(cloudS => {
                const localS = sessionMap.get(cloudS.id);
                if (!localS) {
                     sessionMap.set(cloudS.id, cloudS); 
                } else {
                     if (cloudS.messages.length > localS.messages.length) {
                         sessionMap.set(cloudS.id, cloudS);
                         
                         // Fix: Use Ref to get LATEST active session without re-subscribing
                         if (currentSessionRef.current === cloudS.id) {
                             setState(curr => ({
                                 ...curr,
                                 messages: cloudS.messages,
                                 isLoading: false 
                             }));
                         }
                     }
                }
            });
            return Array.from(sessionMap.values()).sort((a, b) => b.lastUpdated - a.lastUpdated);
        });
    });

    return () => unsubscribe();
  }, [currentUser]);


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.messages, state.isLoading, selectedFile]);

  // 4. Image Trigger Watcher
  useEffect(() => {
     if (!state.currentSessionId) return;
     
     const msgs = state.messages;
     if (msgs.length === 0) return;

     const lastMsg = msgs[msgs.length - 1];
     
     // Only react if last message is from MODEL and contains the IMG tag
     if (lastMsg.role === MessageRole.MODEL && lastMsg.text.includes("///IMG:")) {
         const imgRegex = /\/\/\/IMG:\s*(.*?)\s*\/\/\//;
         const match = lastMsg.text.match(imgRegex);
         
         if (match && match[1]) {
             const prompt = match[1];
             console.log("[App] Auto-triggering Image Gen for:", prompt);
             
             const newMsg: Message = {
                 id: Date.now().toString(),
                 role: MessageRole.USER,
                 text: `${prompt}`, // Just the prompt, or "Generating: ..."
                 timestamp: Date.now(),
                 mode: 'thinker_image' // MAGIC KEY for Bridge
             };
             
             // Optimistically update UI
             const updated = [...msgs, newMsg];
             setState(prev => ({ ...prev, messages: updated, isLoading: true }));
             updateCurrentSession(updated);
             
             // Force save to ensure Bridge sees it
             ChatStorage.saveSessions(sessions); 
         }
     }
  }, [state.messages, state.currentSessionId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [state.currentSessionId, currentUser]);

  useEffect(() => {
    if (inputRef.current) {
        inputRef.current.style.height = 'auto'; 
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const loadSession = (id: string, currentList = sessions) => {
    const session = currentList.find(s => s.id === id);
    if (session) {
      setState(prev => ({
        ...prev,
        messages: session.messages,
        currentSessionId: session.id
      }));
      sessionStorage.setItem('active_session_id', session.id); // Persist active session
      setSelectedFile(null); 
      
      // FORCE SCROLL TO BOTTOM after session loads
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const updateCurrentSession = (newMessages: Message[]) => {
    if (!state.currentSessionId) return;
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === state.currentSessionId) {
          let title = s.title;
          if (title === "New Operation" && newMessages.length > 0) {
            const firstUserMsg = newMessages.find(m => m.role === MessageRole.USER);
            if (firstUserMsg) {
              const text = firstUserMsg.text.trim();
              // STRICT 20 CHAR LIMIT & PRIORITY
              if (text) {
                  title = text.slice(0, 20);
              } else if (firstUserMsg.attachmentName) {
                  title = firstUserMsg.attachmentName.slice(0, 20); 
              } else {
                  title = "Image Generation";
              }
            }
          }
          return { ...s, messages: newMessages, title, lastUpdated: Date.now() };
        }
        return s;
      });
      return updated;
    });
  };

  const handleNewChat = () => {
    // 1. Check for EXISTING empty "New Operation" session
    const existingEmpty = sessions.find(s => s.title === "New Operation" && s.messages.length === 0);

    if (existingEmpty) {
        // Reuse existing instead of creating new
        if (state.currentSessionId !== existingEmpty.id) {
            loadSession(existingEmpty.id);
        }
        if (window.innerWidth < 768) setIsSidebarOpen(false);
        return;
    }

    // 2. Create NEW session if none exist
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Operation",
      messages: [],
      lastUpdated: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setState(prev => ({
      ...prev,
      messages: [],
      currentSessionId: newSession.id,
      isLoading: false
    }));
    sessionStorage.setItem('active_session_id', newSession.id);
    setSelectedFile(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = ChatStorage.deleteSession(sessions, id);
    setSessions(newSessions);
    
    // 🔥 SYNC: Immediate deletion from Cloud
    if (state.isConnected) {
        await CloudStorage.deleteSession(newSessions);
    }

    if (state.currentSessionId === id) {
      if (newSessions.length > 0) loadSession(newSessions[0].id, newSessions);
      else handleNewChat();
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    setSessions(prev => {
        const updated = prev.map(s => s.id === sessionId ? { ...s, title: newTitle, lastUpdated: Date.now() } : s);
        return updated.sort((a, b) => b.lastUpdated - a.lastUpdated);
    });
    // Explicitly update ChatStorage via useEffect listener
  };

  const exportChat = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) ChatStorage.exportSession(session);
  };

  const handleExportAll = () => {
    ChatStorage.exportDatabase(sessions);
  };

  const handleImportDatabase = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        let importedSessions: ChatSession[] = [];
        if (Array.isArray(data)) importedSessions = data;
        else if (data.sessions && Array.isArray(data.sessions)) importedSessions = data.sessions;
        else throw new Error("Invalid structure");
        
        setSessions(prev => {
            const merged = [...prev];
            importedSessions.forEach(imp => {
                const idx = merged.findIndex(s => s.id === imp.id);
                if (idx !== -1) merged[idx] = imp; 
                else merged.push(imp);
            });
            return merged.sort((a, b) => b.lastUpdated - a.lastUpdated);
        });
        alert("Memory Core restored successfully.");
      } catch (err) {
        alert("Corrupted Memory File. Restore failed.");
      }
    };
    reader.readAsText(file);
  };

  const toggleThinkerMode = () => {
    setState(prev => ({ ...prev, isThinkerMode: !prev.isThinkerMode, isFasterMode: !prev.isThinkerMode ? false : prev.isFasterMode }));
  };

  const toggleFasterMode = () => {
    setState(prev => ({ ...prev, isFasterMode: !prev.isFasterMode, isThinkerMode: !prev.isFasterMode ? false : prev.isThinkerMode }));
  };
  
  const toggleGhostMode = () => {
    setState(prev => ({ ...prev, isGhostMode: !prev.isGhostMode }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { alert("File too large. Maximum 20MB."); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedFile({ data: result, name: file.name, type: file.type || 'application/octet-stream' });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearFile = () => { setSelectedFile(null); };

  const handleImageClick = (src: string) => {
      setPreviewImage(src);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setSelectedFile({ data: result, name: "Pasted Image", type: file.type });
            };
            reader.readAsDataURL(file);
        }
    }
  };

  // --- DRAG & DROP HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Optional: Add visual cue for drag state if needed
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) { alert("File too large. Maximum 20MB."); return; }

    const fileType = file.name.split('.').pop()?.toLowerCase();
    const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'html', 'css', 'json', 'sql', 'rb', 'php', 'swift', 'go', 'rs', 'sh', 'bat', 'ps1', 'md', 'txt', 'xml', 'yaml', 'yml', 'ini', 'env'];
    
    // CASE 1: Code/Text Files - Store as attachment with embedded content
    if (codeExtensions.includes(fileType || '') || file.type.startsWith('text/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            // Store RAW content only - formatting happens in handleSendMessage
            setSelectedFile({ 
                data: content, 
                name: file.name, 
                type: file.type || 'text/plain' 
            });
        };
        reader.readAsText(file);
    } 
    // CASE 2: PDF Files
    else if (fileType === 'pdf') {
         const reader = new FileReader();
         reader.onload = (e) => {
            const result = e.target?.result as string;
            setSelectedFile({ data: result, name: file.name, type: file.type });
         };
         reader.readAsDataURL(file);
    }
    // CASE 3: Images
    else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setSelectedFile({ data: result, name: file.name, type: file.type });
        };
        reader.readAsDataURL(file);
    }
    // CASE 4: Unknown - Try Text Fallback
    else {
        if (confirm(`Unknown file type: .${fileType}. Try to read as text?`)) {
             const reader = new FileReader();
             reader.onload = (e) => {
                const content = e.target?.result as string;
                // Store RAW content only - formatting happens in handleSendMessage
                setSelectedFile({ 
                    data: content, 
                    name: file.name, 
                    type: 'text/plain' 
                });
            };
            reader.readAsText(file);
        }
    }
  };

  // --- Handlers ---
  
  const handleRunCode = (code: string, lang: string) => {
      setPreviewCode(code);
      setPreviewLang(lang);
      setIsPreviewOpen(true);
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    const msgIndex = state.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const previousHistory = state.messages.slice(0, msgIndex);
    const oldMsg = state.messages[msgIndex];
    const editedMsg: Message = { ...oldMsg, text: newText, timestamp: Date.now() };

    const tempMessages = [...previousHistory, editedMsg];
    setState(prev => ({ ...prev, messages: tempMessages, isLoading: true }));
    updateCurrentSession(tempMessages);

    try {
      const responseText = await sendMessageToDarkAI(
        newText, 
        previousHistory, 
        state.isThinkerMode,
        state.isFasterMode,
        state.isGhostMode,
        editedMsg.attachment
      );
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        text: responseText,
        timestamp: Date.now()
      };
      
      const finalMessages = [...tempMessages, botMsg];
      setState(prev => ({ ...prev, messages: finalMessages, isLoading: false }));
      updateCurrentSession(finalMessages);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.SYSTEM,
        text: error.message || "Regeneration failed.",
        timestamp: Date.now(),
        isError: true
      };
      setState(prev => ({ ...prev, messages: [...tempMessages, errorMsg], isLoading: false }));
    }
  };

  const stopGeneration = () => {
      if (state.isLoading) {
          abortController.current = true;
          setState(prev => ({ ...prev, isLoading: false }));
      }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputValue.trim() && !selectedFile) || state.isLoading) return;

    abortController.current = false; // Reset abort signal

    const userInputText = inputValue; // Original text typed by user
    const filePayload = selectedFile;
    setInputValue('');
    setSelectedFile(null);
    
    // SMART FILE HANDLING
    // Build text for AI (includes file content)
    // Build text for UI display (only user input, NOT file content)
    let textForAI = userInputText;
    let attachmentForAI: string | undefined;
    
    if (filePayload) {
        const isImageOrPDF = filePayload.type.startsWith('image/') || filePayload.type.includes('pdf');
        
        if (isImageOrPDF) {
            // Keep as Base64 attachment for Gemini Vision API
            attachmentForAI = filePayload.data;
        } else {
            // Text/Code file: append content to AI message with explicit filename tag
            // Format: "User Message {{filename}} FileContent"
            textForAI = userInputText.trim() 
                ? `${userInputText}\n\n{{${filePayload.name}}}\n${filePayload.data}` 
                : `{{${filePayload.name}}}\n${filePayload.data}`;
        }
    }

    // Determine Shadow Mode
    let mode: Message['mode'];
    if (state.isGhostMode) {
        if (state.isThinkerMode) mode = 'search_thinker';
        else if (state.isFasterMode) mode = 'search_fast';
        else mode = 'search';
    } else if (state.isThinkerMode) {
        mode = 'thinker';
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: textForAI, // SAVE: Save full content (User + File) to DB/History
      timestamp: Date.now(),
      attachment: filePayload?.data,
      attachmentName: filePayload?.name,
      attachmentType: filePayload?.type,
      mode: mode
    };

    const updatedMessages = [...state.messages, userMsg];
    setState(prev => ({ ...prev, messages: updatedMessages, isLoading: true }));
    updateCurrentSession(updatedMessages);

    // SHADOW API BYPASS (Thinker OR Search)
    if (state.isThinkerMode || state.isGhostMode) {
        console.log(`[App] Shadow Mode Active (${mode}). Bypassing local API. Uploading to cloud...`);
        return; 
    }

    try {
      const responseText = await sendMessageToDarkAI(
        textForAI,  // AI GETS: User text + file content (if text file)
        state.messages, 
        state.isThinkerMode,
        state.isFasterMode,
        state.isGhostMode,
        attachmentForAI  // AI GETS: Base64 (if image/PDF)
      );
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        text: responseText,
        timestamp: Date.now()
      };
      
      const finalMessages = [...updatedMessages, botMsg];
      
      // Check for abort before setting state
      if (abortController.current) return;

      setState(prev => ({ ...prev, messages: finalMessages }));
      updateCurrentSession(finalMessages);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.SYSTEM,
        text: error.message || "Connection lost.",
        timestamp: Date.now(),
        isError: true
      };
      setState(prev => ({ ...prev, messages: [...updatedMessages, errorMsg] }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const getProcessingText = () => {
      if (state.isGhostMode) return "Infiltrating Network (Ghost Protocol)...";
      if (state.isThinkerMode) return "Dark AI Pro (Thinking)...";
      if (state.isFasterMode) return "Dark AI Fast (Speed)...";
      return "Processing...";
  };

  const getPreviewIcon = () => {
    if (!selectedFile) return null;
    const type = selectedFile.type;
    if (type.includes('pdf')) return <FileIcon size={32} className="text-red-400" />;
    if (type.includes('json') || type.includes('javascript')) return <FileIcon size={32} className="text-yellow-400" />;
    return <FileIcon size={32} className="text-gray-400" />;
  };

  const handleLogout = async () => {
    if (currentUser && sessions.length > 0 && isReadyToSync) {
        setCloudStatus('syncing');
        await CloudStorage.syncToCloud(sessions);
    }
    // 2. DISCONNECT (Local & Remote)
    await CloudStorage.disconnect();
    
    // 3. SECURE WIPE (Privacy)
    ChatStorage.clearAll();
    sessionStorage.removeItem('active_session_id');

    // 4. RESET STATE (Fresh guest session)
    const freshSession: ChatSession = {
        id: Date.now().toString(),
        title: "New Operation",
        messages: [],
        lastUpdated: Date.now()
    };
    setSessions([freshSession]); // Override previous state completely
    
    setState(prev => ({
        ...prev,
        messages: [],
        currentSessionId: freshSession.id,
        isLoading: false
    }));
    sessionStorage.setItem('active_session_id', freshSession.id);
    setSelectedFile(null);
    setCloudStatus('offline');
  };

  if (isAuthChecking) {
      return (
          <div className="flex h-screen items-center justify-center bg-[#050505]">
              <div className="animate-pulse text-red-900 font-mono tracking-widest text-xs">ESTABLISHING SECURE LINK...</div>
          </div>
      );
  }

  if (!currentUser) {
      return <LoginPage onSuccess={() => { /* Handled by Auth Listener */ }} />;
  }

  return (
    <div 
        className="flex h-screen bg-[#050505] text-gray-100 overflow-hidden font-sans selection:bg-red-500/30 selection:text-red-200 relative"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPaste={handlePaste}
    >
      <MatrixBackground />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={() => { if (sessions.length > 0 && isReadyToSync) CloudStorage.syncToCloud(sessions); }} />
      <CodePreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} code={previewCode} language={previewLang} />
      
      {/* IMAGE PREVIEW MODAL */}
      {previewImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
              <div className="relative max-w-[90vw] max-h-[90vh]">
                  <img src={previewImage} alt="Full Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10" />
                  <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                      <X size={24} />
                  </button>
              </div>
          </div>
      )}

      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onNewChat={handleNewChat} sessions={sessions} currentSessionId={state.currentSessionId} onSelectSession={loadSession} onDeleteSession={deleteSession} onRenameSession={handleRenameSession} onExportSession={exportChat} onExportAll={handleExportAll} onImportDatabase={handleImportDatabase} cloudStatus={cloudStatus} currentUser={currentUser} onOpenAuth={() => setIsAuthModalOpen(true)} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        <TerminalHeader isConnected={state.isConnected} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isThinkerMode={state.isThinkerMode} toggleThinkerMode={toggleThinkerMode} isFasterMode={state.isFasterMode} toggleFasterMode={toggleFasterMode} isGhostMode={state.isGhostMode} toggleGhostMode={toggleGhostMode} />

        <main ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar pt-16 md:pt-0">
             <div className="max-w-[48rem] mx-auto px-4 pt-6 pb-36 min-h-full flex flex-col">
                {state.messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-start pt-32 text-center opacity-0 animate-fade-in">
                    <div className="w-24 h-24 rounded-3xl bg-[#1e1e1e]/40 border border-white/5 flex items-center justify-center mb-8 shadow-[0_0_40px_-10px_rgba(220,38,38,0.3)] backdrop-blur-md animate-pulse-glow">
                      <Bot className="w-12 h-12 text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-2 tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">Dark AI Online</h2>
                  </div>
                )}
                {state.messages.map((msg) => (
                    <ChatMessage 
                        key={msg.id} 
                        message={msg} 
                        onEdit={handleEditMessage} 
                        onRunCode={handleRunCode}
                        onImageClick={handleImageClick}
                    />
                ))}
                {state.isLoading && (
                  <div className="flex items-center gap-3 ml-2 mb-4 animate-pulse">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                      state.isGhostMode 
                        ? 'border-emerald-900/20 bg-emerald-900/20 text-emerald-500'
                        : 'border-red-900/20 bg-red-900/20 text-red-500'
                    }`}>
                      <Bot className="w-4 h-4" />
                    </div>
                    <span className="text-gray-500 text-sm font-medium tracking-wide">{getProcessingText()}</span>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>
        </main>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0b0c0f] via-[#0b0c0f] to-transparent pt-12 pb-8 px-4 z-20">
          <div className="max-w-[48rem] mx-auto">
            {selectedFile && (
                <div className="mb-3 relative inline-block animate-slide-up">
                    <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-2xl group glass-card p-2 pr-8">
                        {selectedFile.type.startsWith('image/') ? (
                             <img src={selectedFile.data} alt="Preview" className="h-20 w-auto object-cover rounded-lg" />
                        ) : (
                            <div className="flex items-center gap-3 px-2 py-1">
                                {getPreviewIcon()}
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-200 truncate max-w-[150px]">{selectedFile.name}</span>
                                    <span className="text-[10px] text-gray-500 uppercase">{selectedFile.type.split('/')[1] || 'FILE'}</span>
                                </div>
                            </div>
                        )}
                        <div className="absolute top-1 right-1">
                            <button onClick={clearFile} className="p-1 bg-red-900/80 rounded-full text-white hover:bg-red-700 transition-colors"><X size={12} /></button>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSendMessage} className="relative input-capsule rounded-2xl transition-all duration-300 transform hover:scale-[1.002]">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={state.isLoading} className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95" title="Attach File"><Paperclip className="w-4 h-4" /></button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf,text/*,.js,.jsx,.ts,.tsx,.py,.json,.csv,.md,.html,.css" className="hidden" />
              <textarea 
                ref={inputRef as any} 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
                placeholder={state.isGhostMode ? "Search System Active: Searching Network..." : "Enter command or query..."} 
                disabled={state.isLoading} 
                className="w-full bg-transparent text-gray-100 p-4 pl-14 pr-14 focus:outline-none placeholder:text-gray-600 font-medium text-[15px] resize-none overflow-y-auto min-h-[56px] max-h-[200px] leading-relaxed scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent" 
                rows={1}
                autoComplete="off" 
              />
              <button
                type={state.isLoading ? "button" : "submit"}
                onClick={state.isLoading ? stopGeneration : undefined}
                disabled={(!inputValue.trim() && !selectedFile) && !state.isLoading}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all duration-200 transform active:scale-95 ${
                  state.isLoading 
                    ? 'bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-500/30' 
                    : (inputValue.trim() || selectedFile) 
                      ? 'bg-white text-black hover:bg-gray-200 shadow-lg' 
                      : 'bg-[#333] text-gray-500 cursor-not-allowed'
                }`}
                title={state.isLoading ? "Stop Generation" : "Send Message"}
              >
                {state.isLoading ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            <div className="text-center mt-4">
              <p className="text-[10px] text-gray-600 font-mono">DARK AI v2.6 // {state.isThinkerMode ? 'PRO' : state.isFasterMode ? 'FAST' : 'STD'} // {state.isGhostMode ? 'GHOST' : 'ENCRYPTED'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;