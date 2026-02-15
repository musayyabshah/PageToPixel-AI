import OpenAI from "openai";
import { PromptMeta, PromptResult, ProviderAdapter } from "./types";

function pickSize(width?: number, height?: number): string {
  if (!width || !height) return "1024x1024";
  return height > width ? "1024x1536" : width > height ? "1536x1024" : "1024x1024";
}

function parsePromptJson(raw: string): PromptResult {
  try {
    return JSON.parse(raw) as PromptResult;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1)) as PromptResult;
    }
    throw new Error("Model did not return valid JSON prompt payload.");
  }
}

const SYSTEM_PROMPT = `You are a senior visual prompt director for YouTube/news side-screen visuals.

Goal:
Convert the content of the provided PDF page (usually script/text) into ONE "ready-to-use" cinematic image prompt.
Do NOT recreate the page layout.
Do NOT describe document structure.
Do NOT include anchors/news presenters/studio host/opening screen.
Go straight to meaningful visual storytelling for that script segment.

Return strict JSON with keys:
- prompt (string, required)
- negativePrompt (string, optional)
- suggestedSize (string: 1024x1024 | 1024x1536 | 1536x1024)
- notes (string, optional)

Prompt quality requirements:
1) Subject clarity: who/what is happening, where, and why it matters.
2) Cinematic composition for side-screen context: strong focal subject, clean background hierarchy.
3) Visual style: realistic documentary/news-style b-roll feel unless script clearly needs illustration.
4) Lighting/camera details: lens feel, angle, depth, motion feeling, contrast.
5) Color direction: palette + mood aligned with topic urgency.
6) Era/location cues and props if implied by script.
7) Avoid clutter and text overlays unless script explicitly requires signage.
8) Make prompt directly usable in image generators with high specificity.

Negative prompt should avoid: anchors, news desk, studio set, title cards, logos, watermarks, unreadable text, extra limbs, blur, low detail.
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
                text: `Extract the page meaning/script and convert it to one best visual prompt. File: ${meta.fileName ?? "unknown"} | Page: ${meta.pageIndex + 1}/${meta.totalPages ?? "unknown"}.`
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
            name: "script_to_visual_prompt",
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

      const parsed = parsePromptJson(response.output_text || "{}");
      return {
        prompt: parsed.prompt,
        negativePrompt: parsed.negativePrompt,
        notes: parsed.notes,
        suggestedSize: parsed.suggestedSize || pickSize(meta.width, meta.height)
      };
    }
  };
}
