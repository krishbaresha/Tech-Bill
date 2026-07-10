export function getRootDomain(hostname: string = window.location.hostname): string {
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
    return 'localhost:5173';
  }
  
  // Vercel staging
  if (hostname.endsWith('vercel.app')) {
    return 'test-techbill.vercel.app';
  }
  
  // Production
  return 'techbill.app';
}

export function isMainDomain(hostname: string = window.location.hostname): boolean {
    const root = getRootDomain(hostname).split(':')[0]; // strip port for comparison
    return hostname === root || hostname === 'admin.techbill.app';
}
