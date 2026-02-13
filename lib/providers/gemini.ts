import { GoogleGenAI, Modality } from "@google/genai";
import { ImageOptions, PromptMeta, PromptResult, ProviderAdapter } from "./types";

function pickSize(width?: number, height?: number): string {
  if (!width || !height) return "1024x1024";
  return height > width ? "1024x1536" : width > height ? "1536x1024" : "1024x1024";
}

function extractTextFromResponse(response: unknown): string {
  const candidate = (response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("\n").trim();
}

function extractImageBase64FromResponse(response: unknown): string | null {
  const candidate = (response as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
  })?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  for (const part of parts) {
    if (part.inlineData?.data) {
      return part.inlineData.data;
    }
  }

  return null;
}

export function createGeminiProvider(apiKey: string): ProviderAdapter {
  const client = new GoogleGenAI({ apiKey });

  return {
    async generatePromptFromImage(imageBase64: string, meta: PromptMeta): Promise<PromptResult> {
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Analyze this PDF page image and return strict JSON with keys: prompt, negativePrompt, suggestedSize, notes. Prompt must be full-powered and include composition, style, typography, colors, lighting, camera/angle, and hard constraints."
              },
              {
                text: `Metadata: page ${meta.pageIndex + 1}/${meta.totalPages ?? "unknown"}, file=${meta.fileName ?? "unknown"}`
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: imageBase64
                }
              }
            ]
          }
        ]
      });

      const text = extractTextFromResponse(response);
      const jsonText = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(jsonText) as PromptResult;

      return {
        prompt: parsed.prompt,
        negativePrompt: parsed.negativePrompt,
        notes: parsed.notes,
        suggestedSize: parsed.suggestedSize || pickSize(meta.width, meta.height)
      };
    },

    async generateImage(prompt: string, opts: ImageOptions) {
      const fullPrompt = opts.negativePrompt
        ? `${prompt}\n\nNegative prompt (avoid): ${opts.negativePrompt}`
        : prompt;

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: fullPrompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE]
        }
      });

      const imageBase64 = extractImageBase64FromResponse(response);
      if (!imageBase64) {
        const text = extractTextFromResponse(response);
        throw new Error(text || "Gemini returned no image data.");
      }

      return { imageBase64 };
    }
  };
}
