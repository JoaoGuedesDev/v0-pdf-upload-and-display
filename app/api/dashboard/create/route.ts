import { NextRequest, NextResponse } from 'next/server'
import { saveDashboard } from '@/lib/store'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { files } = body

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Invalid files data' }, { status: 400 })
    }

    // Save dashboard with a default TTL (e.g. 7 days)
    // The data structure should match what AnnualDashboard expects: { files: [...] }
    const dashboardId = await saveDashboard({ files })

    return NextResponse.json({ code: dashboardId })
  } catch (error) {
    console.error('Error creating dashboard:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
