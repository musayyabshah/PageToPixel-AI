import { GoogleGenAI } from "@google/genai";
import { ImageGenerationResult, PromptMeta, PromptResult, ProviderAdapter, ScriptToolkitResult } from "./types";

function pickSize(width?: number, height?: number): string {
  if (!width || !height) return "1024x1024";
  return height > width ? "1024x1536" : width > height ? "1536x1024" : "1024x1024";
}

function extractTextFromResponse(response: unknown): string {
  const candidate = (response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("\n").trim();
}

function parseJsonPayload<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1)) as T;
    }
    throw new Error("Model did not return valid JSON payload.");
  }
}

const SCRIPT_TOOLKIT_PROMPT = `Build a premium script resource toolkit for professional video editors.
Return strict JSON with this exact shape:
{
  "summary": string,
  "productionAngle": string,
  "imagePrompts": [{"sceneTitle": string, "prompt": string, "visualGoal": string, "suggestedSearchLink": string}],
  "imageReferences": [{"title": string, "description": string, "url": string, "source": string}],
  "newsLinks": [{"title": string, "description": string, "url": string, "source": string}],
  "videoReferences": [{"title": string, "description": string, "url": string, "source": string}],
  "researchReferences": [{"title": string, "description": string, "url": string, "source": string}]
}

Rules:
- 6-10 image prompts.
- 6-10 resources per list.
- Links must be complete https URLs.
- Prefer trusted sources; use direct search URLs if needed.
- JSON only.`;

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
                  "Read this PDF page (script/text) and convert it into one premium side-screen visual prompt for a news/youtube video. Do not recreate document layout. Do not include anchors, host, opening screen, studio desk. Return strict JSON with keys: prompt, negativePrompt, suggestedSize, notes."
              },
              { text: `File: ${meta.fileName ?? "unknown"} | Page ${meta.pageIndex + 1}/${meta.totalPages ?? "unknown"}` },
              { inlineData: { mimeType: "image/png", data: imageBase64 } }
            ]
          }
        ]
      });

      const parsed = parseJsonPayload<PromptResult>(extractTextFromResponse(response));

      return {
        prompt: parsed.prompt,
        negativePrompt: parsed.negativePrompt,
        notes: parsed.notes,
        suggestedSize: parsed.suggestedSize || pickSize(meta.width, meta.height)
      };
    },

    async generateImage(): Promise<ImageGenerationResult> {
      throw new Error("Direct image generation is currently available with the OpenAI provider in this app.");
    },

    async generateScriptToolkit(scriptText: string, meta?: { fileName?: string }): Promise<ScriptToolkitResult> {
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: SCRIPT_TOOLKIT_PROMPT },
              { text: `File: ${meta?.fileName ?? "unknown"}` },
              { text: `Script:\n${scriptText.slice(0, 18000)}` }
            ]
          }
        ]
      });

      return parseJsonPayload<ScriptToolkitResult>(extractTextFromResponse(response));
    }
  };
}
