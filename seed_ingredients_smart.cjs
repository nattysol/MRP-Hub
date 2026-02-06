/**
 * seed_ingredients_smart.cjs
 * Usage: node seed_ingredients_smart.cjs
 */
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

// Initialize Firebase
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper to find a column regardless of case or slight name variation
const findVal = (row, keys) => {
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    // Exact match check
    if (row[k] !== undefined) return row[k];
    // Case-insensitive check
    const match = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
    if (match) return row[match];
  }
  return null;
};

// Helper to clean currency strings (e.g. "$1,200.50" -> 1200.50)
const parseMoney = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const clean = val.toString().replace(/[$,]/g, '').trim();
  return parseFloat(clean) || 0;
};

const base_grams = { 
  kg: 1000, lb: 453.592, g: 1, oz: 28.3495, 
  l: 1000, gal: 3785.41, unit: 1, ml: 1 // Added ml just in case
};

async function seedIngredients() {
  const ingredients = [];
  // CHANGE THIS if your filename is different
  const filePath = 'Cleaned_Ingredients_Master.csv'; 

  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${filePath} not found. Please make sure the CSV is in this folder.`);
    return;
  }

  console.log("Reading CSV and auto-detecting columns...");

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      // 1. Smart Column Matching
      const name = findVal(row, ['name', 'Name', 'Ingredient', 'Item', 'Product']);
      const vendor = findVal(row, ['vendor', 'Vendor', 'Supplier', 'Source']) || 'Unknown';
      const uomRaw = findVal(row, ['purchase_uom', 'UOM', 'Unit', 'Purchase Unit']) || 'unit';
      
      const priceRaw = findVal(row, ['purchase_price', 'Price', 'Cost', 'Unit Price', 'Cost Per Unit']);
      const sizeRaw = findVal(row, ['purchase_size', 'Size', 'Qty', 'Quantity']);
      const densityRaw = findVal(row, ['density', 'Density', 'Specific Gravity']);

      if (!name) return; // Skip empty rows

      // 2. Data Cleaning
      const price = parseMoney(priceRaw);
      const size = parseFloat(sizeRaw) || 1;
      const density = parseFloat(densityRaw) || 1;
      const uom = uomRaw.toLowerCase().trim();

      // 3. Math Logic
      let grams = base_grams[uom] || 1;
      // Adjust for liquids
      if (uom === 'l' || uom === 'gal' || uom === 'ml' || uom === 'fl oz') {
        grams = grams * density;
      }
      
      const cost_per_gram = price / (size * grams);

      ingredients.push({
        name: name,
        vendor: vendor,
        purchase_price: price,
        purchase_uom: uom,
        purchase_size: size,
        density: density,
        cost_per_gram: isFinite(cost_per_gram) ? cost_per_gram : 0
      });
    })
    .on('end', async () => {
      console.log(`Parsed ${ingredients.length} ingredients.`);
      if (ingredients.length > 0) {
        console.log(`Preview of first item:`, ingredients[0]);
      }

      console.log("Starting upload...");
      
      const batchSize = 400; 
      let batch = db.batch();
      let counter = 0;
      let totalUploaded = 0;

      for (const ing of ingredients) {
        const docRef = db.collection('ingredients').doc(); 
        batch.set(docRef, ing);
        counter++;

        if (counter === batchSize) {
          await batch.commit();
          console.log(`...Saved batch of ${batchSize}`);
          batch = db.batch();
          counter = 0;
        }
        totalUploaded++;
      }

      if (counter > 0) {
        await batch.commit();
      }

      console.log(`✅ Success! Uploaded ${totalUploaded} ingredients with corrected prices.`);
    });
}

seedIngredients();