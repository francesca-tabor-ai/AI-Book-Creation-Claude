
import React, { useState } from 'react';
import { AuthMode } from '../types';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } from '../services/authService';

const AuthOverlay: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('SIGN_IN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Redirect happens automatically via Supabase OAuth
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'SIGN_UP') {
        await signUpWithEmail(email, password, email.split('@')[0]);
        setMode('VERIFY_EMAIL');
      } else if (mode === 'SIGN_IN') {
        await signInWithEmail(email, password);
        // Auth state change listener in App.tsx will handle the rest
      } else if (mode === 'FORGOT_PASSWORD') {
        await resetPassword(email);
        setMessage('Recovery link sent. Check your email.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
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

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl text-xs font-medium text-green-600">
            {message}
          </div>
        )}

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
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-full font-bold text-sm text-slate-700 hover:bg-slate-50 hover:shadow-md transition-all disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
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
                    <span>{mode === 'SIGN_IN' ? 'Enter Studio' : mode === 'SIGN_UP' ? 'Establish Identity' : 'Send Recovery Link'}</span>
                    <i className="fas fa-arrow-right text-[10px] opacity-50"></i>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => { setMode(mode === 'SIGN_IN' ? 'SIGN_UP' : 'SIGN_IN'); setError(null); setMessage(null); }}
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
