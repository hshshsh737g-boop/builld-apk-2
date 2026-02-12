
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  isError?: boolean;
  attachment?: string; // Base64 string
  attachmentName?: string; // Original filename
  attachmentType?: string; // MIME type
  mode?: 'thinker' | 'fast' | 'standard' | 'thinker_image' | 'thinker_response' | 'image_response' | 'search' | 'search_thinker' | 'search_fast' | 'search_response';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  currentSessionId: string | null;
  isThinkerMode: boolean;
  isFasterMode: boolean;
  isGhostMode: boolean;
}
