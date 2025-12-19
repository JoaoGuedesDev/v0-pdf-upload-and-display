
const fs = require('fs');
const path = require('path');

const sharedDir = path.join(process.cwd(), 'public', 'shared');
console.log('Writing to:', sharedDir);

if (!fs.existsSync(sharedDir)) {
  console.log('Directory does not exist, creating...');
  fs.mkdirSync(sharedDir, { recursive: true });
}

const filePath = path.join(sharedDir, 'test-file.json');
const content = JSON.stringify({ success: true, dados: { test: 123 } });

try {
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Successfully wrote file.');
} catch (e) {
  console.error('Failed to write file:', e);
}
