import { NextRequest, NextResponse } from 'next/server'
import { getDashboard, saveDashboard, computeOwnerSecret } from '@/lib/store'
import { cookies } from 'next/headers'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const p = await Promise.resolve(params)
  const id = p.id
  
  // Auth check
  const ck = await cookies()
  const name = `dash_admin_${id}`
  const hasCookie = ck.has(name)
  
  // Also check if secret is provided in header (for potential future use or API access)
  const authHeader = req.headers.get('Authorization')
  const secret = computeOwnerSecret(id)
  const isSecretValid = authHeader === `Bearer ${secret}`
  
  if (!hasCookie && !isSecretValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const body = await req.json()
    const { files } = body
    
    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Invalid files data' }, { status: 400 })
    }
    
    // Fetch existing dashboard
    const dashboard = await getDashboard(id)
    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }
    
    const updatedDashboard = { ...dashboard }
    updatedDashboard.files = files
    
    // Update timestamp
    if (updatedDashboard.metadata) {
      updatedDashboard.metadata.updatedAt = new Date().toISOString()
    } else {
      updatedDashboard.metadata = { updatedAt: new Date().toISOString() }
    }
    
    await saveDashboard(updatedDashboard, 60, id)
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error updating dashboard:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
