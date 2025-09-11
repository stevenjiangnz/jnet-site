import { NextRequest } from 'next/server'

/**
 * Get the correct origin URL for the application, handling Cloud Run's proxy headers
 * Cloud Run sets X-Forwarded headers that we need to use to construct the correct public URL
 */
export function getPublicUrl(request: NextRequest): string {
  // Check for forwarded headers (set by Cloud Run proxy)
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = request.headers.get('host')
  
  // In production, prefer forwarded host
  if (process.env.NODE_ENV === 'production' && forwardedHost) {
    console.log('[URL Helper] Using forwarded host:', forwardedHost)
    return `${proto}://${forwardedHost}`
  }
  
  // Fallback to host header
  if (host && !host.includes('0.0.0.0') && !host.includes('127.0.0.1')) {
    console.log('[URL Helper] Using host header:', host)
    return `${proto}://${host}`
  }
  
  // Last resort: try to parse from request URL
  const url = new URL(request.url)
  
  // Never return localhost URLs in production
  if (process.env.NODE_ENV === 'production' && 
      (url.origin.includes('0.0.0.0') || url.origin.includes('localhost') || url.origin.includes('127.0.0.1'))) {
    console.warn('[URL Helper] Detected localhost URL in production, this should not happen!')
    // Return a relative path as last resort
    return ''
  }
  
  console.log('[URL Helper] Using parsed origin:', url.origin)
  return url.origin
}