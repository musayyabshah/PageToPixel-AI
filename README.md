# PageToPixel AI

A Next.js 14 App Router app to:
- choose an AI provider (OpenAI/Gemini)
- save provider API keys locally (encrypted in browser storage)
- upload PDFs and render pages client-side
- generate rich image prompts per page
- generate images and download outputs

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
- Decrypted keys are sent only per-request to server proxy routes.

## API routes

- `POST /api/prompt`
  - Input: `provider`, `apiKey`, `pageImage`, `pageIndex`, optional metadata
  - Output: `prompt`, optional `negativePrompt`, `suggestedSize`, `notes`

- `POST /api/image`
  - Input: `provider`, `apiKey`, `prompt`, `negativePrompt`, `size`
  - Output: `imageBase64`

## Gemini support

- Prompt generation uses Gemini multimodal model.
- Image generation uses `gemini-2.5-flash-image` with both text and image response modalities.
- Your Gemini key must have model access enabled in your Google AI account.

## Known limitations

- PDF worker is loaded from `unpkg` CDN via `pdfjs-dist` worker URL.
