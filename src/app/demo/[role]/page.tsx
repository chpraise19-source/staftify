import DemoWorkspace from '@/components/demo/workspace';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{role:string}>}) {const {role}=await params; if(role!=='facility'&&role!=='nurse'&&role!=='admin') notFound(); return <DemoWorkspace role={role}/>}
