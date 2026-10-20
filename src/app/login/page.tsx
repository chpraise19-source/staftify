import Login from '@/components/login';
import {configured} from '@/lib/supabase';
export default function Page(){return <Login configured={configured()}/>}
