import React, { useState } from 'react';
import { Bot, Link, Lock, User, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { CloudStorage } from '../services/firebaseService';

interface LoginPageProps {
  onSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Logic mirrored from AuthModal
      try {
        await CloudStorage.secureIdentity(email, password);
        onSuccess();
      } catch (regError: any) {
        if (
            regError.message.includes("Identity already exists") || 
            regError.message.includes("email-already-in-use") ||
            regError.message.includes("credential-already-in-use")
        ) {
            await CloudStorage.restoreIdentity(email, password);
             // SYNC: Force pull from cloud to restore persistence if cookies were cleared
            await CloudStorage.pullFromCloud();
            onSuccess();
        } else {
            throw regError;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication Failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050505] text-white">
      {/* Background Matrix Effect (optional, keeps consistency) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-[#050505] to-[#050505] pointer-events-none" />
      
      <div className="w-full max-w-[400px] p-8 relative z-10 flex flex-col items-center animate-fade-in">
        
        {/* Logo Section */}
        <div className="mb-10 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-[#1e1e1e]/40 border border-white/5 flex items-center justify-center mb-6 shadow-[0_0_40px_-10px_rgba(220,38,38,0.3)] backdrop-blur-md animate-pulse-glow">
                <Bot className="w-10 h-10 text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Dark AI</h1>
            <p className="text-gray-500 text-sm font-mono tracking-wide">UNRESTRICTED ACCESS TERMINAL</p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleLogin} className="w-full space-y-5">
            
            <div className="space-y-1.5">
                <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={18} />
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white focus:border-red-500/50 focus:bg-[#161616] focus:outline-none transition-all placeholder:text-gray-600 shadow-inner"
                        placeholder="Agent Identity (Email)"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={18} />
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white focus:border-red-500/50 focus:bg-[#161616] focus:outline-none transition-all placeholder:text-gray-600 shadow-inner"
                        placeholder="Passcode"
                        minLength={6}
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3 text-red-400 text-xs animate-slide-up">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-bold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-3 shadow-lg ${
                    isLoading 
                    ? 'bg-red-900/20 text-red-700 cursor-not-allowed border border-red-900/30'
                    : 'bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_0_25px_rgba(220,38,38,0.4)] hover:-translate-y-0.5 border border-red-400/20'
                }`}
            >
                {isLoading ? (
                    <>
                        <Activity className="animate-spin" size={18} />
                        ESTABLISHING LINK...
                    </>
                ) : (
                    <>
                        INITIALIZE SESSION
                        <ArrowRight size={18} />
                    </>
                )}
            </button>
        </form>

        <div className="mt-8 text-center">
             <p className="text-[10px] text-gray-600 font-mono">
                BY ACCESSING THIS TERMINAL, YOU ACCEPT FULL RESPONSIBILITY.
                <br/>
                SYSTEM V2.6 // ENCRYPTED
             </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
