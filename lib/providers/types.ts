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

export type ResourceItem = {
  title: string;
  description: string;
  url: string;
  source?: string;
};

export type ImagePromptItem = {
  sceneTitle: string;
  prompt: string;
  visualGoal: string;
  suggestedSearchLink: string;
};


export type ImageGenerationOptions = {
  negativePrompt?: string;
  size?: string;
  seed?: number;
};

export type ImageGenerationResult = {
  imageBase64: string;
  revisedPrompt?: string;
};

export type ScriptToolkitResult = {
  summary: string;
  productionAngle: string;
  imagePrompts: ImagePromptItem[];
  imageReferences: ResourceItem[];
  newsLinks: ResourceItem[];
  videoReferences: ResourceItem[];
  researchReferences: ResourceItem[];
};

export type ProviderAdapter = {
  generatePromptFromImage: (imageBase64: string, meta: PromptMeta) => Promise<PromptResult>;
  generateImage: (prompt: string, options?: ImageGenerationOptions) => Promise<ImageGenerationResult>;
  generateScriptToolkit: (scriptText: string, meta?: { fileName?: string }) => Promise<ScriptToolkitResult>;
};
