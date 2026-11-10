// Build script to generate the 8 modular food catalog files
// from the 13-page RegimePlan PDF, Egyptian NNI 2006, USDA FDC, and Acrobat Image References.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../src/clinical/food/data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log("Output directory:", DATA_DIR);
