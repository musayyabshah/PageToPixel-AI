# PageToPixel AI

A production-ready Next.js 14 App Router app for:
- password-gated access
- provider selection (OpenAI or Gemini)
- encrypted local API key storage
- PDF page rendering in-browser
- prompt generation per page via server proxy
- image generation per prompt (OpenAI supported)

## Security model

- App password is hardcoded as `shah1122` in `lib/config.ts` (**insecure for real-world use**, implemented as requested).
- Successful unlock sets an HttpOnly cookie valid for 12 hours.
- Middleware protects all app routes.
- API routes verify session cookie.
- User API keys are **not stored server-side**; keys are decrypted in browser and sent per request only.
- API keys are encrypted at rest in browser localStorage using PBKDF2 -> AES-GCM with passphrase `shah1122`.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel deployment

1. Push this repo to GitHub.
2. Import in Vercel.
3. Framework preset: Next.js.
4. Build command: `npm run build` (default).
5. Output: default.

No required server-side environment variables for user keys.

## API behavior

- `POST /api/prompt`
  - Input: `provider`, `apiKey`, `pageImage`, `pageIndex`, optional metadata
  - Output: `prompt`, optional `negativePrompt`, `suggestedSize`, `notes`

- `POST /api/image`
  - Input: `provider`, `apiKey`, `prompt`, `negativePrompt`, `size`
  - Output: `imageBase64`

## Known limitations

- Gemini image generation is not wired in this implementation (SDK/API availability varies); prompt generation works and image route returns a clear fallback error.
- PDF rendering relies on `pdfjs-dist` worker loaded from CDN (`unpkg`).
- Password hardcoding is intentionally insecure and should be replaced with a secret-based auth flow in production.
