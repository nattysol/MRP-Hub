import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe, Ingredient, PackagingItem } from '../types';
import SearchableSelect from './SearchableSelect';

interface ProductBuilderProps {
  onBack: () => void;
  initialRecipeId?: string;
}

const ProductBuilder: React.FC<ProductBuilderProps> = ({ onBack, initialRecipeId }) => {
  // Data State
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [packaging, setPackaging] = useState<PackagingItem[]>([]);
  
  // Form State
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [netWeight, setNetWeight] = useState<number>(30); // Default 30g/ml
  
  // Selections
  const [selectedRecipeId, setSelectedRecipeId] = useState(initialRecipeId || '');
  const [selectedContainerId, setSelectedContainerId] = useState('');
  const [selectedClosureId, setSelectedClosureId] = useState('');
  const [selectedLabelId, setSelectedLabelId] = useState('');
  const [selectedBoxId, setSelectedBoxId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load Data
  useEffect(() => {
    const unsubRecipes = onSnapshot(query(collection(db, 'recipes'), orderBy('name')), snap => 
      setRecipes(snap.docs.map(d => ({id: d.id, ...d.data()} as Recipe)))
    );
    const unsubIng = onSnapshot(collection(db, 'ingredients'), snap => 
      setIngredients(snap.docs.map(d => ({id: d.id, ...d.data()} as Ingredient)))
    );
    const unsubPack = onSnapshot(collection(db, 'packaging'), snap => 
      setPackaging(snap.docs.map(d => ({id: d.id, ...d.data()} as PackagingItem)))
    );
    return () => { unsubRecipes(); unsubIng(); unsubPack(); };
  }, []);

  // Set initial recipe if passed from dashboard
  useEffect(() => {
    if (initialRecipeId) setSelectedRecipeId(initialRecipeId);
  }, [initialRecipeId]);

  // Derived Options
  const recipeOptions = useMemo(() => recipes.map(r => ({
    id: r.id, name: r.name, subtitle: `v${r.version} • ${r.project || 'Internal'}`
  })), [recipes]);

  const packagingOptions = useMemo(() => packaging.map(p => ({
    id: p.id, name: p.name, subtitle: `$${p.unit_price.toFixed(3)} • ${p.category}`, category: p.category
  })), [packaging]);

  const containers = useMemo(() => packagingOptions.filter(p => p.category === 'Container' || p.category === 'Other'), [packagingOptions]);
  const closures = useMemo(() => packagingOptions.filter(p => p.category === 'Closure'), [packagingOptions]);
  const labels = useMemo(() => packagingOptions.filter(p => p.category === 'Label'), [packagingOptions]);
  const boxes = useMemo(() => packagingOptions.filter(p => p.category === 'Box'), [packagingOptions]);

  // LIVE COSTING MATH
  const stats = useMemo(() => {
    // 1. Liquid Cost
    const recipe = recipes.find(r => r.id === selectedRecipeId);
    let costPerGram = 0;
    if (recipe) {
      recipe.ingredients.forEach(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredient_id);
        if (ing) costPerGram += (ri.percentage / 100) * (ing.cost_per_gram || 0);
      });
    }
    const liquidCost = costPerGram * netWeight;

    // 2. Packaging Cost
    let packCost = 0;
    if (selectedContainerId) packCost += packaging.find(p => p.id === selectedContainerId)?.unit_price || 0;
    if (selectedClosureId) packCost += packaging.find(p => p.id === selectedClosureId)?.unit_price || 0;
    if (selectedLabelId) packCost += packaging.find(p => p.id === selectedLabelId)?.unit_price || 0;
    if (selectedBoxId) packCost += packaging.find(p => p.id === selectedBoxId)?.unit_price || 0;

    return { liquidCost, packCost, total: liquidCost + packCost };
  }, [selectedRecipeId, netWeight, selectedContainerId, selectedClosureId, selectedLabelId, selectedBoxId, recipes, ingredients, packaging]);

  const handleSave = async () => {
    if (!productName || !selectedRecipeId) return alert("Please enter a Product Name and select a Recipe.");
    setIsSaving(true);
    try {
      const recipeName = recipes.find(r => r.id === selectedRecipeId)?.name || 'Unknown';
      await addDoc(collection(db, 'products'), {
        name: productName,
        sku: sku,
        net_weight: Number(netWeight),
        recipe_id: selectedRecipeId,
        recipe_name: recipeName,
        container_id: selectedContainerId,
        closure_id: selectedClosureId,
        label_id: selectedLabelId,
        box_id: selectedBoxId,
        total_material_cost: stats.total,
        created_at: serverTimestamp()
      });
      alert(`Success! Created product "${productName}"`);
      onBack();
    } catch (err) {
      console.error(err);
      alert("Error saving product.");
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark pb-24 h-screen">
      <header className="p-4 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
        <button onClick={onBack} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-95">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">New Product SKU</h2>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Product'}
        </button>
      </header>

      <main className="flex-1 overflow-auto p-4 space-y-6">
        
        {/* Step 1: Identity */}
        <section className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-slideUp" style={{ animationDelay: '0s' }}>
          <div className="flex items-center gap-2 mb-4">
             <div className="size-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">1</div>
             <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Product Identity</h3>
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Product Name</label>
              <input 
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-1 focus:ring-primary font-bold" 
                placeholder="e.g. Sleep Tincture 30ml"
                value={productName} onChange={e => setProductName(e.target.value)}
              />
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">SKU</label>
              <input 
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-1 focus:ring-primary" 
                placeholder="SLP-01"
                value={sku} onChange={e => setSku(e.target.value)}
              />
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className="text-[10px] font-bold text-primary uppercase mb-1 block">Net Weight (g)</label>
              <input 
                type="number"
                className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-1 focus:ring-primary font-bold text-center" 
                value={netWeight} onChange={e => setNetWeight(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </section>

        {/* Step 2: Liquid */}
        <section className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-slideUp" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">2</div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Select Formula</h3>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-emerald-500 block">${stats.liquidCost.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 block">Liquid Cost</span>
            </div>
          </div>
          <SearchableSelect 
            label="Liquid Recipe"
            placeholder="Search recipes..."
            options={recipeOptions}
            value={selectedRecipeId}
            onChange={setSelectedRecipeId}
          />
        </section>

        {/* Step 3: Packaging */}
        <section className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-slideUp" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
           <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">3</div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Packaging Setup</h3>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-orange-500 block">${stats.packCost.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 block">Pack Cost</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <SearchableSelect label="Container" options={containers} value={selectedContainerId} onChange={setSelectedContainerId} />
             <SearchableSelect label="Closure" options={closures} value={selectedClosureId} onChange={setSelectedClosureId} />
             <SearchableSelect label="Label" options={labels} value={selectedLabelId} onChange={setSelectedLabelId} />
             <SearchableSelect label="Box" options={boxes} value={selectedBoxId} onChange={setSelectedBoxId} />
          </div>
        </section>

        <div className="h-24"></div>

        {/* Floating Footer */}
        <div className="fixed bottom-24 left-4 right-4 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center z-40 animate-slideUp" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
           <div>
             <p className="text-xs text-slate-400 font-bold uppercase">Total COGS / Unit</p>
             <p className="text-2xl font-black">${stats.total.toFixed(2)}</p>
           </div>
           <div className="text-right">
             <p className="text-xs text-slate-400">Includes {netWeight}g Liquid + Packaging</p>
             <p className="text-xs text-slate-500">Excludes Labor & Overhead</p>
           </div>
        </div>
      </main>
    </div>
  );
};

export default ProductBuilder;