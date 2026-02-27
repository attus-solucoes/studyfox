

## Diagnosis

After reviewing the full pipeline, the code is structurally sound but has these concrete bugs:

### Issues Found

1. **`extractText.ts`** - PDF files read via `readAsText` produce binary garbage that gets cleaned to near-empty strings, triggering the `< 100 chars` check or sending garbage to Gemini. No minimum-length guard inside the extractor itself.

2. **`generateGraph.ts`** - `JSON.parse` is not wrapped in try/catch, so a malformed Gemini response crashes the whole flow with an uncaught exception. No debug logging exists to diagnose failures. Gemini sometimes wraps JSON in markdown code fences (`\`\`\`json ... \`\`\``) which the current regex doesn't strip.

3. **`CoursePage.tsx` error card** - No debug hint shown when `status === 'error'`, making it hard to diagnose.

### Plan

**File 1: `src/lib/extractText.ts`**
- Add PDF detection: if `file.type === 'application/pdf'`, use `readAsArrayBuffer` + chunked `String.fromCharCode` conversion
- Add guard: if cleaned text < 50 chars, throw descriptive error
- Keep `extractTextFromString` unchanged

**File 2: `src/lib/generateGraph.ts`**
- Add `console.log` debug steps (text length, calling API, raw response)
- Strip markdown code fences before regex match
- Wrap `JSON.parse` in dedicated try/catch with repair (remove trailing commas, control chars)
- Add `console.error('ERRO DETALHADO IA:', err)` in catch
- Verify API key exists before calling

**File 3: `src/pages/CoursePage.tsx`**
- In the error status section of subject cards, add small debug hint text: "Erro técnico — veja console (F12)"
- No other UI changes

