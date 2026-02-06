import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      setError('Invalid email or password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-6">
      <div className="w-full max-w-sm bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 animate-scaleIn">
        
        {/* BRANDING SECTION */}
        <div className="flex flex-col items-center mb-8">
          {/* Logo - Rename your file to 'logo.png' and put in public folder */}
          <img 
            src="/logo.svg" 
            alt="Natural Solutions" 
            className="h-20 object-contain mb-4 drop-shadow-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none'; // Hide if missing
              e.currentTarget.nextElementSibling?.classList.remove('hidden'); // Show fallback
            }}
          />
          
          {/* Fallback Icon (Hidden if logo loads) */}
          <div className="hidden size-16 bg-blue-50 text-blue-600 rounded-2xl items-center justify-center mb-4">
             <span className="material-symbols-outlined text-3xl">water_drop</span>
          </div>

          <h1 className="text-2xl font-black text-slate-800 dark:text-white text-center">Natural Solutions</h1>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Manufacturing Hub</span>
             <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-bold border border-slate-200">v1.0</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Email Address</label>
            <input 
              type="email" required
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 dark:text-white transition-all"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Password</label>
            <input 
              type="password" required
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 dark:text-white transition-all"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900">{error}</p>}

          <button 
            disabled={loading}
            className="w-full bg-primary text-white h-12 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;