import { ChatSession } from '../types';

const STORAGE_KEY = 'dark_ai_memory_bank_v1';

export const ChatStorage = {
  /**
   * Loads sessions from LocalStorage.
   */
  loadSessions: (): ChatSession[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      return JSON.parse(saved);
    } catch (error) {
      console.error("MEMORY CORRUPTION DETECTED: Could not load local sessions.", error);
      return [];
    }
  },

  /**
   * Saves to LocalStorage only.
   */
  saveSessions: (sessions: ChatSession[]): boolean => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      return true;
    } catch (error) {
      console.error("WRITE FAILURE: Could not save local sessions.", error);
      return false;
    }
  },

  /**
   * Exports a specific session as a JSON file.
   */
  exportSession: (session: ChatSession): void => {
    const exportData = {
      title: session.title,
      timestamp: new Date(session.lastUpdated).toISOString(),
      messages: session.messages.map(m => ({
        role: m.role,
        content: m.text,
        time: new Date(m.timestamp).toLocaleTimeString()
      }))
    };
    downloadJSON(exportData, `dark_ai_log_${session.id}.json`);
  },

  /**
   * EXPORT FULL DATABASE
   */
  exportDatabase: (sessions: ChatSession[]): void => {
    const backupData = {
      version: "2.5",
      exportedAt: new Date().toISOString(),
      sessions: sessions
    };
    downloadJSON(backupData, `dark_ai_memory_core_${Date.now()}.json`);
  },

  deleteSession: (sessions: ChatSession[], sessionId: string): ChatSession[] => {
    const newSessions = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
    return newSessions;
  },

  clearAll: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};

function downloadJSON(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}