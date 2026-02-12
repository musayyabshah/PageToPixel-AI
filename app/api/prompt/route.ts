import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";
import { getProviderAdapter } from "@/lib/providers";

const schema = z.object({
  provider: z.enum(["openai", "gemini"]),
  apiKey: z.string().min(10),
  pageImage: z.string().min(100),
  pageIndex: z.number().int().nonnegative(),
  totalPages: z.number().int().positive().optional(),
  fileName: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional()
});

export async function POST(request: Request) {
  if (!requireSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { provider, apiKey, pageImage, pageIndex, totalPages, fileName, width, height } = parsed.data;
    const adapter = getProviderAdapter(provider, apiKey);
    const result = await adapter.generatePromptFromImage(pageImage, {
      pageIndex,
      totalPages,
      fileName,
      width,
      height
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prompt generation failed" },
      { status: 500 }
    );
  }
}
