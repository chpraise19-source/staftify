import Dashboard from '@/components/dashboard';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{role:string}>}) {const {role}=await params; if(role!=='facility'&&role!=='nurse'&&role!=='admin') notFound(); return <Dashboard role={role} demo/>}
