# PageToPixel AI

A Next.js 14 App Router app to:
- choose an AI provider (OpenAI/Gemini)
- save provider API keys locally (encrypted in browser storage)
- upload PDFs and render pages client-side
- generate premium, highly-detailed image prompts per page

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
4. Build command: `npm run build`.

## Security model

- No app password gate.
- API keys are never stored server-side.
- API keys are encrypted in localStorage with WebCrypto (PBKDF2 -> AES-GCM).
- Decrypted keys are sent only per-request to server prompt route.

## API routes

- `POST /api/prompt`
  - Input: `provider`, `apiKey`, `pageImage`, `pageIndex`, optional metadata
  - Output: `prompt`, optional `negativePrompt`, `suggestedSize`, `notes`

## Prompt quality

- OpenAI prompt generation uses `client.responses.create` with model `gpt-5.2`.
- Backend uses a high-precision prompt-engineering system instruction for composition, style, typography, palette, lighting, material detail, and strict recreation constraints.
- Gemini prompt generation also returns strict JSON prompt payloads.

## Known limitations

- PDF worker is loaded from `unpkg` CDN via `pdfjs-dist` worker URL.
