import { ImageOptions, PromptMeta, PromptResult, ProviderAdapter } from "./types";

function pickSize(width?: number, height?: number): string {
  if (!width || !height) return "1024x1024";
  return height > width ? "1024x1536" : width > height ? "1536x1024" : "1024x1024";
}

export function createGeminiProvider(apiKey: string): ProviderAdapter {
  return {
    async generatePromptFromImage(imageBase64: string, meta: PromptMeta): Promise<PromptResult> {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: "Analyze this PDF page image and return JSON object with keys: prompt, negativePrompt, suggestedSize, notes. Prompt should be full-powered and include composition, style, typography, colors, lighting, camera/angle, and constraints."
                  },
                  { text: `Metadata: page ${meta.pageIndex + 1}/${meta.totalPages ?? "unknown"}, file=${meta.fileName ?? "unknown"}` },
                  { inlineData: { mimeType: "image/png", data: imageBase64 } }
                ]
              }
            ]
          })
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Gemini prompt generation failed");
      }

      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const jsonText = text.replace(/^```json\s*/i, "").replace(/```$/i, "");
      const parsed = JSON.parse(jsonText) as PromptResult;

      return {
        prompt: parsed.prompt,
        negativePrompt: parsed.negativePrompt,
        notes: parsed.notes,
        suggestedSize: parsed.suggestedSize || pickSize(meta.width, meta.height)
      };
    },

    async generateImage(_prompt: string, _opts: ImageOptions) {
      throw new Error("Gemini image generation not configured; prompt generation works.");
    }
  };
}
