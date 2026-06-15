# Smart Medicine Assistant (Vite + Supabase Edge + OpenAI)

Production-oriented stack per project spec:

- **Frontend:** React 18 + **Vite** + TypeScript + Tailwind  
- **Backend:** **Supabase** (Postgres, Auth, RLS) + **Edge Functions** (`scan`, `medicine`, `compare`, `chat`)  
- **AI:** **OpenAI** (`gpt-4o-mini` by default, JSON mode where applicable)  
- **Data:** **OpenFDA** + best-effort pharmacy HTML excerpt fallback  
- **Client:** **@zxing/browser** (barcode/QR) + **tesseract.js** (OCR on device)

> A legacy **Next.js** app may still exist in this repo; the **canonical** app for this architecture is under `web/`.

## 1. Supabase

1. Create a project.  
2. Run SQL in `supabase/migrations/20260204000000_sma_vite_stack.sql` (SQL editor or CLI).  
3. **Auth:** enable Email provider (password).  
4. Deploy Edge Functions:

```bash
supabase functions deploy scan --no-verify-jwt
supabase functions deploy medicine --no-verify-jwt
supabase functions deploy compare --no-verify-jwt
supabase functions deploy chat --no-verify-jwt
```

(`scan` / `compare` work with or without JWT; rate limit + `scans.user_id` use JWT when present.)

5. Set **secrets** for functions: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, optional `OPENFDA_API_KEY`, optional `OPENAI_MODEL`.

> Hosted projects usually expose `SUPABASE_URL` and `SUPABASE_ANON_KEY` to functions automatically. If `getUser` fails in `scan`, set `SUPABASE_ANON_KEY` explicitly to match the project anon key.

## 2. Web app

```bash
cd web
cp ../.env.example .env.local
# fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open `http://localhost:5173`.

## 3. Deploy frontend (Vercel)

- Root directory: **`web`**  
- Build: `npm run build`  
- Output: **`dist`**  
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## API contracts (Edge)

- **POST** `/functions/v1/scan` — body `{ barcode?, image?, client_extracted_text?, image_mime? }` → structured medicine + DB cache  
- **GET** `/functions/v1/medicine?id=<uuid>` — full row  
- **POST** `/functions/v1/compare` — body `{ med1, med2 }`  
- **POST** `/functions/v1/chat` — body `{ messages, locale }`

All responses use **live** OpenFDA / OpenAI / network where configured; there is **no** mock JSON in the pipeline. If third-party APIs fail, the UI shows an explicit error (e.g. scan/compare failure).

## Rate limits

- **10 scans per minute** per authenticated user or per IP bucket (`scan_rate_limits` table).
