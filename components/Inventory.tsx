import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Ingredient } from '../types';

interface InventoryProps {
  onBack: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ onBack }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  
  // UI State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Track which item is being edited

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    vendor: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'ingredients'), orderBy('name'));
    const unsub = onSnapshot(q, (snapshot) => {
      setIngredients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient)));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase())), [ingredients, search]);

  // --- HANDLERS ---

  const startAdd = () => {
    setEditingId(null);
    setFormData({ name: '', cost: '', vendor: '' });
    setIsAdding(true);
  };

  const startEdit = (ing: Ingredient) => {
    setIsAdding(false);
    setEditingId(ing.id);
    setFormData({
      name: ing.name,
      cost: ing.cost_per_gram.toString(),
      vendor: ing.vendor || ''
    });
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', cost: '', vendor: '' });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.cost) return alert("Name and Cost are required");

    const payload = {
      name: formData.name,
      cost_per_gram: parseFloat(formData.cost),
      vendor: formData.vendor || 'Unknown',
      updated_at: serverTimestamp()
    };

    try {
      if (isAdding) {
        // CREATE
        await addDoc(collection(db, 'ingredients'), {
          ...payload,
          created_at: serverTimestamp()
        });
      } else if (editingId) {
        // UPDATE
        await updateDoc(doc(db, 'ingredients', editingId), payload);
      }
      cancelForm(); // Close form on success
    } catch (e) {
      console.error(e);
      alert("Error saving ingredient");
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (window.confirm("Are you sure? This will remove the ingredient from all future calculations.")) {
      await deleteDoc(doc(db, 'ingredients', editingId));
      cancelForm();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark pb-24 h-screen">
      <header className="p-4 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 space-y-4 shrink-0">
        <div className="flex justify-between items-center">
          <button onClick={onBack} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-95">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold">Inventory</h2>
          <button 
            onClick={isAdding ? cancelForm : startAdd} 
            className={`px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95 ${isAdding ? 'bg-slate-200 text-slate-600' : 'bg-primary text-white hover:bg-primary/90'}`}
          >
            {isAdding ? 'Cancel' : '+ Add Item'}
          </button>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
          <input 
            type="text" 
            placeholder="Search ingredients..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full pl-10 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
          />
        </div>
      </header>

      {/* EDIT / ADD FORM OVERLAY (Shows when adding OR editing) */}
      {(isAdding || editingId) && (
        <div className="p-4 bg-primary/5 dark:bg-primary/10 border-b border-primary/20 animate-slideUp">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">{isAdding ? 'New Ingredient' : 'Editing Ingredient'}</h3>
            {editingId && (
              <button onClick={handleDelete} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">delete</span> Delete
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-8">
               <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
               <input 
                 className="w-full p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary font-bold" 
                 value={formData.name} 
                 onChange={e => setFormData({...formData, name: e.target.value})} 
               />
            </div>
            <div className="col-span-4">
               <label className="text-[10px] font-bold text-slate-400 uppercase">Cost / g</label>
               <input 
                 type="number" 
                 className="w-full p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary font-bold text-right" 
                 value={formData.cost} 
                 onChange={e => setFormData({...formData, cost: e.target.value})} 
               />
            </div>
          </div>
          
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Vendor</label>
              <input 
                className="w-full p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary text-sm" 
                value={formData.vendor} 
                onChange={e => setFormData({...formData, vendor: e.target.value})} 
              />
            </div>
            <div className="flex gap-2">
               <button onClick={cancelForm} className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg font-bold text-sm text-slate-500 shadow-sm hover:bg-slate-50">Cancel</button>
               <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-lg hover:bg-primary/90">Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 grid gap-3 overflow-auto">
        {filtered.map((ing) => (
          <button 
            key={ing.id} 
            onClick={() => startEdit(ing)}
            className={`w-full text-left bg-white dark:bg-card-dark p-3 rounded-xl border shadow-sm flex justify-between items-center group transition-all active:scale-[0.98] ${editingId === ing.id ? 'border-primary ring-1 ring-primary' : 'border-slate-200 dark:border-slate-800 hover:border-primary/50'}`}
          >
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">{ing.name}</h3>
              <p className="text-xs text-slate-400">{ing.vendor}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded text-xs">${(ing.cost_per_gram || 0).toFixed(4)}/g</span>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">edit</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <div className="text-center py-10 text-slate-400">No ingredients found.</div>}
      </div>
    </div>
  );
};

export default Inventory;