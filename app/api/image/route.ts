import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviderAdapter } from "@/lib/providers";

const schema = z.object({
  provider: z.enum(["openai", "gemini"]),
  apiKey: z.string().min(10),
  prompt: z.string().min(10),
  negativePrompt: z.string().optional(),
  size: z.string().optional(),
  seed: z.number().int().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { provider, apiKey, prompt, negativePrompt, size, seed } = parsed.data;
    const adapter = getProviderAdapter(provider, apiKey);
    const result = await adapter.generateImage(prompt, { negativePrompt, size, seed });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed" },
      { status: 500 }
    );
  }
}
