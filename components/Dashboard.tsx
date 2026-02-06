import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe, UserRole } from '../types';

interface DashboardProps {
  onNavigate: (screen: any, recipeId?: string, autoCreate?: boolean) => void;
  role: UserRole | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, role }) => {
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [stats, setStats] = useState({ ingredients: 0, recipes: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const ingSnap = await getDocs(collection(db, 'ingredients'));
      const recSnap = await getDocs(collection(db, 'recipes'));
      setStats({ ingredients: ingSnap.size, recipes: recSnap.size });

      if (role === 'admin' || role === 'production') {
        const q = query(collection(db, 'recipes'), orderBy('date', 'desc'), limit(3));
        const recs = await getDocs(q);
        setRecentRecipes(recs.docs.map(d => ({ id: d.id, ...d.data() } as Recipe)));
      }
    };
    fetchData();
  }, [role]);

  const canSeeProduction = role === 'admin' || role === 'production';
  const canSeeOps = role === 'admin' || role === 'ops';

  return (
    <div className="flex-1 flex flex-col pb-24 px-6 pt-10">
      
      {/* BRANDED HEADER */}
      <header className="mb-8 flex items-center gap-4">
        {/* Small Logo for Dashboard */}
        <div className="size-12 bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center p-2">
            <img src="/ns-logo.svg" alt="NS" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white leading-tight">Natural Solutions</h1>
          <div className="flex items-center gap-2">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Manufacturing Hub</p>
             <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded font-bold">v1.0</span>
          </div>
        </div>
      </header>

      {/* Role Badge */}
      <div className="mb-6">
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
             role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
             role === 'production' ? 'bg-blue-50 text-blue-600 border-blue-100' :
             'bg-emerald-50 text-emerald-600 border-emerald-100'
           }`}>
             Logged in as: {role === 'ops' ? 'Sales & Ops' : role}
        </span>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {canSeeProduction && (
          <DashboardCard icon="add_circle" label="New Formula" color="bg-primary text-white" onClick={() => onNavigate('formulator', undefined, true)} />
        )}
        {canSeeOps && (
          <DashboardCard icon="grid_view" label="Build Product" color="bg-slate-800 dark:bg-slate-700 text-white" onClick={() => onNavigate('products')} />
        )}
        {canSeeOps && (
          <DashboardCard icon="request_quote" label="Quote Gen" color="bg-white dark:bg-card-dark text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-800" onClick={() => onNavigate('quote', undefined, true)} />
        )}
        {canSeeProduction && (
          <DashboardCard icon="inventory_2" label="Inventory" color="bg-white dark:bg-card-dark text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-800" onClick={() => onNavigate('inventory')} />
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-8">
        {canSeeProduction && (
          <div className="flex-1 bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><span className="material-symbols-outlined">science</span></div>
            <div><p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.recipes}</p><p className="text-[10px] uppercase font-bold text-slate-400">Formulas</p></div>
          </div>
        )}
        {(canSeeProduction || canSeeOps) && (
          <div className="flex-1 bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><span className="material-symbols-outlined">grocery</span></div>
            <div><p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.ingredients}</p><p className="text-[10px] uppercase font-bold text-slate-400">Ingredients</p></div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {canSeeProduction && (
        <>
          <div className="flex justify-between items-end mb-4">
            <h3 className="font-bold text-slate-700 dark:text-slate-300">Recent Formulations</h3>
            <button onClick={() => onNavigate('formulator')} className="text-xs font-bold text-primary">View All</button>
          </div>
          <div className="flex flex-col gap-3">
            {recentRecipes.map(r => (
              <button key={r.id} onClick={() => onNavigate('products', r.id)} className="flex items-center justify-between p-4 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-primary font-bold text-xs group-hover:scale-110 transition-transform">v{r.version}</div>
                  <div><p className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-primary transition-colors">{r.name}</p><p className="text-xs text-slate-400">{r.date} • {r.project}</p></div>
                </div>
                <div className="flex items-center gap-2"><span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">{r.status || 'Draft'}</span><span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span></div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const DashboardCard = ({ icon, label, color, onClick }: any) => (
  <button onClick={onClick} className={`h-24 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 ${color}`}>
    <span className="material-symbols-outlined text-2xl">{icon}</span>
    <span className="text-xs font-bold">{label}</span>
  </button>
);

export default Dashboard;