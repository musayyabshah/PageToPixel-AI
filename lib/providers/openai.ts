import OpenAI from "openai";
import { ImageOptions, PromptMeta, PromptResult, ProviderAdapter } from "./types";

function pickSize(width?: number, height?: number): string {
  if (!width || !height) return "1024x1024";
  return height > width ? "1024x1536" : width > height ? "1536x1024" : "1024x1024";
}

export function createOpenAIProvider(apiKey: string): ProviderAdapter {
  const client = new OpenAI({ apiKey });

  return {
    async generatePromptFromImage(imageBase64: string, meta: PromptMeta): Promise<PromptResult> {
      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Analyze this PDF page image and generate a FULL-POWERED image-generation prompt that recreates the visuals. Return strict JSON with keys: prompt, negativePrompt, suggestedSize, notes. Include style, composition, typography, color palette, lighting, camera/angle and constraints."
              },
              {
                type: "input_text",
                text: `Metadata: page ${meta.pageIndex + 1} of ${meta.totalPages ?? "unknown"}, file ${meta.fileName ?? "unknown"}`
              },
              {
                type: "input_image",
                image_url: `data:image/png;base64,${imageBase64}`
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "prompt_payload",
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["prompt"],
              properties: {
                prompt: { type: "string" },
                negativePrompt: { type: "string" },
                suggestedSize: { type: "string" },
                notes: { type: "string" }
              }
            },
            strict: false
          }
        }
      });

      const raw = response.output_text || "{}";
      const parsed = JSON.parse(raw) as PromptResult;
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

      const image = await client.images.generate({
        model: "gpt-image-1",
        prompt: fullPrompt,
        size: (opts.size as "1024x1024" | "1024x1536" | "1536x1024") ?? "1024x1024"
      });

      const b64 = image.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("No image returned from OpenAI image API.");
      }

      return { imageBase64: b64 };
    }
  };
}
