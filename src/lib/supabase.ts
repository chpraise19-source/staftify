import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export function configured() { return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); }
export async function supabase() {
 if (!configured()) throw new Error('Supabase is not configured');
 const store=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>store.getAll(),setAll: values=>{try {values.forEach(({name,value,options})=>store.set(name,value,options));}catch{ /* Server components cannot write cookies. Route handlers refresh sessions. */ }}}});
}
