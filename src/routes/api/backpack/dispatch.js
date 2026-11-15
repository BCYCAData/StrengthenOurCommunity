import { createClient } from '@supabase/supabase-js';
import { createDispatchHandler } from '$lib/server/backpack/handler';

// No client is created until an authenticated, explicitly enabled request arrives.
export const POST = createDispatchHandler({ env: process.env, createClient });
