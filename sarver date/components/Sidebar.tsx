import React, { useRef, useState } from 'react';
import { Plus, MessageSquare, Trash2, Download, Upload, Database, Save, Cloud, CloudOff, RefreshCw, Shield, AlertTriangle, LogOut, WifiOff, HardDrive, Pencil, Check, X } from 'lucide-react';
import { ChatSession } from '../types';
import { User } from 'firebase/auth';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  onNewChat: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onExportSession: (id: string) => void;
  onExportAll: () => void;
  onImportDatabase: (file: File) => void;
  cloudStatus: 'offline' | 'syncing' | 'connected' | 'error';
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  toggleSidebar, 
  onNewChat, 
  sessions, 
  currentSessionId, 
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onExportSession,
  onExportAll,
  onImportDatabase,
  cloudStatus,
  currentUser,
  onOpenAuth,
  onLogout
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportDatabase(file);
    }
    if (e.target) e.target.value = '';
  };

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingSessionId(session.id);
      setEditTitle(session.title);
  };

  const saveEdit = (e: React.MouseEvent | React.FormEvent) => {
      e.stopPropagation();
      if (editingSessionId && editTitle.trim()) {
          onRenameSession(editingSessionId, editTitle.trim());
          setEditingSessionId(null);
      }
  };

  const cancelEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingSessionId(null);
  };

  const handleInputClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // prevent selecting session when clicking input
  };

  const isLoggedIn = !!currentUser;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-500 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />
      
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-[280px] glass-panel flex flex-col transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) transform md:relative md:translate-x-0 border-r border-white/5 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex-none">
          <button 
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) toggleSidebar();
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 input-capsule text-white rounded-xl transition-all border border-white/5 shadow-lg group active:scale-[0.98] hover:bg-white/5"
          >
            <Plus className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
            <span className="text-sm font-medium">New operation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          <div className="px-3 py-2 flex items-center justify-between mb-2 group">
             <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">History</span>
          </div>
          
          <div className="space-y-1">
            {sessions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-600 text-xs italic">
                No active logs found.
              </div>
            ) : (
              sessions.sort((a, b) => b.lastUpdated - a.lastUpdated).map((session) => (
                <div 
                  key={session.id}
                  onClick={() => {
                    if (editingSessionId === session.id) return;
                    onSelectSession(session.id);
                    if (window.innerWidth < 768) toggleSidebar();
                  }}
                  className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 sidebar-item ${
                    currentSessionId === session.id 
                      ? 'bg-white/5 text-gray-100 border-l-2 border-red-500 pl-[10px] active' 
                      : 'text-gray-400 border-l-2 border-transparent hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.id ? 'text-red-500' : 'text-gray-600 group-hover:text-gray-500'}`} />
                  
                  {editingSessionId === session.id ? (
                      <div className="flex-1 flex items-center gap-1 min-w-0 animate-fade-in" onClick={handleInputClick}>
                          <input 
                              type="text" 
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(e);
                                  if (e.key === 'Escape') cancelEdit(e as any);
                              }}
                              autoFocus
                              className="w-full bg-[#000] text-gray-100 text-sm px-2 py-1 rounded border border-white/20 focus:border-red-500 focus:outline-none"
                          />
                          <button onClick={saveEdit} className="p-1 hover:text-green-400 text-gray-500 rounded hover:bg-white/10"><Check size={14}/></button>
                          <button onClick={cancelEdit} className="p-1 hover:text-red-400 text-gray-500 rounded hover:bg-white/10"><X size={14}/></button>
                      </div>
                  ) : (
                      <>
                        <span className="truncate text-sm pr-14 flex-1">{session.title}</span>
                        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                            onClick={(e) => startEditing(session, e)}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/10 transition-all"
                            title="Rename"
                            >
                            <Pencil size={12} />
                            </button>
                            <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onExportSession(session.id);
                            }}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-cyan-400 hover:bg-cyan-900/20 transition-all"
                            title="Download Log"
                            >
                            <Download size={12} />
                            </button>
                            <button 
                            onClick={(e) => onDeleteSession(session.id, e)}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-all"
                            title="Delete Log"
                            >
                            <Trash2 size={12} />
                            </button>
                        </div>
                      </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-[#050505] space-y-3">
          
          {/* Identity Management */}
          <div className={`rounded-xl p-3 border ${
              !isLoggedIn ? 'bg-gray-900/20 border-white/5' :
              'bg-[#111] border-white/10'
            }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  !isLoggedIn ? 'bg-gray-800 text-gray-500' :
                  'bg-green-900/20 text-green-500'
                }`}>
                {!isLoggedIn ? <HardDrive size={16} /> : <Shield size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-200 truncate">
                  {!isLoggedIn ? 'Local Storage' : 'Identity Secured'}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {!isLoggedIn ? 'Data saved on device' : currentUser?.email}
                </div>
              </div>
            </div>
            
            {!isLoggedIn ? (
              <button 
                onClick={onOpenAuth}
                className="w-full py-1.5 text-xs rounded-lg transition-colors border font-medium bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
              >
                Login / Register
              </button>
            ) : (
              <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-1.5 bg-white/5 hover:bg-red-900/20 text-gray-400 hover:text-red-400 text-xs rounded-lg transition-colors"
              >
                <LogOut size={12} />
                Disconnect
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={onExportAll}
              className="flex flex-col items-center justify-center gap-2 p-2 rounded-lg bg-[#111] border border-white/5 hover:bg-[#1a1a1a] hover:border-white/10 transition-all text-gray-400 hover:text-white"
              title="Save all chats to a file"
            >
              <Save size={16} />
              <span className="text-[10px]">Backup</span>
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-2 rounded-lg bg-[#111] border border-white/5 hover:bg-[#1a1a1a] hover:border-white/10 transition-all text-gray-400 hover:text-white"
              title="Load chats from a file"
            >
              <Upload size={16} />
              <span className="text-[10px]">Restore</span>
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden" 
            />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;