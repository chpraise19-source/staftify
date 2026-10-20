import { z } from 'zod';
export const shiftSchema = z.object({ title: z.string().trim().min(3).max(120), specialty: z.enum(['RN','LPN','CNA']), starts_at: z.iso.datetime(), ends_at: z.iso.datetime(), hourly_rate: z.number().min(15).max(500), urgent: z.boolean().default(false), notes: z.string().max(2000).default('') }).refine(s => Date.parse(s.ends_at) > Date.parse(s.starts_at), {message:'End time must follow start time'}).refine(s => Date.parse(s.starts_at) > Date.now(), {message:'Shift must start in the future'}).refine(s => Date.parse(s.ends_at)-Date.parse(s.starts_at)<=24*60*60*1000,{message:'Shifts cannot exceed 24 hours'});
export function hoursBetween(start: string, end: string) { return Math.max(0,(Date.parse(end)-Date.parse(start))/3600000); }
export function estimatePay(start: string,end: string,rate: number) { return Math.round(hoursBetween(start,end)*rate*100)/100; }
export const currency = (n: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export type Role = 'facility' | 'nurse' | 'admin';
