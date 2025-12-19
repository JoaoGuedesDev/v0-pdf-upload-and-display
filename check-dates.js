
const fs = require('fs');
const path = require('path');

async function checkDates() {
  const sharedDir = path.join(process.cwd(), 'public', 'shared');
  const files = fs.readdirSync(sharedDir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(sharedDir, file), 'utf-8'));
      if (content.success && content.dados) {
        const pa = content.dados.identificacao.periodoApuracao;
        console.log(`File: ${file}, PA: "${pa}"`);
        
        try {
            const dateStr = pa.split(' a ')[0];
            const parts = dateStr.split('/');
            if (parts.length !== 3) throw new Error("Invalid date format");
            const [day, month, year] = parts;
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (isNaN(date.getTime())) throw new Error("Invalid date");
        } catch (e) {
            console.error(`ERROR parsing date in ${file}: ${e.message}`);
        }
      }
    } catch (e) {
      // ignore read errors
    }
  }
}

checkDates();
