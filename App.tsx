import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserRole } from './types';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Formulator from './components/Formulator';
import ProductBuilder from './components/ProductBuilder';
import QuoteGenerator from './components/QuoteGenerator';
import Packaging from './components/Packaging';
import PageTransition from './components/PageTransition';

type Screen = 'dashboard' | 'inventory' | 'formulator' | 'products' | 'quote' | 'packaging';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // App State
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [activeRecipeId, setActiveRecipeId] = useState<string>('');
  const [autoCreate, setAutoCreate] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // 1. Listen for Auth Changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role as UserRole);
        } else {
          setRole('ops'); 
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Dark Mode Toggle
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const handleNavigate = (screen: Screen, recipeId?: string, shouldAutoCreate: boolean = false) => {
    if (recipeId) setActiveRecipeId(recipeId);
    setAutoCreate(shouldAutoCreate);
    setCurrentScreen(screen);
  };

  const handleLogout = () => signOut(auth);

  if (loading) return <div className="h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-400 font-bold">Loading Hub...</div>;

  if (!user) return <Login />;

  const renderScreen = () => {
    const ScreenComponent = () => {
        switch (currentScreen) {
            case 'dashboard': return <Dashboard role={role} onNavigate={handleNavigate} />;
            case 'inventory': return <Inventory onBack={() => setCurrentScreen('dashboard')} />;
            case 'formulator': return <Formulator onBack={() => setCurrentScreen('dashboard')} autoCreate={autoCreate} />;
            case 'products': return <ProductBuilder initialRecipeId={activeRecipeId} onBack={() => setCurrentScreen('dashboard')} />;
            case 'quote': return <QuoteGenerator onBack={() => setCurrentScreen('dashboard')} autoCreate={autoCreate} />;
            case 'packaging': return <Packaging onBack={() => setCurrentScreen('dashboard')} />;
            default: return <Dashboard role={role} onNavigate={handleNavigate} />;
        }
    };
    return (
        <PageTransition key={currentScreen}>
            <ScreenComponent />
        </PageTransition>
    );
  };

  // Permission Helpers
  const showInventory = role === 'admin' || role === 'production';
  const showFormulas = role === 'admin' || role === 'production';
  const showProducts = role === 'admin' || role === 'ops';
  const showQuotes = role === 'admin' || role === 'ops';
  const showPackaging = role === 'admin' || role === 'ops';

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300">
      
      {/* (Top Bar Controls Removed as requested) */}

      {renderScreen()}
      
      {/* UPDATED BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#101622] border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-2 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between max-w-lg mx-auto overflow-x-auto no-scrollbar gap-1">
          
          {/* Main Navigation Items */}
          {showInventory && <NavBtn icon="grocery" label="Ingred" active={currentScreen === 'inventory'} onClick={() => handleNavigate('inventory')} />}
          {showFormulas && <NavBtn icon="science" label="Formulas" active={currentScreen === 'formulator'} onClick={() => handleNavigate('formulator', undefined, false)} />}
          
          {showProducts && (
            <button onClick={() => handleNavigate('products')} className={`shrink-0 flex flex-col items-center justify-center -mt-8 size-14 rounded-full shadow-lg border-4 border-white dark:border-[#0b0f19] transition-transform active:scale-95 ${currentScreen === 'products' ? 'bg-primary text-white' : 'bg-slate-900 text-white'}`}>
              <span className="material-symbols-outlined text-2xl">grid_view</span>
            </button>
          )}
          
          {showPackaging && <NavBtn icon="package_2" label="Pack" active={currentScreen === 'packaging'} onClick={() => handleNavigate('packaging')} />}
          {showQuotes && <NavBtn icon="request_quote" label="Quotes" active={currentScreen === 'quote'} onClick={() => handleNavigate('quote', undefined, false)} />}

          {/* Divider */}
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0"></div>

          {/* System Controls (Moved Here) */}
          <button onClick={() => setIsDark(!isDark)} className="flex flex-col items-center gap-1 w-12 text-slate-400 hover:text-yellow-500 dark:hover:text-yellow-400 shrink-0">
             <span className="material-symbols-outlined text-xl">{isDark ? 'light_mode' : 'dark_mode'}</span>
             <span className="text-[9px] font-bold uppercase tracking-tight">Theme</span>
          </button>
          
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 w-12 text-slate-400 hover:text-red-500 shrink-0">
             <span className="material-symbols-outlined text-xl">logout</span>
             <span className="text-[9px] font-bold uppercase tracking-tight">Exit</span>
          </button>
        
        </div>
      </nav>
    </div>
  );
};

const NavBtn = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`shrink-0 flex flex-col items-center gap-1 w-14 ${active ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
    <span className={`material-symbols-outlined ${active ? 'filled' : ''}`}>{icon}</span>
    <span className="text-[9px] font-bold uppercase tracking-tight truncate w-full text-center">{label}</span>
  </button>
);

export default App;