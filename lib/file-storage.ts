
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function saveUploadedFile(file: File, type: 'monthly' | 'annual', cnpj: string, period: string) {
    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Sanitize CNPJ
        const safeCnpj = cnpj.replace(/[^\d]/g, '')
        
        // Extract Year/Month
        // Period usually MM/AAAA
        const [month, year] = period.split('/')
        const safeYear = year || 'unknown'
        const safeMonth = month || 'unknown'

        // Construct Path
        // storage/{type}/{cnpj}/{year}/{filename}
        const baseDir = path.join(process.cwd(), 'storage', type, safeCnpj, safeYear)
        
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true })
        }

        const fileName = `${safeYear}-${safeMonth}_${file.name}`
        const filePath = path.join(baseDir, fileName)

        // Write file
        fs.writeFileSync(filePath, buffer)
        
        return filePath
    } catch (e) {
        console.error("Failed to save file:", e)
        return null
    }
}
