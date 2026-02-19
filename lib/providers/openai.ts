import OpenAI from "openai";
import { ImageGenerationOptions, ImageGenerationResult, PromptMeta, PromptResult, ProviderAdapter, ScriptToolkitResult } from "./types";

function pickSize(width?: number, height?: number): string {
  if (!width || !height) return "1024x1024";
  return height > width ? "1024x1536" : width > height ? "1536x1024" : "1024x1024";
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

Return only JSON.`;

const SCRIPT_TOOLKIT_SYSTEM_PROMPT = `You are an elite visual research producer for professional video editors.
Given a script, return a production-ready toolkit in strict JSON with high relevance to the script topic, people, places, and timeline.

Requirements:
- Focus on practical assets editors can immediately use.
- Use only script-grounded context; do not invent unrelated topics.
- Include concise but high-quality cinematic image prompts.
- Include reliable links by preferring direct source pages or search URLs from trusted platforms.
- Keep language specific, modern, and production-oriented.

JSON shape:
{
  "summary": string,
  "productionAngle": string,
  "imagePrompts": [{"sceneTitle": string, "prompt": string, "visualGoal": string, "suggestedSearchLink": string}],
  "imageReferences": [{"title": string, "description": string, "url": string, "source": string}],
  "newsLinks": [{"title": string, "description": string, "url": string, "source": string}],
  "videoReferences": [{"title": string, "description": string, "url": string, "source": string}],
  "researchReferences": [{"title": string, "description": string, "url": string, "source": string}]
}

Guidelines:
- Return 6-10 imagePrompts.
- Return 6-10 links in each resource list.
- URL values must be complete https links.
- Prefer sources like Reuters, AP, BBC, NYT, WSJ, YouTube, Vimeo, Pexels, Pixabay, Unsplash, archive/documentation pages, and high-quality explainers.
- If exact URLs are uncertain, use high-quality search URLs (Google News, YouTube search, site search) that are still directly usable and keyword-matched to the script.
- Return JSON only.`;

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
                image_url: `data:image/png;base64,${imageBase64}` ,
                detail: "auto"
              }
            ]
          }
        ]
      });

      const parsed = parseJsonPayload<PromptResult>(response.output_text || "{}");
      return {
        prompt: parsed.prompt,
        negativePrompt: parsed.negativePrompt,
        notes: parsed.notes,
        suggestedSize: parsed.suggestedSize || pickSize(meta.width, meta.height)
      };
    },

    async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
      const size = options?.size || "1024x1024";
      const response = await client.images.generate({
        model: "gpt-image-1",
        prompt: options?.negativePrompt
          ? `${prompt}\n\nAvoid: ${options.negativePrompt}`
          : prompt,
        size: size as "1024x1024" | "1024x1536" | "1536x1024"
      });

      const imageBase64 = response.data?.[0]?.b64_json;
      if (!imageBase64) throw new Error("No image returned from provider.");

      return {
        imageBase64,
        revisedPrompt: response.data?.[0]?.revised_prompt
      };
    },

    async generateScriptToolkit(scriptText: string, meta?: { fileName?: string }): Promise<ScriptToolkitResult> {
      const response = await client.responses.create({
        model: "gpt-5.2",
        input: [
          { role: "system", content: [{ type: "input_text", text: SCRIPT_TOOLKIT_SYSTEM_PROMPT }] },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `File: ${meta?.fileName ?? "unknown"}\n\nScript:\n${scriptText.slice(0, 18000)}`
              }
            ]
          }
        ]
      });

      return parseJsonPayload<ScriptToolkitResult>(response.output_text || "{}");
    }
  };
}
