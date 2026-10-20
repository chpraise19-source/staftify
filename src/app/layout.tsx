import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'STAFTIFY | Healthcare staffing. On demand.',description:'Connecting qualified nurses with healthcare facilities, one shift at a time.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
