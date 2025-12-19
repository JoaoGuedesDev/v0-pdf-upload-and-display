
const fs = require('fs');
const path = require('path');

async function getMonthlyFiles() {
  const sharedDir = path.join(process.cwd(), 'public', 'shared');
  console.log('Reading from:', sharedDir);
  
  try {
    const files = fs.readdirSync(sharedDir);
    console.log('All files:', files);
    const jsonFiles = files.filter(file => file.endsWith('.json')); // Simplified filter
    console.log('JSON files:', jsonFiles);
    
    const results = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(sharedDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(fileContent);
        
        if (json.success && json.dados) {
          results.push({
            filename: file,
            data: json.dados
          });
        } else {
            console.log(`File ${file} skipped: success=${json.success}, hasDados=${!!json.dados}`);
        }
      } catch (e) {
        console.error(`Error reading file ${file}:`, e);
      }
    }
    
    console.log(`Found ${results.length} valid files.`);
    return results;
    
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

getMonthlyFiles();
