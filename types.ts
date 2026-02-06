
export type UOM = 'kg' | 'lb' | 'gal' | 'l' | 'oz' | 'g' | 'unit';

export interface Ingredient {
  id: string;
  name: string;
  vendor: string;
  purchase_price: number;
  purchase_uom: UOM;
  purchase_size: number;
  density: number;
  cost_per_gram: number;
  stock_level?: number;
  location?: string;
  image_url?: string;
  created_at?: any;    // <--- Add this (for the timestamp)
}

// --- UPDATED PACKAGING INTERFACE ---
export interface PackagingItem {
  id: string;
  name: string;
  category: 'Container' | 'Closure' | 'Label' | 'Box' | 'Other';
  vendor: string;
  unit_price: number;
  stock_level?: number;
}

export interface RecipeIngredient {
  ingredient_id: string;
  weight_kg: number;
  percentage: number;
}

export interface Recipe {
  id: string;
  name: string;
  client: string;
  project: string;
  version: string;
  date: string;
  unit_size_g: number;
  batch_size_units: number;
  status: 'Draft' | 'Approved' | 'Archived';
  ingredients: RecipeIngredient[];
}

export interface QuoteTier {
  quantity: number;
  unit_price: number;
  total_cost: number;
}
// --- NEW PRODUCT INTERFACE ---
export interface Product {
  id: string;
  name: string; // e.g. "Sleep Tincture 1oz"
  sku: string;  // e.g. "SLP-100-01"
  recipe_id: string;
  recipe_name: string;
  container_id?: string;
  closure_id?: string;
  label_id?: string;
  box_id?: string;
  total_material_cost: number; // Liquid Cost + Packaging Cost
}
export interface Product {
  id: string;
  name: string;
  sku: string;
  net_weight: number; // <--- NEW: e.g. 30 (for 30g/ml)
  recipe_id: string;
  recipe_name: string;
  container_id?: string;
  closure_id?: string;
  label_id?: string;
  box_id?: string;
  total_material_cost: number;
  created_at?: string; // Optional timestamp
}
export interface Quote {
  id: string;
  quote_number: string;
  date: string;
  client_name: string;
  product_name: string;
  product_sku: string;
  
  // We save the "Tier 1" snapshot for the card view summary
  selected_tier_units: number;
  selected_tier_price: number;
  selected_tier_total: number;
  
  // We store the full data to regenerate PDF if needed
  full_data: any;
}
export type UserRole = 'admin' | 'ops' | 'production';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
}