import OpenAI from "openai";
import { PromptMeta, PromptResult, ProviderAdapter } from "./types";

function pickSize(width?: number, height?: number): string {
  if (!width || !height) return "1024x1024";
  return height > width ? "1024x1536" : width > height ? "1536x1024" : "1024x1024";
}

const SYSTEM_PROMPT = `You are an elite visual reconstruction prompt engineer.
Your task: inspect one PDF page image and produce a best-in-class, production-ready image-generation prompt that recreates the page faithfully.

Output strict JSON with keys:
- prompt (string, required)
- negativePrompt (string, optional but recommended)
- suggestedSize (string: 1024x1024 | 1024x1536 | 1536x1024)
- notes (string, concise implementation hints)

Quality requirements for prompt:
1) Cover layout/composition precisely: scene structure, subject placement, hierarchy, spacing, focal points.
2) Capture style: art direction, medium, rendering style, realism vs illustration, texture detail.
3) Typography guidance when text exists: font vibe, weight, casing, alignment, kerning/leading, legibility constraints.
4) Color science: palette names + dominant/accent colors + contrast relationship.
5) Lighting/camera: direction, softness, exposure, lens vibe, viewpoint, depth of field.
6) Material/detail fidelity: surfaces, edges, shadows, reflections, gradients, print effects.
7) Explicit constraints: what must be preserved and what must be avoided.
8) Write in one coherent, model-friendly block; avoid vague words.

If the page is mostly textual or abstract, still provide a visual recreation prompt for a polished poster/editorial page while preserving structure.
Return only JSON.`;

export function createOpenAIProvider(apiKey: string): ProviderAdapter {
  const client = new OpenAI({ apiKey });

  return {
    async generatePromptFromImage(imageBase64: string, meta: PromptMeta): Promise<PromptResult> {
      const response = await client.responses.create({
        model: "gpt-5.2",
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: SYSTEM_PROMPT }]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `File: ${meta.fileName ?? "unknown"} | Page: ${meta.pageIndex + 1}/${meta.totalPages ?? "unknown"} | Native size: ${meta.width ?? "?"}x${meta.height ?? "?"}`
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
            name: "reconstruction_prompt",
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["prompt"],
              properties: {
                prompt: { type: "string" },
                negativePrompt: { type: "string" },
                suggestedSize: { type: "string", enum: ["1024x1024", "1024x1536", "1536x1024"] },
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
    }
  };
}
