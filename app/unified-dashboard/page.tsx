'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getMonthlyFiles } from './actions'
import { MonthlyFile } from './types'
import { AnnualDashboard } from './components/AnnualDashboard'
import { Loader2 } from 'lucide-react'
import { LoadingScreen } from '@/components/loading-screen'

function DashboardContent() {
  const [files, setFiles] = useState<MonthlyFile[]>([])
  const [invalidFiles, setInvalidFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  
  const searchParams = useSearchParams()

  const handleFilesUpdated = (newFiles: MonthlyFile[]) => {
    setFiles(newFiles)
  }

  const handleInvalidFilesUpdated = (newInvalidFiles: string[]) => {
    setInvalidFiles(newInvalidFiles)
  }

  useEffect(() => {
    async function loadData() {
      try {
        const { files: data, invalidFiles: invalid } = await getMonthlyFiles()
        setFiles(data)
        setInvalidFiles(invalid)
        
        // Check for auto-selection from URL
        // const targetFilename = searchParams.get('file')
        // if (targetFilename) {
        //   // We let the render logic handle initial selection via props
        // }
      } catch (error) {
        console.error("Failed to load dashboard files", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [searchParams])

  if (loading) {
    return <LoadingScreen message="Carregando dados do dashboard..." />
  }

  // Always return AnnualDashboard, passing the necessary props
  // We can determine the initial target CNPJ from the URL file or default to the first file's company
  
  // Find initial file if specified in URL
  const targetFilename = searchParams.get('file')
  const initialFileIndex = targetFilename 
    ? files.findIndex(f => f.filename === targetFilename)
    : undefined
    
  const initialCnpj = initialFileIndex !== undefined && files[initialFileIndex]
    ? files[initialFileIndex].data.identificacao.cnpj
    : files[0]?.data.identificacao.cnpj

  return (
    <AnnualDashboard
      files={files}
      invalidFiles={invalidFiles}
      initialTargetCnpj={initialCnpj}
      initialViewIndex={initialFileIndex !== -1 ? initialFileIndex : undefined}
      onFilesUpdated={handleFilesUpdated}
      onInvalidFilesUpdated={handleInvalidFilesUpdated}
    />
  )
}

export default function UnifiedDashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Carregando..." />}>
      <DashboardContent />
    </Suspense>
  )
}
