import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe } from '../types';

interface CostingProps {
  onBack: () => void;
}

const Costing: React.FC<CostingProps> = ({ onBack }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // User Editable Costs (Defaults)
  const [laborCost, setLaborCost] = useState(500);
  const [overheadCost, setOverheadCost] = useState(200);
  const [packagingCost, setPackagingCost] = useState(300);
  const [targetMargin, setTargetMargin] = useState(40); // 40% Margin

  // Fetch Recipes
  useEffect(() => {
    const q = query(collection(db, 'recipes'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Recipe[];
      setRecipes(list);
      
      // Select the most recent recipe automatically
      if (list.length > 0 && !selectedRecipeId) {
        setSelectedRecipeId(list[0].id);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Find the selected recipe object
  const selectedRecipe = useMemo(() => 
    recipes.find(r => r.id === selectedRecipeId), 
  [recipes, selectedRecipeId]);

  // The Financial Engine
  const stats = useMemo(() => {
    if (!selectedRecipe) return null;

    // 1. Get Base Costs
    // Note: total_estimated_cost might be missing on old recipes, default to 0
    // @ts-ignore
    const ingredientsCost = selectedRecipe.total_estimated_cost || 0;
    
    // 2. Sum Total Manufacturing Cost
    const totalBatchCost = ingredientsCost + laborCost + overheadCost + packagingCost;

    // 3. Per Unit Calculations
    const units = selectedRecipe.batch_size_units || 1;
    const costPerUnit = totalBatchCost / units;

    // 4. Pricing Logic
    // Price = Cost / (1 - Margin%)
    const recommendedPrice = costPerUnit / (1 - (targetMargin / 100));
    const profitPerUnit = recommendedPrice - costPerUnit;

    return {
      ingredientsCost,
      totalBatchCost,
      costPerUnit,
      recommendedPrice,
      profitPerUnit,
      units
    };
  }, [selectedRecipe, laborCost, overheadCost, packagingCost, targetMargin]);

  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark pb-24 h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-white dark:bg-[#111722] border-b border-slate-200 dark:border-slate-800">
        <button onClick={onBack} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Costing Analysis</h2>
        <div className="size-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        
        {/* Recipe Selector */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Production Run</label>
          <select 
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark font-bold text-lg shadow-sm focus:ring-primary focus:border-primary"
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value)}
          >
            {recipes.length === 0 && <option>No recipes found...</option>}
            {recipes.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.batch_size_units} units)</option>
            ))}
          </select>
          {selectedRecipe && (
             <p className="text-sm text-slate-500 mt-2 ml-1">
               Project: {selectedRecipe.project} • {selectedRecipe.date}
             </p>
          )}
        </div>

        {selectedRecipe && stats ? (
          <>
            {/* Input Section */}
            <div className="grid grid-cols-2 gap-4 mb-6">
               <CostInput label="Labor Cost" value={laborCost} onChange={setLaborCost} icon="engineering" />
               <CostInput label="Overhead" value={overheadCost} onChange={setOverheadCost} icon="domain" />
               <CostInput label="Packaging" value={packagingCost} onChange={setPackagingCost} icon="package_2" />
               <CostInput label="Target Margin %" value={targetMargin} onChange={setTargetMargin} icon="percent" />
            </div>

            {/* Main Financial Card */}
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden mb-6">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Total Batch Cost</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                    ${stats.totalBatchCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Cost Per Unit</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    ${stats.costPerUnit.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Progress Bar Breakdown */}
              <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-2">
                 <div className="bg-blue-500 h-full" style={{ width: `${(stats.ingredientsCost / stats.totalBatchCost) * 100}%` }} title="Ingredients"></div>
                 <div className="bg-orange-400 h-full" style={{ width: `${(laborCost / stats.totalBatchCost) * 100}%` }} title="Labor"></div>
                 <div className="bg-purple-400 h-full" style={{ width: `${(overheadCost / stats.totalBatchCost) * 100}%` }} title="Overhead"></div>
                 <div className="bg-emerald-400 h-full" style={{ width: `${(packagingCost / stats.totalBatchCost) * 100}%` }} title="Packaging"></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-blue-500"></div>Ingredients (${stats.ingredientsCost.toFixed(0)})</span>
                <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-orange-400"></div>Labor</span>
                <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-purple-400"></div>Overhead</span>
                <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-emerald-400"></div>Pack</span>
              </div>
            </div>

            {/* Pricing Recommendation */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">sell</span>
                  Pricing Strategy
                </h3>
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-md">{targetMargin}% Margin</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white dark:bg-card-dark rounded-lg shadow-sm mb-2 border border-slate-100 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-500">Min. Wholesale Price</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">${stats.recommendedPrice.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-white dark:bg-card-dark rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-500">Profit Per Unit</span>
                <span className="text-lg font-bold text-emerald-500">+${stats.profitPerUnit.toFixed(2)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="py-20 text-center opacity-50">
             <span className="material-symbols-outlined text-4xl mb-2">science</span>
             <p>Select a recipe to begin costing analysis.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CostInput = ({ label, value, onChange, icon }: any) => (
  <div className="bg-white dark:bg-card-dark p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
    <div className="flex items-center gap-2 mb-1 text-slate-400">
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-center">
      <span className="text-slate-400 font-bold mr-1">$</span>
      <input 
        type="number" 
        className="w-full bg-transparent border-none p-0 font-bold text-slate-900 dark:text-white focus:ring-0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  </div>
);

export default Costing;