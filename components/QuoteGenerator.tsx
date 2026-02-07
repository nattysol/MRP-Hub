import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe, Ingredient, PackagingItem, Product, Quote } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SearchableSelect from './SearchableSelect';

interface QuoteGeneratorProps {
  onBack: () => void;
  autoCreate?: boolean;
  userName: string;
}

interface QuoteResult {
  units: number;
  materialCostPerUnit: number;
  packagingCostPerUnit: number;
  laborPerUnit: number;
  overheadPerUnit: number;
  setupPerUnit: number; // <--- NEW: Economies of Scale
  totalCogsPerUnit: number;
  totalCogs: number;
  recommendedPrice: number;
  margin: number;
}

const QuoteGenerator: React.FC<QuoteGeneratorProps> = ({ onBack, autoCreate, userName }) => {
  const [view, setView] = useState<'list' | 'create'>(autoCreate ? 'create' : 'list');
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quotes, setQuotes] = useState<any[]>([]);

  // Stacking State
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Form State
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [version, setVersion] = useState(1);
  
  // Costing Config (NEW Adjustable Fields)
  const [laborRate, setLaborRate] = useState(0.35);
  const [overheadRate, setOverheadRate] = useState(0.10);
  const [setupCost, setSetupCost] = useState(250); // Default $250 setup fee
  const [targetMargin, setTargetMargin] = useState(40); // Target Margin %

  // Selections
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedContainerId, setSelectedContainerId] = useState('');
  const [selectedClosureId, setSelectedClosureId] = useState('');
  const [selectedLabelId, setSelectedLabelId] = useState('');
  const [selectedBoxId, setSelectedBoxId] = useState('');

  // Tiers
  const [tier1, setTier1] = useState(1000);
  const [tier2, setTier2] = useState(5000);
  const [tier3, setTier3] = useState(10000);
  
  const [isSaving, setIsSaving] = useState(false);

  // Data Loading
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [packaging, setPackaging] = useState<PackagingItem[]>([]);

  useEffect(() => {
    const unsubQuotes = onSnapshot(query(collection(db, 'quotes'), orderBy('date', 'desc')), snap => setQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('name')), snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))));
    const unsubRecipes = onSnapshot(collection(db, 'recipes'), snap => setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Recipe))));
    const unsubIng = onSnapshot(collection(db, 'ingredients'), snap => setIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ingredient))));
    const unsubPack = onSnapshot(collection(db, 'packaging'), snap => setPackaging(snap.docs.map(d => ({ id: d.id, ...d.data() } as PackagingItem))));
    return () => { unsubQuotes(); unsubProducts(); unsubRecipes(); unsubIng(); unsubPack(); };
  }, []);

  useEffect(() => {
    if (autoCreate) {
       resetForm();
       setView('create');
    }
  }, [autoCreate]);

  // --- GROUPING & STACKING LOGIC ---
  const groupedQuotes = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    const filtered = quotes.filter(q => {
      if (!quoteSearch) return true;
      const lower = quoteSearch.toLowerCase();
      return q.client_name.toLowerCase().includes(lower) || q.product_name.toLowerCase().includes(lower);
    });
    filtered.forEach(q => {
      const key = `${q.client_name}||${q.product_name}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (b.version || 0) - (a.version || 0));
    });
    return groups;
  }, [quotes, quoteSearch]);


  // --- HANDLERS ---
  const resetForm = () => {
    setEditingQuoteId(null);
    setClientName('');
    setVersion(1);
    setSelectedProductId('');
    setSelectedRecipeId('');
    setSelectedContainerId('');
    setSelectedClosureId('');
    setSelectedLabelId('');
    setSelectedBoxId('');
    setTier1(1000);
    setTier2(5000);
    setTier3(10000);
    setLaborRate(0.35);
    setOverheadRate(0.10);
    setSetupCost(250);
  };

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setSelectedRecipeId(prod.recipe_id || '');
      setSelectedContainerId(prod.container_id || '');
      setSelectedClosureId(prod.closure_id || '');
      setSelectedLabelId(prod.label_id || '');
      setSelectedBoxId(prod.box_id || '');
      if (!clientName) {
         const r = recipes.find(rec => rec.id === prod.recipe_id);
         if (r && r.project) setClientName(r.project);
      }
    }
  };

  const handleLoadQuote = (q: any) => {
    setClientName(q.client_name || '');
    setVersion((q.version || 1) + 1);
    
    setSelectedProductId(q.product_id || '');
    setSelectedRecipeId(q.recipe_id || '');
    setSelectedContainerId(q.container_id || '');
    setSelectedClosureId(q.closure_id || '');
    setSelectedLabelId(q.label_id || '');
    setSelectedBoxId(q.box_id || '');

    setTier1(q.tier1_units || 1000);
    setTier2(q.tier2_units || 5000);
    setTier3(q.tier3_units || 10000);
    
    // Load config if available, else defaults
    setLaborRate(q.labor_rate !== undefined ? q.labor_rate : 0.35);
    setOverheadRate(q.overhead_rate !== undefined ? q.overhead_rate : 0.10);
    setSetupCost(q.setup_cost !== undefined ? q.setup_cost : 250);

    setView('create');
  };

  // --- CALCULATIONS ---
  const productOptions = useMemo(() => products.map(p => ({ id: p.id, name: p.name, subtitle: `SKU: ${p.sku || 'N/A'}` })), [products]);
  const packagingOptions = useMemo(() => packaging.map(p => ({ id: p.id, name: p.name, subtitle: `$${p.unit_price.toFixed(3)} • ${p.category}`, category: p.category, vendor: p.vendor })), [packaging]);
  
  const containers = useMemo(() => packagingOptions.filter(p => p.category === 'Container' || p.category === 'Other'), [packagingOptions]);
  const closures = useMemo(() => packagingOptions.filter(p => p.category === 'Closure'), [packagingOptions]);
  const labels = useMemo(() => packagingOptions.filter(p => p.category === 'Label'), [packagingOptions]);
  const boxes = useMemo(() => packagingOptions.filter(p => p.category === 'Box'), [packagingOptions]);
  const selectedRecipe = useMemo(() => recipes.find(r => r.id === selectedRecipeId), [recipes, selectedRecipeId]);

  const costs = useMemo(() => {
    // 1. Ingredients
    let material = 0;
    if (selectedRecipe) {
        selectedRecipe.ingredients.forEach(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredient_id);
        if (ing) material += (ri.percentage / 100) * (ing.cost_per_gram || 0);
        });
    }
    const product = products.find(p => p.id === selectedProductId);
    const unitSize = product?.net_weight || selectedRecipe?.unit_size_g || 0;
    const materialCost = material * unitSize;

    // 2. Packaging
    let pack = 0;
    if (selectedContainerId) pack += packaging.find(p => p.id === selectedContainerId)?.unit_price || 0;
    if (selectedClosureId) pack += packaging.find(p => p.id === selectedClosureId)?.unit_price || 0;
    if (selectedLabelId) pack += packaging.find(p => p.id === selectedLabelId)?.unit_price || 0;
    if (selectedBoxId) pack += packaging.find(p => p.id === selectedBoxId)?.unit_price || 0;

    return {
        material: materialCost,
        packaging: pack,
        baseTotal: materialCost + pack + laborRate + overheadRate
    };
  }, [selectedRecipe, products, selectedProductId, ingredients, packaging, selectedContainerId, selectedClosureId, selectedLabelId, selectedBoxId, laborRate, overheadRate]);

  const generateQuote = (units: number): QuoteResult | null => {
    if (!selectedRecipe) return null;
    
    // ECONOMIES OF SCALE MAGIC: Spread setup cost over units
    const setupPerUnit = setupCost / units;
    
    const totalCogsPerUnit = costs.baseTotal + setupPerUnit;
    
    // Price based on Margin Target
    // Formula: Price = Cost / (1 - Margin%)
    const marginDecimal = targetMargin / 100;
    const recommendedPrice = totalCogsPerUnit / (1 - marginDecimal);
    
    return {
      units, 
      materialCostPerUnit: costs.material, 
      packagingCostPerUnit: costs.packaging, 
      laborPerUnit: laborRate, 
      overheadPerUnit: overheadRate, 
      setupPerUnit,
      totalCogsPerUnit, 
      totalCogs: totalCogsPerUnit * units, 
      recommendedPrice,
      margin: ((recommendedPrice - totalCogsPerUnit) / recommendedPrice) * 100
    };
  };

  const results = { t1: generateQuote(tier1), t2: generateQuote(tier2), t3: generateQuote(tier3) };

  const handleSaveQuote = async () => {
    if (!clientName || !selectedProductId || !results.t1) return alert("Missing Info");
    setIsSaving(true);
    try {
      const product = products.find(p => p.id === selectedProductId);
      const payload = {
        date: new Date().toISOString(),
        client_name: clientName,
        product_name: product?.name || 'Unknown',
        product_sku: product?.sku || 'N/A',
        version: version,
        
        selected_tier_units: tier1,
        selected_tier_price: results.t1.recommendedPrice,
        selected_tier_total: results.t1.totalCogs,
        
        // Save Configs
        labor_rate: laborRate,
        overhead_rate: overheadRate,
        setup_cost: setupCost,
        
        product_id: selectedProductId,
        recipe_id: selectedRecipeId,
        container_id: selectedContainerId,
        closure_id: selectedClosureId,
        label_id: selectedLabelId,
        box_id: selectedBoxId,
        tier1_units: tier1,
        tier2_units: tier2,
        tier3_units: tier3,
        updated_at: serverTimestamp()
      };

      await addDoc(collection(db, 'quotes'), {
        ...payload,
        quote_number: `Q-${Math.floor(Math.random() * 10000)}`,
        created_at: serverTimestamp()
      });
      
      alert(`Quote v${version} Saved Successfully`);
      setExpandedGroup(null);
    } catch (e) {
      console.error(e);
      alert("Error saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedRecipe || !results.t1 || !results.t2 || !results.t3) return;
    await handleSaveQuote();

    const doc = new jsPDF();
    const product = products.find(p => p.id === selectedProductId);
    const prodName = product?.name || selectedRecipe.name;
    const today = new Date().toLocaleDateString();

    doc.setFillColor(79, 70, 229); 
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('MANUFACTURING QUOTE', 14, 18);
    
    doc.setFontSize(10);
    doc.text(`Date: ${today}`, 160, 12);
    doc.text(`By: ${userName}`, 160, 18);

    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(prodName, 14, 45);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Client: ${clientName}`, 14, 51);
    doc.text(`SKU: ${product?.sku || 'N/A'}`, 14, 56);
    doc.text(`Version: v${version}`, 14, 61);

    autoTable(doc, {
      startY: 70,
      head: [['Order Quantity', 'Unit Price', 'Total Cost', 'Lead Time']],
      body: [
        [`${results.t1.units.toLocaleString()} units`, `$${results.t1.recommendedPrice.toFixed(2)}`, `$${(results.t1.recommendedPrice * results.t1.units).toLocaleString()}`, '14 Days'],
        [`${results.t2.units.toLocaleString()} units`, `$${results.t2.recommendedPrice.toFixed(2)}`, `$${(results.t2.recommendedPrice * results.t2.units).toLocaleString()}`, '21 Days'],
        [`${results.t3.units.toLocaleString()} units`, `$${results.t3.recommendedPrice.toFixed(2)}`, `$${(results.t3.recommendedPrice * results.t3.units).toLocaleString()}`, '28 Days'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], halign: 'center' },
    });

    const getPkgName = (id: string) => packaging.find(p => p.id === id)?.name || 'Not Selected';
    const getPkgVendor = (id: string) => {
      const v = packaging.find(p => p.id === id)?.vendor;
      if (!v || v === 'Unknown') return 'Undisclosed, top-tier vendor';
      return v;
    };

    let finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text("Packaging Specifications", 14, finalY);

    const packData = [
      ['Container', getPkgName(selectedContainerId), getPkgVendor(selectedContainerId)],
      ['Closure', getPkgName(selectedClosureId), getPkgVendor(selectedClosureId)],
      ['Label', getPkgName(selectedLabelId), getPkgVendor(selectedLabelId)],
      ['Box', getPkgName(selectedBoxId), getPkgVendor(selectedBoxId)],
    ];

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Component', 'Selection', 'Vendor']],
      body: packData,
      theme: 'striped',
      headStyles: { fillColor: [60, 60, 60] },
      styles: { fontSize: 9 }
    });
    
    // Add Cost Config to PDF footer for internal reference? (Optional, maybe skip for client PDF)

    doc.save(`Quote_${prodName}_v${version}.pdf`);
  };

  if (view === 'list') {
    return (
      <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark pb-24 min-h-screen">
        <header className="p-4 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 space-y-4 shrink-0">
          <div className="flex justify-between items-center">
            <button onClick={onBack} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-95"><span className="material-symbols-outlined">arrow_back</span></button>
            <h2 className="text-lg font-bold">Quote History</h2>
            <button onClick={() => { resetForm(); setView('create'); }} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-primary/90 transition-transform active:scale-95">+ New Quote</button>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
            <input type="text" placeholder="Search by Client or Product..." value={quoteSearch} onChange={(e) => setQuoteSearch(e.target.value)} className="w-full pl-10 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm font-bold"/>
          </div>
        </header>
        
        <div className="p-4 space-y-3 overflow-auto">
          {Object.entries(groupedQuotes).map(([key, versions]) => {
            const [client, prod] = key.split('||');
            const latest = versions[0];
            const isStack = versions.length > 1;
            const isExpanded = expandedGroup === key;

            if (isExpanded) {
              return (
                <div key={key} className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-slideUp">
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Versions for {prod}</h3>
                     <button onClick={() => setExpandedGroup(null)} className="text-xs font-bold text-primary bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm">Close Stack</button>
                  </div>
                  {versions.map(v => (
                    <button key={v.id} onClick={() => handleLoadQuote(v)} className="w-full flex justify-between items-center bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary transition-all text-left group active:scale-[0.99]">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">v{v.version || 1}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{new Date(v.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">${v.selected_tier_price.toFixed(2)}/u</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">edit</span>
                    </button>
                  ))}
                </div>
              );
            }

            return (
              <button key={key} onClick={() => isStack ? setExpandedGroup(key) : handleLoadQuote(latest)} className="w-full relative bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary transition-all text-left group active:scale-[0.98]">
                {isStack && <div className="absolute -bottom-1 left-2 right-2 h-4 bg-slate-200 dark:bg-slate-800 rounded-b-xl -z-10"></div>}
                <div className="flex justify-between items-center">
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">{client}</p>
                       {isStack ? (
                          <span className="text-[10px] font-bold text-white bg-slate-400 px-1.5 py-0.5 rounded-md flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">filter_none</span>{versions.length}</span>
                       ) : (
                          <span className="text-[10px] font-bold text-primary bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md">v{latest.version || 1}</span>
                       )}
                     </div>
                     <h3 className="font-bold text-slate-800 dark:text-white">{prod}</h3>
                     <p className="text-xs text-slate-500">SKU: {latest.product_sku}</p>
                   </div>
                   <div className="text-right"><p className="text-sm font-black text-primary">${latest.selected_tier_price.toFixed(2)} / unit</p><p className="text-[10px] text-slate-400">Est. Total: ${(latest.selected_tier_units * latest.selected_tier_price).toLocaleString()}</p></div>
                </div>
              </button>
            );
          })}
          {Object.keys(groupedQuotes).length === 0 && <div className="text-center py-10 text-slate-400">No quotes found.</div>}
        </div>
      </div>
    );
  }

  // --- VIEW: CREATE ---
  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark pb-32 min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white dark:bg-[#111722] p-4 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <button onClick={() => setView('list')} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-95"><span className="material-symbols-outlined">arrow_back</span></button>
        <div className="text-center">
           <h2 className="text-lg font-bold">New Version</h2>
           <p className="text-xs font-bold text-primary uppercase">Quote v{version}</p>
        </div>
        <div className="w-10"></div>
      </header>
      <main className="p-4 space-y-6">
        <section className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Client Name</label>
           <input className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 font-bold outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Sephora / Internal / Acme Corp" value={clientName} onChange={e => setClientName(e.target.value)} />
        </section>
        <section className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-primary">grid_view</span><h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Select Product</h3></div>
          <SearchableSelect label="Product SKU" placeholder="Search saved products..." options={productOptions} value={selectedProductId} onChange={handleProductSelect} />
        </section>

        {/* --- COST CONFIG (NEW) --- */}
        <section className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold uppercase text-slate-500">Pricing Logic</h3></div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Labor/Unit ($)</label><input type="number" value={laborRate} onChange={e => setLaborRate(parseFloat(e.target.value))} className="w-full p-2 text-center border rounded-lg bg-slate-50 dark:bg-slate-900 font-bold"/></div>
             <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Overhead/Unit ($)</label><input type="number" value={overheadRate} onChange={e => setOverheadRate(parseFloat(e.target.value))} className="w-full p-2 text-center border rounded-lg bg-slate-50 dark:bg-slate-900 font-bold"/></div>
             <div><label className="text-[10px] font-bold text-emerald-500 uppercase block mb-1">Target Margin %</label><input type="number" value={targetMargin} onChange={e => setTargetMargin(parseFloat(e.target.value))} className="w-full p-2 text-center border rounded-lg bg-slate-50 dark:bg-slate-900 font-bold text-emerald-600"/></div>
             <div><label className="text-[10px] font-bold text-indigo-500 uppercase block mb-1">Batch Setup ($)</label><input type="number" value={setupCost} onChange={e => setSetupCost(parseFloat(e.target.value))} className="w-full p-2 text-center border rounded-lg bg-slate-50 dark:bg-slate-900 font-bold text-indigo-600"/></div>
           </div>
        </section>

        {/* --- FULL COGS BREAKDOWN --- */}
        <section className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase text-slate-500">Base COGS (Variable)</h3>
              <span className="text-sm font-black text-slate-800 dark:text-white">${costs.baseTotal.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ unit</span></span>
           </div>
           <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><span>Ingredients</span><span className="font-bold">${costs.material.toFixed(2)}</span></div>
              <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><span>Packaging</span><span className="font-bold">${costs.packaging.toFixed(2)}</span></div>
              <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><span>Labor</span><span className="font-bold">${laborRate.toFixed(2)}</span></div>
              <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><span>Overhead</span><span className="font-bold">${overheadRate.toFixed(2)}</span></div>
           </div>
        </section>

        {/* Packaging Selectors */}
        <section className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-slate-500 mb-4">Packaging Setup</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <SearchableSelect label="Container" options={containers} value={selectedContainerId} onChange={setSelectedContainerId} />
             <SearchableSelect label="Closure" options={closures} value={selectedClosureId} onChange={setSelectedClosureId} />
             <SearchableSelect label="Label" options={labels} value={selectedLabelId} onChange={setSelectedLabelId} />
             <SearchableSelect label="Box" options={boxes} value={selectedBoxId} onChange={setSelectedBoxId} />
          </div>
        </section>

        <section>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-1 text-center uppercase">Tier 1</span><input className="w-full rounded-xl text-center font-black text-primary border border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark h-12 p-2" type="number" value={tier1} onChange={(e) => setTier1(Number(e.target.value))}/></div>
            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-1 text-center uppercase">Tier 2</span><input className="w-full rounded-xl text-center font-black text-primary border border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark h-12 p-2" type="number" value={tier2} onChange={(e) => setTier2(Number(e.target.value))}/></div>
            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-1 text-center uppercase">Tier 3</span><input className="w-full rounded-xl text-center font-black text-primary border border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark h-12 p-2" type="number" value={tier3} onChange={(e) => setTier3(Number(e.target.value))}/></div>
          </div>
        </section>
        {selectedRecipe && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark shadow-sm">
             <div className="grid grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 text-[10px] font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700 uppercase"><div className="col-span-3">Units</div><div className="col-span-3 text-right">Setup Impact</div><div className="col-span-3 text-right">Margin</div><div className="col-span-3 text-right text-primary">Price</div></div>
             <QuoteRow result={results.t1} />
             <QuoteRow result={results.t2} highlighted />
             <QuoteRow result={results.t3} />
          </div>
        )}
      </main>
      <div className="fixed bottom-24 left-0 right-0 p-4 z-40 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/90 dark:via-background-dark/90 to-transparent">
        <button onClick={handleDownloadPDF} disabled={!selectedRecipe} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold h-14 rounded-2xl shadow-xl hover:bg-primary/90 disabled:opacity-50 transition-transform active:scale-95">
          <span className="material-symbols-outlined">save</span><span>Save v{version} & Generate PDF</span>
        </button>
      </div>
    </div>
  );
};

const QuoteRow = ({ result, highlighted }: { result: QuoteResult | null, highlighted?: boolean }) => {
  if (!result) return null;
  return (
    <div className={`grid grid-cols-12 gap-2 p-4 items-center border-b border-slate-100 dark:border-slate-800 last:border-0 ${highlighted ? 'bg-primary/5 dark:bg-primary/10 relative' : ''}`}>
      {highlighted && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
      <div className={`col-span-3 font-bold text-sm ${highlighted ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{result.units.toLocaleString()}</div>
      
      {/* Show how much Setup Cost adds to each unit (The Economy of Scale visual) */}
      <div className="col-span-3 text-right"><p className="text-xs font-bold text-indigo-500">+${result.setupPerUnit.toFixed(2)}</p></div>
      
      <div className="col-span-3 text-right"><p className={`text-xs font-bold ${result.margin < 30 ? 'text-red-500' : 'text-emerald-500'}`}>{result.margin.toFixed(0)}%</p></div>
      <div className="col-span-3 text-right"><p className={`font-black text-base ${highlighted ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>${result.recommendedPrice.toFixed(2)}</p></div>
    </div>
  );
};

export default QuoteGenerator;