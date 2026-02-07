export type UserRole = 'admin' | 'ops' | 'production';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface Ingredient {
  id: string;
  name: string;
  cost_per_gram: number;
  vendor?: string;
  location?: string; // Added Location
  created_at?: any;
  updated_at?: any;
}

export interface RecipeIngredient {
  ingredient_id: string;
  percentage: number;
  weight_kg: number;
}

export interface Recipe {
  id: string;
  name: string;
  project: string;
  version: string;
  status: 'Development' | 'Approved' | 'Archived';
  unit_size_g: number;
  ingredients: RecipeIngredient[];
  date: string;
  created_at?: any;
}

export interface PackagingItem {
  id: string;
  name: string;
  category: 'Container' | 'Closure' | 'Label' | 'Box' | 'Other'; // Added 'Other'
  vendor?: string;
  unit_price: number;
  sku?: string; // <--- FIXED: Added SKU here
  created_at?: any;
  updated_at?: any;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  net_weight: number;
  recipe_id: string;
  recipe_name: string;
  container_id?: string;
  closure_id?: string;
  label_id?: string;
  box_id?: string;
  other_id?: string; // Added for the new "Misc/Other" slot
  total_material_cost: number;
  created_at?: any;
}

export interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  product_name: string;
  product_sku: string;
  version?: number; // Added Version tracking
  date: string;
  selected_tier_units: number;
  selected_tier_price: number;
  selected_tier_total: number;
  
  // Saved Configuration State
  product_id?: string;
  recipe_id?: string;
  container_id?: string;
  closure_id?: string;
  label_id?: string;
  box_id?: string;
  
  // Tier Data
  tier1_units?: number;
  tier2_units?: number;
  tier3_units?: number;
  
  created_at?: any;
}