import {requireUser,apiError} from '@/lib/auth';
import {shiftSchema} from '@/lib/domain';
export async function GET(){try{const {db}=await requireUser();const {data,error}=await db.from('shifts').select('*, facilities(name)').order('starts_at');if(error)throw error;return Response.json({shifts:data});}catch(e){return apiError(e);}}
export async function POST(req:Request){try{const {db,profile}=await requireUser(['facility']);const values=shiftSchema.parse(await req.json());const {data,error}=await db.from('shifts').insert({...values,facility_id:profile.facility_id}).select().single();if(error)throw error;return Response.json({shift:data},{status:201});}catch(e){return apiError(e);}}
