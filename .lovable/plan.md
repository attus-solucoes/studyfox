

## Plan: Disable Email Confirmation on Supabase

The goal is to allow users to sign up and immediately access the platform without email verification.

### Step 1: Disable email confirmation in Supabase Auth settings

Go to the Supabase Dashboard → Authentication → Providers → Email and **disable "Confirm email"**. This is a dashboard setting, not a code change.

**URL:** https://supabase.com/dashboard/project/jwryenhnthmxzlztiamt/auth/providers

### Step 2: Update Login.tsx

After signup succeeds, navigate directly to `/home` (already does this). Remove any "check your email" messaging if present in the current code. The `onAuthStateChange` listener in AuthContext will pick up the session automatically since Supabase will return a session immediately on signup when email confirmation is disabled.

No database migrations needed. No edge functions needed.

