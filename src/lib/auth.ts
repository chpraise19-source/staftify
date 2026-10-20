import { supabase } from './supabase';
import type { Role } from './domain';
export async function requireUser(roles?: Role[]) {
 const db=await supabase(); const {data:{user},error}=await db.auth.getUser();
 if(error || !user) throw new Error('Unauthorized');
 const {data:profile}=await db.from('profiles').select('*').eq('id',user.id).single();
 if(!profile || (roles && !roles.includes(profile.role))) throw new Error('Forbidden');
 return {db,user,profile};
}
export function apiError(error: unknown) {
 const message=error instanceof Error ? error.message : 'Request failed';
 const status=message==='Unauthorized'?401:message==='Forbidden'?403:400;
 return Response.json({error:message}, {status});
}
