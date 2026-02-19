import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviderAdapter } from "@/lib/providers";
import { ResourceItem, ScriptToolkitResult } from "@/lib/providers/types";

const schema = z.object({
  provider: z.enum(["openai", "gemini"]),
  apiKey: z.string().min(10),
  scriptText: z.string().min(80),
  fileName: z.string().optional()
});

function cleanResources(items: ResourceItem[], fallbackSource: string): ResourceItem[] {
  const seen = new Set<string>();

  return items
    .filter((item) => item?.title && item?.url && /^https:\/\//.test(item.url))
    .map((item) => ({
      title: item.title.trim(),
      description: item.description?.trim() || "",
      url: item.url.trim(),
      source: item.source?.trim() || fallbackSource
    }))
    .filter((item) => {
      const key = item.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function normalizeToolkit(raw: ScriptToolkitResult): ScriptToolkitResult {
  return {
    summary: raw.summary?.trim() || "Summary unavailable.",
    productionAngle: raw.productionAngle?.trim() || "Use the script timeline to build a coherent visual narrative.",
    imagePrompts: (raw.imagePrompts || [])
      .filter((item) => item.sceneTitle && item.prompt)
      .map((item) => ({
        sceneTitle: item.sceneTitle.trim(),
        prompt: item.prompt.trim(),
        visualGoal: item.visualGoal?.trim() || "Support this script beat with clean, relevant visuals.",
        suggestedSearchLink: /^https:\/\//.test(item.suggestedSearchLink || "")
          ? item.suggestedSearchLink
          : "https://images.google.com/"
      }))
      .slice(0, 10),
    imageReferences: cleanResources(raw.imageReferences || [], "Image source"),
    newsLinks: cleanResources(raw.newsLinks || [], "News source"),
    videoReferences: cleanResources(raw.videoReferences || [], "Video source"),
    researchReferences: cleanResources(raw.researchReferences || [], "Reference source")
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { provider, apiKey, scriptText, fileName } = parsed.data;
    const adapter = getProviderAdapter(provider, apiKey);

    const result = await adapter.generateScriptToolkit(scriptText, { fileName });
    const normalized = normalizeToolkit(result);

    if (!normalized.imagePrompts.length || !normalized.videoReferences.length) {
      return NextResponse.json({ error: "Could not generate enough relevant resources. Try a clearer script PDF." }, { status: 422 });
    }

    return NextResponse.json(normalized);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Script analysis failed" },
      { status: 500 }
    );
  }
}
