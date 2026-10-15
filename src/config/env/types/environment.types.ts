export interface PublicEnvironment {
  supabaseUrl: string;
  publishableKey: string;
}

export interface AdminEnvironment {
  supabaseUrl: string;
  secretKey: string;
}

export interface PublicEnvironmentSource {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}

export interface AdminEnvironmentSource {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
}
