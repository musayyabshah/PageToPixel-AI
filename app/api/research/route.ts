import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviderAdapter } from "@/lib/providers";

const schema = z.object({
  provider: z.enum(["openai", "gemini"]),
  apiKey: z.string().min(10),
  scriptText: z.string().min(50),
  fileName: z.string().optional()
});

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
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Script analysis failed" },
      { status: 500 }
    );
  }
}
