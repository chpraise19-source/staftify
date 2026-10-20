import {supabase} from '@/lib/supabase';
export async function POST(){const db=await supabase();await db.auth.signOut();return Response.json({ok:true});}
