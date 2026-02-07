import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Ingredient, Recipe, RecipeIngredient } from '../types';
import SearchableSelect from './SearchableSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FormulatorProps {
  onBack: () => void;
  autoCreate?: boolean;
  userName: string;
  initialRecipeId?: string; // <--- NEW PROP
}

const Formulator: React.FC<FormulatorProps> = ({ onBack, autoCreate, userName, initialRecipeId }) => {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Editor State
  const [name, setName] = useState('');
  const [project, setProject] = useState('');
  const [version, setVersion] = useState('1.0');
  const [status, setStatus] = useState('Development');
  const [unitWeight, setUnitWeight] = useState<number>(30);
  const [unitCount, setUnitCount] = useState<number>(100);
  const [batchSize, setBatchSize] = useState<number>(3000);
  const [rows, setRows] = useState<RecipeIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load Data
  useEffect(() => {
    const unsubRec = onSnapshot(query(collection(db, 'recipes'), orderBy('date', 'desc')), snap => {
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Recipe)));
    });
    const unsubIng = onSnapshot(collection(db, 'ingredients'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ingredient));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setIngredients(list);
    });
    return () => { unsubRec(); unsubIng(); };
  }, []);

  // Handle Auto Create (from Dashboard "New" button)
  useEffect(() => {
    if (autoCreate) handleNew();
  }, [autoCreate]);

  // FIX: Handle Opening Specific Recipe (from Dashboard "Recent" click)
  useEffect(() => {
    if (initialRecipeId && recipes.length > 0) {
      const target = recipes.find(r => r.id === initialRecipeId);
      if (target) {
        handleEdit(target);
      }
    }
  }, [initialRecipeId, recipes]); // Runs when recipes load or ID changes

  // ... (Rest of logic: groupedRecipes, handleEdit, handleNew, etc. remains the same)
  // ... (Paste the rest of your Formulator code here from the previous step)
  // For brevity, I will include the handlers to ensure context is correct
  
  const groupedRecipes = useMemo(() => {
    const groups: { [key: string]: Recipe[] } = {};
    const filtered = recipes.filter(r => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return r.name.toLowerCase().includes(lower) || (r.project || '').toLowerCase().includes(lower);
    });
    filtered.forEach(r => {
      if (!groups[r.name]) groups[r.name] = [];
      groups[r.name].push(r);
    });
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => parseFloat(b.version) - parseFloat(a.version));
    });
    return groups;
  }, [recipes, searchTerm]);

  const handleEdit = (original: Recipe) => {
    setName(original.name);
    setProject(original.project);
    const nextVer = (parseFloat(original.version) + 0.1).toFixed(1);
    setVersion(nextVer);
    setStatus('Development');
    setUnitWeight(original.unit_size_g);
    setUnitCount(1);
    setBatchSize(original.unit_size_g);
    setRows(original.ingredients.map(r => ({ ...r })));
    setView('edit');
  };

  const handleNew = () => {
    setName('');
    setProject('');
    setVersion('1.0');
    setStatus('Development');
    setUnitWeight(1000);
    setUnitCount(1);
    setBatchSize(1000);
    setRows([{ ingredient_id: '', percentage: 0, weight_kg: 0 }]); 
    setView('edit');
  };

  // ... (keep batch configs, row changes, PDF gen, etc.)
  const handleBatchConfigChange = (newUnitWeight: number, newUnitCount: number) => {
    setUnitWeight(newUnitWeight);
    setUnitCount(newUnitCount);
    const newTotal = newUnitWeight * newUnitCount;
    setBatchSize(newTotal);
    const scaledRows = rows.map(r => ({ ...r, weight_kg: (r.percentage / 100) * (newTotal / 1000) }));
    setRows(scaledRows);
  };

  const handleRowChange = (index: number, field: 'ingredient_id' | 'weight', value: any) => {
    const newRows = [...rows];
    if (field === 'ingredient_id') {
      newRows[index].ingredient_id = value;
    } else if (field === 'weight') {
      const weightG = parseFloat(value) || 0;
      newRows[index].weight_kg = weightG / 1000;
      newRows[index].percentage = (weightG / batchSize) * 100;
    }
    setRows(newRows);
  };

  const addRow = () => setRows([...rows, { ingredient_id: '', percentage: 0, weight_kg: 0 }]);
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  const ingredientOptions = useMemo(() => ingredients.map(i => ({
    id: i.id, name: i.name, subtitle: `$${(i.cost_per_gram || 0).toFixed(4)}/g`
  })), [ingredients]);

  const stats = useMemo(() => {
    let currentWeight = 0;
    let totalCost = 0;
    rows.forEach(r => {
      const weightG = r.weight_kg * 1000;
      currentWeight += weightG;
      const ing = ingredients.find(i => i.id === r.ingredient_id);
      if (ing) totalCost += weightG * (ing.cost_per_gram || 0);
    });
    return { currentWeight, totalCost, pct: (currentWeight / batchSize) * 100 };
  }, [rows, batchSize, ingredients]);

  const handleSave = async () => {
    if (!name || rows.length === 0) return alert("Missing name or ingredients.");
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'recipes'), {
        name, project, version, status,
        unit_size_g: batchSize,
        ingredients: rows.filter(r => r.ingredient_id),
        date: new Date().toLocaleDateString(),
        created_at: serverTimestamp(),
      });
      alert(`Saved ${name} v${version}`);
      setView('list');
      setExpandedGroup(null);
    } catch (e) {
      console.error(e);
      alert("Error saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();
    const headerColor: [number, number, number] = [40, 40, 40]; 

    doc.setFillColor(...headerColor);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('MANUFACTURING BATCH SHEET', 14, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${today}`, 160, 16);
    doc.text(`By: ${userName}`, 160, 22);

    doc.setTextColor(220, 50, 50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIDENTIAL', 160, 30);

    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text(`Product: ${name}`, 14, 50);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    
    doc.text(`Version: ${version}`, 14, 56);
    doc.text(`Client: ${project || 'Internal'}`, 14, 62);
    
    doc.text(`Target: ${unitCount.toLocaleString()} units @ ${unitWeight}g`, 14, 72);
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Batch Size: ${(batchSize/1000).toFixed(2)} kg`, 160, 50);

    const tableData = rows.map((r, i) => {
      const ing = ingredients.find(ing => ing.id === r.ingredient_id);
      const weightG = r.weight_kg * 1000;
      const loc = ing?.location || '-';
      
      return [ 
        (i + 1).toString(), 
        ing?.name || 'Unknown', 
        loc, 
        `${weightG.toFixed(2)} g`, 
        `${r.percentage.toFixed(2)} %`, 
        '___' 
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [['#', 'Ingredient Name', 'Location', 'Weight (g)', 'Percent', 'Verify']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: headerColor, halign: 'left' },
      styles: { cellPadding: 4, fontSize: 10 },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 30, fontStyle: 'italic', textColor: 100 }, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'right' }, 5: { cellWidth: 20, halign: 'center' } }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.text('Production Notes / Observations:', 14, finalY);
    doc.setDrawColor(200);
    doc.line(14, finalY + 8, 196, finalY + 8);
    doc.save(`BatchRecord_${name}_v${version}.pdf`);
  };

  if (view === 'list') {
    return (
      <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark pb-24 h-screen">
        <header className="p-4 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 space-y-4 shrink-0">
          <div className="flex justify-between items-center">
            <button onClick={onBack} className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-transform active:scale-95">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold">Formula Library</h2>
            <button onClick={handleNew} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-primary/90 transition-transform active:scale-95">+ New</button>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
            <input 
              type="text" placeholder="Search by Formula or Client..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
            />
          </div>
        </header>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
          {Object.entries(groupedRecipes).map(([name, versions], index) => {
            const latest = versions[0];
            const isStack = versions.length > 1;
            const isExpanded = expandedGroup === name;

            if (isExpanded) {
              return (
                <div key={name} className="col-span-full bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-slideUp">
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Versions of {name}</h3>
                     <button onClick={() => setExpandedGroup(null)} className="text-xs font-bold text-primary bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm">Close Stack</button>
                  </div>
                  {versions.map(ver => (
                    <button key={ver.id} onClick={() => handleEdit(ver)} className="w-full flex justify-between items-center bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary transition-all text-left group active:scale-[0.99]">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">v{ver.version}</span>
                          <span className={`text-[10px] font-bold uppercase ${ver.status === 'Approved' ? 'text-emerald-500' : 'text-slate-400'}`}>{ver.status}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">{ver.date}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">edit</span>
                    </button>
                  ))}
                </div>
              );
            }

            return (
              <button 
                key={name} 
                onClick={() => isStack ? setExpandedGroup(name) : handleEdit(latest)}
                className="relative bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary transition-all text-left group active:scale-[0.98]"
              >
                {isStack && <div className="absolute -bottom-1 left-2 right-2 h-4 bg-slate-200 dark:bg-slate-800 rounded-b-xl -z-10"></div>}
                
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${latest.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {latest.status || 'Development'}
                  </span>
                  {isStack ? (
                    <span className="text-xs font-bold text-white bg-slate-400 px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">filter_none</span>
                      {versions.length}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-primary bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">v{latest.version}</span>
                  )}
                </div>
                
                <h3 className="font-bold text-slate-800 dark:text-white mb-1 group-hover:text-primary">{latest.name}</h3>
                <p className="text-xs text-slate-400 font-medium mb-3">{latest.project || 'No Client'}</p>
                
                <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="material-symbols-outlined text-[16px]">scale</span>
                  <span>{latest.unit_size_g}g Ref</span>
                  {isStack && <span className="ml-auto text-primary font-bold">View History &rarr;</span>}
                </div>
              </button>
            );
          })}
          {Object.keys(groupedRecipes).length === 0 && <div className="col-span-full text-center py-10 text-slate-400">No formulas found for "{searchTerm}"</div>}
        </div>
      </div>
    );
  }

  // (Editor View Code remains the same as provided previously...)
  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark h-screen pb-24">
      <header className="p-4 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
        <button onClick={() => setView('list')} className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-transform active:scale-95">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Editing Version</h2>
          <p className="text-lg font-black text-primary">v{version}</p>
        </div>
        <div className="flex gap-2">
           <button onClick={handleDownloadPDF} className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition-transform active:scale-95">
            <span className="material-symbols-outlined">picture_as_pdf</span>
          </button>
          <button onClick={handleSave} disabled={isSaving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-primary/90 transition-transform active:scale-95">
            {isSaving ? 'Saving...' : 'Save New v.'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 space-y-6">
        <section className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Formula Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 font-bold outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Client</label>
              <input value={project} onChange={e => setProject(e.target.value)} className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
             <div className="flex items-center gap-2 mb-3"><span className="material-symbols-outlined text-primary">calculate</span><h3 className="text-xs font-bold uppercase text-slate-500">Batch Calculator</h3></div>
             <div className="grid grid-cols-12 gap-2 items-end">
               <div className="col-span-4"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Unit Size (g)</label><input type="number" value={unitWeight} onChange={e => handleBatchConfigChange(parseFloat(e.target.value), unitCount)} className="w-full p-2 text-center border rounded-lg bg-white dark:bg-slate-900 font-bold outline-none focus:ring-1 focus:ring-primary"/></div>
               <div className="col-span-1 flex justify-center pb-3 text-slate-400 font-black">×</div>
               <div className="col-span-3"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Units</label><input type="number" value={unitCount} onChange={e => handleBatchConfigChange(unitWeight, parseFloat(e.target.value))} className="w-full p-2 text-center border rounded-lg bg-white dark:bg-slate-900 font-bold outline-none focus:ring-1 focus:ring-primary"/></div>
               <div className="col-span-1 flex justify-center pb-3 text-slate-400 font-black">=</div>
               <div className="col-span-3"><label className="text-[10px] font-bold text-primary uppercase block mb-1">Total (g)</label><div className="w-full p-2 text-center border border-primary/30 bg-primary/5 text-primary rounded-lg font-black">{batchSize.toLocaleString()}</div></div>
             </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex justify-between items-end px-1"><h3 className="text-xs font-bold text-slate-500 uppercase">Ingredients</h3><span className={`text-xs font-bold ${Math.abs(stats.pct - 100) < 0.1 ? 'text-emerald-500' : 'text-orange-500'}`}>Fill: {stats.pct.toFixed(2)}%</span></div>
          {rows.map((row, index) => (
            <div key={index} className="flex gap-2 items-start bg-white dark:bg-card-dark p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex-1"><SearchableSelect label={index === 0 ? "Ingredient" : ""} placeholder="Search..." options={ingredientOptions} value={row.ingredient_id} onChange={(val) => handleRowChange(index, 'ingredient_id', val)}/></div>
              <div className="w-24">{index === 0 && <label className="text-[10px] font-bold text-primary uppercase block mb-1">Grams</label>}
              <input type="number" className="w-full p-2 text-center border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-1 focus:ring-primary font-bold" value={row.weight_kg ? row.weight_kg * 1000 : ''} onChange={(e) => handleRowChange(index, 'weight', e.target.value)}/></div>
              <div className="w-16 pt-0.5">{index === 0 && <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">%</label>}
              <div className="h-[38px] flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg">{row.percentage.toFixed(1)}%</div></div>
              <div className={`flex flex-col justify-end ${index === 0 ? 'mt-6' : 'mt-1.5'}`}><button onClick={() => removeRow(index)} className="p-2 text-slate-300 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button></div>
            </div>
          ))}
          <button onClick={addRow} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 font-bold text-sm hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"><span className="material-symbols-outlined">add</span> Add Ingredient</button>
        </section>
        <div className="h-24"></div>
        <div className="fixed bottom-24 left-4 right-4 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center z-40">
           <div><p className="text-xs text-slate-400 font-bold uppercase">Batch Cost</p><p className="text-2xl font-black">${stats.totalCost.toFixed(2)}</p></div>
           <div className="text-right"><p className="text-xs text-slate-400">Total Weight</p><p className={`text-sm font-bold ${Math.abs(stats.currentWeight - batchSize) > 1 ? 'text-red-400' : 'text-emerald-400'}`}>{stats.currentWeight.toFixed(1)}g / {batchSize}g</p></div>
        </div>
      </main>
    </div>
  );
};
export default Formulator;