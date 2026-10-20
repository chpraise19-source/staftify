import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'STAFTIFY | Healthcare staffing, simplified',description:'Connect exceptional nurses with healthcare facilities. Manage shifts, staffing, and timesheets in one place.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
