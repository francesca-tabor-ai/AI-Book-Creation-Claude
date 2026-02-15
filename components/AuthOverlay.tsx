
import React, { useState, useEffect, useRef } from 'react';
import { AuthMode, User } from '../types';

interface AuthOverlayProps {
  onLogin: (user: User) => void;
}

const GOOGLE_CLIENT_ID = "1034356307767-duqfohvkg8fdeheciote7uo0sfv0g13p.apps.googleusercontent.com";

const AuthOverlay: React.FC<AuthOverlayProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('SIGN_IN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeGoogle = () => {
      const google = (window as any).google;
      if (google) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: "outline",
            size: "large",
            width: googleBtnContainerRef.current.offsetWidth,
            text: "signin_with",
            shape: "pill"
          });
        }
      }
    };

    if (!(window as any).google) {
      const script = document.createElement('script');
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    } else {
      // Re-render button if container exists
      initializeGoogle();
    }
  }, [mode]);

  const handleGoogleResponse = (response: any) => {
    setLoading(true);
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const profile = JSON.parse(jsonPayload);
      
      onLogin({
        id: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        isVerified: profile.email_verified,
        provider: 'google',
        createdAt: new Date().toISOString(),
        tier: 'Free',
        usage: {
          tokensUsed: 0,
          tokenLimit: 50000,
          tokensThisMonth: 0,
          projectCount: 0
        }
      });
    } catch (error) {
      console.error("Google Authentication Error:", error);
      alert("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Fallback email/password simulation
    setTimeout(() => {
      if (mode === 'SIGN_UP') {
        setMode('VERIFY_EMAIL');
        setLoading(false);
      } else {
        onLogin({
          id: Math.random().toString(36).substr(2, 9),
          email: email || 'user@example.com',
          name: email.split('@')[0],
          isVerified: true,
          provider: 'email',
          createdAt: new Date().toISOString(),
          tier: 'Free',
          usage: {
            tokensUsed: 0,
            tokenLimit: 50000,
            tokensThisMonth: 0,
            projectCount: 0
          }
        });
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 backdrop-blur-xl p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] signature-gradient blur-[160px] rounded-full"></div>
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] signature-gradient blur-[160px] rounded-full opacity-50"></div>
      </div>

      <div className="w-full max-w-md bg-white p-12 rounded-[3rem] shadow-[0_48px_96px_-24px_rgba(0,0,0,0.12)] border border-slate-100 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <div className="signature-gradient w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-indigo-100">
            <i className="fas fa-book-open text-xl"></i>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 serif">
            {mode === 'SIGN_IN' && 'AI Book Creation Studio'}
            {mode === 'SIGN_UP' && 'Initialize Identity'}
            {mode === 'FORGOT_PASSWORD' && 'Recover Protocol'}
            {mode === 'VERIFY_EMAIL' && 'Check Signal'}
          </h2>
          <p className="text-slate-400 font-medium text-sm mt-3 leading-relaxed">
            {mode === 'SIGN_IN' && 'Synthesize your expertise into publishable literature.'}
            {mode === 'SIGN_UP' && 'Join the next generation of AI-augmented authors.'}
            {mode === 'FORGOT_PASSWORD' && "We'll send an encrypted recovery link."}
            {mode === 'VERIFY_EMAIL' && `Verification sequence sent to ${email}`}
          </p>
        </div>

        {mode === 'VERIFY_EMAIL' ? (
          <div className="space-y-6 text-center">
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-4">
               <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-500 shadow-sm">
                  <i className="fas fa-paper-plane animate-pulse"></i>
               </div>
               <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Waiting for confirmation...</p>
            </div>
            <button 
              onClick={() => setMode('SIGN_IN')}
              className="w-full py-4 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors"
            >
              Back to Signal
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center rounded-full backdrop-blur-[2px]">
                   <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <div ref={googleBtnContainerRef} className="w-full flex justify-center"></div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-slate-100"></div>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Institutional Access</span>
              <div className="h-[1px] flex-1 bg-slate-100"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <input 
                  type="email" 
                  required
                  placeholder="Email Address" 
                  className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />

                {(mode === 'SIGN_IN' || mode === 'SIGN_UP') && (
                  <input 
                    type="password" 
                    required
                    placeholder="Password" 
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                )}
              </div>

              {mode === 'SIGN_IN' && (
                <div className="text-right">
                  <button 
                    type="button"
                    onClick={() => setMode('FORGOT_PASSWORD')}
                    className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                  >
                    Lost credentials?
                  </button>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
              >
                {loading ? 'Processing...' : (
                  <>
                    <span>{mode === 'SIGN_IN' ? 'Enter Studio' : 'Establish Identity'}</span>
                    <i className="fas fa-arrow-right text-[10px] opacity-50"></i>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button 
                onClick={() => setMode(mode === 'SIGN_IN' ? 'SIGN_UP' : 'SIGN_IN')}
                className="text-[11px] font-bold text-slate-900 uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                {mode === 'SIGN_IN' ? (
                  <>Not an author yet? <span className="text-indigo-600 underline underline-offset-4">Register</span></>
                ) : (
                  <>Already have access? <span className="text-indigo-600 underline underline-offset-4">Sign in</span></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthOverlay;
