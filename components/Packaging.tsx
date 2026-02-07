import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { PackagingItem } from '../types';

interface PackagingProps {
  onBack: () => void;
}

const Packaging: React.FC<PackagingProps> = ({ onBack }) => {
  const [items, setItems] = useState<PackagingItem[]>([]);
  const [search, setSearch] = useState('');
  
  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Container',
    vendor: '',
    unit_price: '',
    sku: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'packaging'), orderBy('category'), orderBy('name'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagingItem)));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.vendor || '').toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  const startAdd = () => {
    setEditingId(null);
    setFormData({ name: '', category: 'Container', vendor: '', unit_price: '', sku: '' });
    setIsFormOpen(true);
  };

  const startEdit = (item: PackagingItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      vendor: item.vendor || '',
      unit_price: item.unit_price.toString(),
      sku: item.sku || ''
    });
    setIsFormOpen(true);
  };

  const cancelForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.unit_price) return alert("Name and Price are required.");
    
    const payload = {
      name: formData.name,
      category: formData.category,
      vendor: formData.vendor || 'Unknown',
      unit_price: parseFloat(formData.unit_price),
      sku: formData.sku || '',
      updated_at: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'packaging', editingId), payload);
      } else {
        await addDoc(collection(db, 'packaging'), {
          ...payload,
          created_at: serverTimestamp()
        });
      }
      cancelForm();
    } catch (e) {
      console.error(e);
      alert("Error saving item");
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (window.confirm("Are you sure you want to delete this packaging item?")) {
      await deleteDoc(doc(db, 'packaging', editingId));
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
          <h2 className="text-lg font-bold">Packaging Library</h2>
          <button onClick={startAdd} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-primary/90 transition-transform active:scale-95">+ Add New</button>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
          <input 
            type="text" placeholder="Search packaging..." 
            value={search} onChange={(e) => setSearch(e.target.value)} 
            className="w-full pl-10 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
          />
        </div>
      </header>

      {/* ADD / EDIT FORM */}
      {isFormOpen && (
        <div className="p-4 bg-primary/5 dark:bg-primary/10 border-b border-primary/20 animate-slideUp">
           <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">{editingId ? 'Edit Item' : 'New Packaging Item'}</h3>
            {editingId && (
              <button onClick={handleDelete} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">delete</span> Delete
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
               <label className="text-[10px] font-bold text-slate-400 uppercase">Item Name</label>
               <input className="w-full p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. 30ml Amber Glass Dropper" />
            </div>
            <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
               <select className="w-full p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary font-bold text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                 <option value="Container">Container</option>
                 <option value="Closure">Closure</option>
                 <option value="Label">Label</option>
                 <option value="Box">Box</option>
                 <option value="Other">Other</option>
               </select>
            </div>
            <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase">Vendor</label>
               <input className="w-full p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary text-sm" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} />
            </div>
            <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase">Unit Price ($)</label>
               <input type="number" className="w-full p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary font-bold" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value})} placeholder="0.00" />
            </div>
            <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase">SKU / Ref</label>
               <input className="w-full p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary text-sm" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
             <button onClick={cancelForm} className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg font-bold text-sm text-slate-500 shadow-sm hover:bg-slate-50">Cancel</button>
             <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-lg hover:bg-primary/90">Save Item</button>
          </div>
        </div>
      )}

      <div className="p-4 grid gap-3 overflow-auto">
        {filtered.map((item) => (
          <button 
            key={item.id} 
            onClick={() => startEdit(item)}
            className={`w-full text-left bg-white dark:bg-card-dark p-3 rounded-xl border shadow-sm flex justify-between items-center group transition-all active:scale-[0.98] ${editingId === item.id ? 'border-primary ring-1 ring-primary' : 'border-slate-200 dark:border-slate-800 hover:border-primary/50'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-lg flex items-center justify-center text-lg ${
                item.category === 'Container' ? 'bg-blue-50 text-blue-500' :
                item.category === 'Closure' ? 'bg-orange-50 text-orange-500' :
                item.category === 'Label' ? 'bg-purple-50 text-purple-500' :
                'bg-slate-100 text-slate-500'
              }`}>
                <span className="material-symbols-outlined">
                  {item.category === 'Container' ? 'science' : 
                   item.category === 'Closure' ? 'expand_circle_down' :
                   item.category === 'Label' ? 'label' : 
                   item.category === 'Box' ? 'inventory_2' : 'category'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</h3>
                <p className="text-xs text-slate-400">{item.category} • {item.vendor || 'No Vendor'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-primary text-sm">${item.unit_price.toFixed(3)}</p>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider group-hover:text-primary transition-colors">Edit</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Packaging;