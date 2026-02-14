export type ProviderName = "openai" | "gemini";

export type PromptResult = {
  prompt: string;
  negativePrompt?: string;
  suggestedSize?: string;
  notes?: string;
};

export type PromptMeta = {
  pageIndex: number;
  totalPages?: number;
  fileName?: string;
  width?: number;
  height?: number;
};

export type ProviderAdapter = {
  generatePromptFromImage: (imageBase64: string, meta: PromptMeta) => Promise<PromptResult>;
};
