import React, { useState } from 'react';
import { Shield, Lock, User, AlertTriangle, X, ArrowRight, Fingerprint } from 'lucide-react';
import { CloudStorage } from '../services/firebaseService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSmartAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // PHASE 1: Try to Secure/Register the current session first
      try {
        await CloudStorage.secureIdentity(email, password);
        // If successful, we are done
        onSuccess();
        onClose();
      } catch (registrationError: any) {
        
        // PHASE 2: Check if failure was due to existing account
        const errorMsg = registrationError.message || '';
        
        if (
             errorMsg.includes("Identity already exists") || 
             errorMsg.includes("email-already-in-use") || 
             errorMsg.includes("credential-already-in-use")
        ) {
            // Account exists -> Automatically switch to Login (Restore) logic
            try {
                await CloudStorage.restoreIdentity(email, password);
                onSuccess();
                onClose();
            } catch (loginError: any) {
                // Login failed (likely wrong password)
                throw loginError;
            }
        } else {
            // It was a different registration error (e.g. Weak Password)
            throw registrationError;
        }
      }
    } catch (finalError: any) {
      setError(finalError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-[95%] max-w-md bg-[#0f0f10] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-transparent" />
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10">
          <X size={20} />
        </button>

        <div className="p-6 md:p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-4 bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <Fingerprint size={28} className="text-gray-200 md:w-8 md:h-8" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide text-center">
              Identity Verification
            </h2>
            <p className="text-[11px] md:text-xs text-gray-400 mt-2 text-center max-w-[280px] leading-relaxed">
              Enter your credentials to access the Dark Nexus. 
              <br/>
              <span className="text-gray-600">New identities will be created automatically. Existing ones will be restored.</span>
            </p>
          </div>

          <form onSubmit={handleSmartAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Identity (Email)</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={16} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-white/30 focus:bg-[#222] focus:outline-none transition-all placeholder:text-gray-700"
                  placeholder="agent@dark-ai.net"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Passcode</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={16} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-white/30 focus:bg-[#222] focus:outline-none transition-all placeholder:text-gray-700"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg flex items-start gap-2 text-red-400 text-xs animate-slideUpFade">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full py-3 md:py-3.5 rounded-xl font-bold text-sm transition-all duration-300 mt-4 flex items-center justify-center gap-2 ${
                isLoading 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-200 hover:scale-[1.01] shadow-[0_0_20px_rgba(255,255,255,0.1)]'
              }`}
            >
              {isLoading ? 'Verifying...' : (
                <>
                  Proceed <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;