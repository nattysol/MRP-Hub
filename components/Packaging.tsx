import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { PackagingItem } from '../types';

interface PackagingProps {
  onBack: () => void;
}

const Packaging: React.FC<PackagingProps> = ({ onBack }) => {
  const [items, setItems] = useState<PackagingItem[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Container');
  const [price, setPrice] = useState('');
  const [vendor, setVendor] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'packaging'), orderBy('name'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagingItem)));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
      const matchesCat = filterCat === 'All' || i.category === filterCat;
      return matchesSearch && matchesCat;
    });
  }, [items, search, filterCat]);

  const handleSave = async () => {
    if (!name || !price) return;
    try {
      await addDoc(collection(db, 'packaging'), {
        name,
        category,
        unit_price: parseFloat(price),
        vendor: vendor || 'Unknown',
        created_at: serverTimestamp()
      });
      setIsAdding(false);
      setName(''); setPrice(''); setVendor('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this packaging item?")) {
      await deleteDoc(doc(db, 'packaging', id));
    }
  };

  const categories = ['Container', 'Closure', 'Label', 'Box', 'Other'];

  return (
    <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark pb-24 h-screen">
      <header className="p-4 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 space-y-4 shrink-0">
        <div className="flex justify-between items-center">
          <button onClick={onBack} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-95"><span className="material-symbols-outlined">arrow_back</span></button>
          <h2 className="text-lg font-bold">Packaging Inventory</h2>
          <button onClick={() => setIsAdding(!isAdding)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-primary/90 transition-transform active:scale-95">{isAdding ? 'Cancel' : '+ Add Item'}</button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
            <input type="text" placeholder="Search components..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm font-bold"/>
          </div>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm font-bold text-slate-600 dark:text-slate-300">
            <option value="All">All Types</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </header>
      {isAdding && (
        <div className="p-4 bg-primary/5 dark:bg-primary/10 border-b border-primary/20">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input placeholder="Item Name" className="col-span-2 p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary font-bold" value={name} onChange={e => setName(e.target.value)} />
            <select className="p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary text-sm" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <input placeholder="Price/unit" type="number" className="p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary font-bold" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <input placeholder="Vendor (Optional)" className="flex-1 p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary text-sm" value={vendor} onChange={e => setVendor(e.target.value)} />
            <button onClick={handleSave} className="bg-primary text-white px-6 rounded-lg font-bold text-sm shadow-lg hover:bg-primary/90 transition-transform active:scale-95">Save</button>
          </div>
        </div>
      )}
      <div className="p-4 grid gap-3 overflow-auto">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white dark:bg-card-dark p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center group hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-lg flex items-center justify-center text-lg ${item.category === 'Container' ? 'bg-blue-50 text-blue-500' : item.category === 'Closure' ? 'bg-orange-50 text-orange-500' : item.category === 'Label' ? 'bg-purple-50 text-purple-500' : 'bg-slate-100 text-slate-500'}`}>
                <span className="material-symbols-outlined">{item.category === 'Container' ? 'science' : item.category === 'Closure' ? 'radio_button_checked' : item.category === 'Label' ? 'label' : 'inventory_2'}</span>
              </div>
              <div><h3 className="font-bold text-slate-800 dark:text-white">{item.name}</h3><p className="text-xs text-slate-400">{item.category} • {item.vendor}</p></div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded text-xs">${item.unit_price.toFixed(3)}</span>
              <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined">delete</span></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-10 text-slate-400 italic">No items found</div>}
      </div>
    </div>
  );
};

export default Packaging;