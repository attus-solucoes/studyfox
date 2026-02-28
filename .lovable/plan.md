

## Plan: Move OpenAI API calls to Supabase Edge Function

Currently, `generateGraph.ts` and `generateExercises.ts` call the OpenAI API directly from the frontend using `VITE_OPENAI_API_KEY` (exposed in browser). The user chose the secure Edge Function approach.

### Step 1: Add OpenAI API key as Supabase secret

Use the secrets tool to ask the user for their `OPENAI_API_KEY`. This will be stored securely in Supabase and accessible only from Edge Functions.

### Step 2: Create Edge Function `supabase/functions/openai-proxy/index.ts`

A single proxy function that:
- Accepts `{ messages, max_tokens, temperature, model }` from the frontend
- Reads `OPENAI_API_KEY` from `Deno.env`
- Forwards the request to `https://api.openai.com/v1/chat/completions`
- Returns the response (with proper CORS headers)
- Handles 429/401/400 errors and returns meaningful messages

Update `supabase/config.toml` to add `[functions.openai-proxy]` with `verify_jwt = false`.

### Step 3: Update `src/lib/gemini.ts`

- Remove `OPENAI_API_KEY` and `OPENAI_BASE_URL` exports
- Replace `rateLimitedFetch` with a function that calls the Edge Function via `supabase.functions.invoke('openai-proxy', { body: ... })`
- Keep `API_CONFIG`, `validateFile`, `fileToBase64DataUrl` unchanged

### Step 4: Update `src/lib/generateGraph.ts`

- Remove imports of `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `rateLimitedFetch`
- Update `callOpenAI()` to call the edge function instead of direct OpenAI fetch
- Remove the `OPENAI_API_KEY` check at the top of `generateGraph()`

### Step 5: Update `src/lib/generateExercises.ts`

- Same pattern: replace direct OpenAI fetch with edge function call
- Remove `OPENAI_API_KEY` check

### Files changed
- `supabase/functions/openai-proxy/index.ts` (new)
- `supabase/config.toml` (add function config)
- `src/lib/gemini.ts` (remove API key, add edge function caller)
- `src/lib/generateGraph.ts` (use new caller)
- `src/lib/generateExercises.ts` (use new caller)

