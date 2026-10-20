import Dashboard from '@/components/dashboard';
import {requireUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {configured} from '@/lib/supabase';
export default async function Page(){if(!configured()) redirect('/login'); let session;try{session=await requireUser();}catch{redirect('/login');} const {data:shifts}=await session.db.from('shifts').select('*, facilities(name)').order('starts_at',{ascending:true}).limit(100); const {data:facility}=session.profile.facility_id?await session.db.from('facilities').select('name').eq('id',session.profile.facility_id).single():{data:null}; return <Dashboard facilityName={facility?.name} role={session.profile.role} name={session.profile.full_name} shifts={shifts??[]} demo={false}/>}
