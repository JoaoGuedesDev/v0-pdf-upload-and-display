'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { computeOwnerSecret, getDashboard } from '@/lib/store'

export async function authenticateAdmin(id: string, secret: string) {
  const expected = computeOwnerSecret(id)
  if (secret !== expected) {
    return { error: 'Invalid secret' }
  }

  const name = `dash_admin_${id}`
  const ck = await cookies()
  
  // Fetch dashboard to get expiration if possible, similar to original logic
  // However, fetching dashboard might be overhead. 
  // The original logic tried to use data.metadata.expiresAt
  // We can just set a default expiration for now or try to fetch lightly.
  // To match original logic exactly, we should ideally fetch.
  
  let expires: Date | undefined
  try {
    const data = await getDashboard(id)
    const expStr = String((data as any)?.metadata?.expiresAt || (data as any)?.dados?.metadata?.expiresAt || '')
    const expDate = expStr ? new Date(expStr) : null
    if (expDate && !isNaN(expDate.getTime())) {
      expires = expDate
    }
  } catch (e) {
    // ignore
  }

  const opts: any = { 
    httpOnly: true, 
    sameSite: 'lax', 
    path: '/' 
  }
  
  if (expires) {
    opts.expires = expires
  } else {
    opts.maxAge = 7 * 24 * 60 * 60 // 7 days
  }

  ck.set(name, '1', opts)
  
  redirect(`/d/${id}`)
}
