'use server'

import fs from 'fs';
import path from 'path';
import { MonthlyFile, DashboardData } from './types';

export async function getMonthlyFiles(): Promise<MonthlyFile[]> {
  const sharedDir = path.join(process.cwd(), 'public', 'shared');
  
  try {
    console.log(`[getMonthlyFiles] Scanning directory: ${sharedDir}`);
    const files = fs.readdirSync(sharedDir);
    const jsonFiles = files.filter(file => file.startsWith('dash-') && file.endsWith('.json'));
  console.log(`[getMonthlyFiles] Found ${jsonFiles.length} candidate files.`);

  if (jsonFiles.length > 0) {
      try {
          const firstPath = path.join(sharedDir, jsonFiles[0]);
          const firstContent = JSON.parse(fs.readFileSync(firstPath, 'utf-8'));
          console.log(`[getMonthlyFiles] First file (${jsonFiles[0]}) sample data:`, JSON.stringify(firstContent.dados?.receitas));
      } catch (e) {
          console.error(`[getMonthlyFiles] Failed to read sample file:`, e);
      }
  }

  const results: MonthlyFile[] = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(sharedDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const content = JSON.parse(fileContent);
        
        if (content.success && content.dados) {
          results.push({
            filename: file,
            data: content.dados as DashboardData
          });
        } else {
          console.warn(`[getMonthlyFiles] Skipping file ${file}: success=${content.success}, hasDados=${!!content.dados}`);
        }
      } catch (error) {
        console.error(`[getMonthlyFiles] Error processing file ${file}:`, error);
      }
    }

    console.log(`[getMonthlyFiles] Returning ${results.length} valid files.`);
    
    // Sort by period (assuming periodoApuracao is in format "DD/MM/YYYY a ...")
    // We can extract the month/year from the start date
    return results.sort((a, b) => {
      const getDate = (d: DashboardData) => {
        const dateStr = d.identificacao.periodoApuracao.split(' a ')[0]; // "01/12/2024"
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
      };
      return getDate(a.data) - getDate(b.data);
    });
    
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}
