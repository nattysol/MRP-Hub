/**
 * seed_packaging.cjs
 * Usage: node seed_packaging.cjs
 */
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

// Initialize Firebase (uses the same key as your inventory script)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedPackaging() {
  const items = [];
  const filePath = 'packaging.csv'; // <--- Make sure your file is named this!

  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${filePath} not found. Please save your CSV in this folder.`);
    return;
  }

  console.log("Reading Packaging CSV...");

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      // 1. Data Cleaning & Validation
      const price = parseFloat(row.Price);
      
      // Default category if missing or invalid
      let category = row.Category ? row.Category.trim() : 'Other';
      const validCategories = ['Container', 'Closure', 'Label', 'Box', 'Other'];
      
      // If the spreadsheet has a category not in our list, default to 'Other' to prevent crashes
      if (!validCategories.includes(category)) {
        // Optional: specific mapping logic (e.g. 'Bottle' -> 'Container')
        if (category.includes('Bottle') || category.includes('Jar')) category = 'Container';
        else if (category.includes('Cap') || category.includes('Lid')) category = 'Closure';
        else category = 'Other';
      }

      if (!row.Name) return; // Skip empty rows

      items.push({
        name: row.Name.trim(),
        vendor: row.Vendor ? row.Vendor.trim() : 'Unknown',
        category: category,
        unit_price: isNaN(price) ? 0 : price,
        stock_level: 0 // Default to 0 stock
      });
    })
    .on('end', async () => {
      console.log(`Parsed ${items.length} packaging items. Starting upload...`);
      
      const batchSize = 400; 
      let batch = db.batch();
      let counter = 0;
      let totalUploaded = 0;

      for (const item of items) {
        const docRef = db.collection('packaging').doc(); 
        batch.set(docRef, item);
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

      console.log(`✅ Success! Uploaded ${totalUploaded} packaging items.`);
    });
}

seedPackaging();