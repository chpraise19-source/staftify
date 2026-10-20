import {requireUser,apiError} from '@/lib/auth';
import {z} from 'zod';
const action=z.discriminatedUnion('action',[
 z.object({action:z.literal('apply'),shift_id:z.uuid()}),
 z.object({action:z.literal('accept'),application_id:z.uuid()}),
 z.object({action:z.literal('blast'),shift_id:z.uuid()}),
 z.object({action:z.literal('priority'),nurse_id:z.uuid(),enabled:z.boolean()}),
 z.object({action:z.literal('issue_otp'),shift_id:z.uuid(),kind:z.enum(['in','out'])}),
 z.object({action:z.literal('clock'),shift_id:z.uuid(),kind:z.enum(['in','out']),code:z.string().regex(/^\d{6}$/)}),
 z.object({action:z.literal('read_notification'),notification_id:z.uuid()}),
 z.object({action:z.literal('approve_timesheet'),timesheet_id:z.uuid()}),
 z.object({action:z.literal('create_facility'),name:z.string().trim().min(2).max(200)}),
 z.object({action:z.literal('verify_nurse'),user_id:z.uuid(),credential:z.enum(['RN','LPN','CNA']),verified:z.boolean()}),
 z.object({action:z.literal('assign_facility'),user_id:z.uuid(),facility_id:z.uuid()}),
]);
export async function POST(req:Request){try{const {db}=await requireUser();const input=action.parse(await req.json());const {action:kind,...args}=input;const {data,error}=await db.rpc('staffing_action',{action_name:kind,payload:args});if(error)throw error;if(data?.error)return Response.json({error:data.error},{status:400});return Response.json({result:data});}catch(e){return apiError(e);}}
