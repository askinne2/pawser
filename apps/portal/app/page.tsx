import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function Home() {
  // In local development, try to resolve tenant from hostname
  const headersList = await headers();
  const host = headersList.get('host') || '';
  
  // Remove port from hostname (localhost:3000 -> localhost)
  const hostname = host.split(':')[0];
  
  // For subdomain routing (demo.localhost or demo.pawser.app)
  const subdomain = hostname.split('.')[0];
  
  // If we're on a subdomain (not 'localhost', '127', 'www'), redirect to that tenant's animals
  if (subdomain && 
      subdomain !== 'localhost' && 
      subdomain !== '127' && 
      subdomain !== 'www' && 
      subdomain !== 'admin') {
    redirect(`/${subdomain}/animals`);
  }
  
  // Default: redirect to demo shelter in development
  redirect('/demo-shelter/animals');
}

