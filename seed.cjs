/**
 * seed.js (Fixed for Batch Limits)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// UOM conversion logic
const base_grams = { 
  kg: 1000, 
  lb: 453.592, 
  g: 1, 
  oz: 28.3495, 
  l: 1000, 
  gal: 3785.41,
  unit: 1 
};

async function seedIngredients() {
  const ingredients = [];
  const filePath = 'Cleaned_Ingredients_Master.csv';

  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${filePath} not found. Make sure it is in this folder.`);
    return;
  }

  console.log("Reading CSV...");

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      // Data Cleaning
      const uom = row.purchase_uom ? row.purchase_uom.toLowerCase() : 'unit';
      const price = parseFloat(row.purchase_price) || 0;
      const size = parseFloat(row.purchase_size) || 1;
      const density = parseFloat(row.density) || 1;

      // Logic: Calculate Cost Per Gram
      let grams = base_grams[uom] || 1;
      if (uom === 'l' || uom === 'gal') {
        grams = grams * density;
      }
      const cost_per_gram = price / (size * grams);

      ingredients.push({
        name: row.Name || row.name, // Handle case sensitivity in CSV header
        vendor: row.Vendor || row.vendor || "Unknown",
        purchase_price: price,
        purchase_uom: uom,
        purchase_size: size,
        density: density,
        cost_per_gram: cost_per_gram || 0
      });
    })
    .on('end', async () => {
      console.log(`Parsed ${ingredients.length} ingredients. Starting upload...`);
      
      // --- CHUNKING LOGIC (Fixes the crash) ---
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
          batch = db.batch(); // Start new batch
          counter = 0;
        }
        totalUploaded++;
      }

      // Commit any remaining items
      if (counter > 0) {
        await batch.commit();
      }

      console.log(`✅ Success! Uploaded ${totalUploaded} ingredients.`);
    });
}

seedIngredients();