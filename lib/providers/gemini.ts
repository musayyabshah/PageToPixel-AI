import { GoogleGenAI } from "@google/genai";
import { PromptMeta, PromptResult, ProviderAdapter } from "./types";

function pickSize(width?: number, height?: number): string {
  if (!width || !height) return "1024x1024";
  return height > width ? "1024x1536" : width > height ? "1536x1024" : "1024x1024";
}

function extractTextFromResponse(response: unknown): string {
  const candidate = (response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("\n").trim();
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
                  "Analyze this PDF page image and return strict JSON: {prompt, negativePrompt, suggestedSize, notes}. Make the prompt premium quality: composition, style, typography, palette, lighting/camera, material details, and constraints to faithfully recreate visuals."
              },
              { text: `File: ${meta.fileName ?? "unknown"} | Page ${meta.pageIndex + 1}/${meta.totalPages ?? "unknown"}` },
              { inlineData: { mimeType: "image/png", data: imageBase64 } }
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
    }
  };
}
