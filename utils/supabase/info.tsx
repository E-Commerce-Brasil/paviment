const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nao configuradas."
  );
}

export const projectId = new URL(supabaseUrl).hostname.split(".")[0];
export const publicAnonKey = supabaseAnonKey;
