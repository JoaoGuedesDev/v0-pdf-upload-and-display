'use client'

import { useState, useEffect } from 'react'
import { getMonthlyFiles } from './actions'
import { MonthlyFile } from './types'
import { SelectionScreen } from './components/SelectionScreen'
import { MonthlyView } from './components/MonthlyView'
import { AnnualDashboard } from './components/AnnualDashboard'
import { Loader2 } from 'lucide-react'
import { LoadingScreen } from '@/components/loading-screen'

export default function UnifiedDashboardPage() {
  const [files, setFiles] = useState<MonthlyFile[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'selection' | 'monthly' | 'annual'>('selection')
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0)

  const handleFilesUpdated = (newFiles: MonthlyFile[]) => {
    setFiles(newFiles)
  }

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getMonthlyFiles()
        setFiles(data)
      } catch (error) {
        console.error("Failed to load dashboard files", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return <LoadingScreen message="Carregando dados do dashboard..." />
  }

  if (viewMode === 'monthly') {
    return (
      <MonthlyView
        files={files}
        currentIndex={selectedMonthIndex}
        onNavigate={setSelectedMonthIndex}
        onBack={() => setViewMode('selection')}
        onFilesUpdated={handleFilesUpdated}
      />
    )
  }

  if (viewMode === 'annual') {
    return (
      <AnnualDashboard
        files={files}
        onBack={() => setViewMode('selection')}
        onFilesUpdated={handleFilesUpdated}
      />
    )
  }

  return (
    <SelectionScreen
      files={files}
      onSelectMonth={(index) => {
        setSelectedMonthIndex(index)
        setViewMode('monthly')
      }}
      onConsolidate={() => setViewMode('annual')}
    />
  )
}
