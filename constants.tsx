
import { Ingredient, Recipe, UOM } from './types';

export const BASE_GRAMS: Record<UOM, number> = {
  kg: 1000,
  lb: 453.592,
  g: 1,
  oz: 28.3495,
  l: 1000,
  gal: 3785.41,
  unit: 1
};

export const MOCK_INGREDIENTS: Ingredient[] = [
  {
    id: 'VC-001',
    name: 'Vitamin C (Ascorbic Acid)',
    vendor: 'Global Bio',
    purchase_price: 12.50,
    purchase_uom: 'kg',
    purchase_size: 1,
    density: 1.65,
    cost_per_gram: 0.0125,
    stock_level: 500,
    location: 'Warehouse A-12',
    image_url: 'https://picsum.photos/seed/vitaminc/200/200'
  },
  {
    id: 'PP-055',
    name: 'Organic Pea Protein',
    vendor: 'NatureSource',
    purchase_price: 8.20,
    purchase_uom: 'kg',
    purchase_size: 1,
    density: 0.45,
    cost_per_gram: 0.0082,
    stock_level: 800,
    location: 'Warehouse B-04',
    image_url: 'https://picsum.photos/seed/peaprotein/200/200'
  },
  {
    id: 'MG-102',
    name: 'Magnesium Citrate',
    vendor: 'ChemPure',
    purchase_price: 18.45,
    purchase_uom: 'kg',
    purchase_size: 1,
    density: 1.80,
    cost_per_gram: 0.01845,
    stock_level: 120,
    location: 'Cabinet C-01',
    image_url: 'https://picsum.photos/seed/magnesium/200/200'
  }
];

export const MOCK_RECIPE: Recipe = {
  id: 'REC-001',
  name: 'Protein Shake v2',
  client: 'Wellness Co.',
  project: 'Core Line Expansion',
  version: 'v1.2',
  date: 'Oct 24',
  unit_size_g: 500,
  batch_size_units: 1000,
  status: 'Draft',
  ingredients: [
    { ingredient_id: 'VC-001', weight_kg: 225, percentage: 45 },
    { ingredient_id: 'PP-055', weight_kg: 125, percentage: 25 },
    { ingredient_id: 'MG-102', weight_kg: 50, percentage: 10 },
  ]
};
