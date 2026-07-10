export function getRootDomain(hostname: string = window.location.hostname): string {
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
    // preserve explicit port if present in location, otherwise default to Vite 5173
    const port = window.location.port ? `:${window.location.port}` : ':5173';
    return `localhost${port}`;
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

export function getRootOrigin(hostname: string = window.location.hostname): string {
  const root = getRootDomain(hostname);
  const protocol = root.includes('localhost') ? 'http:' : 'https:';
  return `${protocol}//${root}`;
}
