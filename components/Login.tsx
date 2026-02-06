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
      // App.tsx handles the state change automatically via onAuthStateChanged
    } catch (err: any) {
      console.error(err);
      setError('Invalid email or password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-6">
      <div className="w-full max-w-sm bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 animate-scaleIn">
        <div className="text-center mb-8">
          <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <span className="material-symbols-outlined text-3xl">hub</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Manufacturing Hub</h1>
          <p className="text-slate-400 text-sm font-medium">Sign in to access your workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Email Address</label>
            <input 
              type="email" required
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 dark:text-white"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Password</label>
            <input 
              type="password" required
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 dark:text-white"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}

          <button 
            disabled={loading}
            className="w-full bg-primary text-white h-12 rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;