'use server'

import fs from 'fs';
import path from 'path';
import { MonthlyFile, DashboardData } from './types';

export async function getMonthlyFiles(): Promise<{ files: MonthlyFile[], invalidFiles: string[] }> {
  const sharedDir = path.join(process.cwd(), 'public', 'shared');
  
  try {
    console.log(`[getMonthlyFiles] Scanning directory: ${sharedDir}`);
    // Create directory if it doesn't exist
    if (!fs.existsSync(sharedDir)) {
      console.log(`[getMonthlyFiles] Directory not found, creating...`);
      fs.mkdirSync(sharedDir, { recursive: true });
      return { files: [], invalidFiles: [] };
    }

    const files = fs.readdirSync(sharedDir);
    const jsonFiles = files.filter(file => file.startsWith('dash-') && file.endsWith('.json'));
    console.log(`[getMonthlyFiles] Found ${jsonFiles.length} candidate files.`);

    const results: MonthlyFile[] = [];
    const invalidFiles: string[] = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(sharedDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const content = JSON.parse(fileContent);
        
        const validateAndAdd = (items: MonthlyFile[]) => {
            items.forEach(item => {
                const hasCnpj = item.data?.identificacao?.cnpj && item.data.identificacao.cnpj.length > 0;
                const hasPeriodo = item.data?.identificacao?.periodoApuracao && item.data.identificacao.periodoApuracao.length > 0;
                
                if (hasCnpj && hasPeriodo) {
                    results.push(item);
                } else {
                    // If validation fails, we add it to invalidFiles. 
                    // Note: 'item.filename' might be a path or name inside the JSON.
                    invalidFiles.push(item.filename || `Arquivo desconhecido em ${file}`);
                }
            });
        };

        if (content.isAnnual && Array.isArray(content.files)) {
           // New Annual/Multi-company format
           validateAndAdd(content.files);
           
           if (Array.isArray(content.invalidFiles)) {
             invalidFiles.push(...content.invalidFiles);
           }
        } else if (content.success && content.dados) {
          // Old single file format
          const item: MonthlyFile = {
            filename: file,
            data: content.dados as DashboardData
          };
          validateAndAdd([item]);
        } else {
          console.warn(`[getMonthlyFiles] Skipping file ${file}: Unknown format`);
        }
      } catch (error) {
        console.error(`[getMonthlyFiles] Error processing file ${file}:`, error);
      }
    }

    console.log(`[getMonthlyFiles] Returning ${results.length} valid files and ${invalidFiles.length} invalid files.`);
    
    // Sort by period
    const sortedFiles = results.sort((a, b) => {
      const getDate = (d: DashboardData) => {
        const dateStr = d.identificacao.periodoApuracao.split(' a ')[0]; // "01/12/2024"
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
      };
      return getDate(a.data) - getDate(b.data);
    });
    
    return { files: sortedFiles, invalidFiles };
    
  } catch (error) {
    console.error('Error listing files:', error);
    return { files: [], invalidFiles: [] };
  }
}
