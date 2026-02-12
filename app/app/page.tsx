"use client";

import { useMemo, useState } from "react";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { PdfUploader } from "@/components/PdfUploader";
import { PromptCard } from "@/components/PromptCard";
import { ProviderSelector } from "@/components/ProviderSelector";
import { APP_PASSWORD, DEFAULT_PAGES_TO_PROCESS, KEY_STORAGE_PREFIX, MAX_PAGE_LIMIT } from "@/lib/config";
import { decryptText, encryptText } from "@/lib/crypto";
import { renderPdfPages } from "@/lib/pdf";
import { ProviderName } from "@/lib/providers/types";

type PromptItem = {
  id: string;
  pageIndex: number;
  thumbnailDataUrl: string;
  imageBase64: string;
  width: number;
  height: number;
  prompt: string;
  negativePrompt?: string;
  size: string;
  notes?: string;
  promptStatus: "idle" | "generating" | "done" | "error";
  imageStatus: "idle" | "generating" | "done" | "error";
  promptError?: string;
  imageError?: string;
  outputImageBase64?: string;
};

export default function AppPage() {
  const [provider, setProvider] = useState<ProviderName>("openai");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keyStatus, setKeyStatus] = useState("");
  const [pagesToProcess, setPagesToProcess] = useState(DEFAULT_PAGES_TO_PROCESS);
  const [fileName, setFileName] = useState<string>("");
  const [totalPdfPages, setTotalPdfPages] = useState<number | undefined>(undefined);
  const [processingPdf, setProcessingPdf] = useState(false);
  const [items, setItems] = useState<PromptItem[]>([]);
  const [globalStatus, setGlobalStatus] = useState("");

  const storageKey = useMemo(() => `${KEY_STORAGE_PREFIX}_${provider}`, [provider]);

  async function getDecryptedApiKey(): Promise<string> {
    const encrypted = localStorage.getItem(storageKey);
    if (!encrypted) throw new Error("No saved API key for selected provider.");
    return decryptText(encrypted, APP_PASSWORD);
  }

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) {
      setKeyStatus("Please enter a key before saving.");
      return;
    }
    const encrypted = await encryptText(apiKeyInput.trim(), APP_PASSWORD);
    localStorage.setItem(storageKey, encrypted);
    setApiKeyInput("");
    setKeyStatus("Encrypted key saved locally.");
  }

  function handleClearKey() {
    localStorage.removeItem(storageKey);
    setKeyStatus("Saved key cleared.");
  }

  async function handlePdf(file: File) {
    setProcessingPdf(true);
    setGlobalStatus("Rendering PDF pages...");
    setFileName(file.name);
    try {
      const rendered = await renderPdfPages(file, pagesToProcess);
      setTotalPdfPages(rendered.totalPages);
      const preparedItems = rendered.pages.map((page) => ({
        id: crypto.randomUUID(),
        pageIndex: page.pageIndex,
        thumbnailDataUrl: page.thumbnailDataUrl,
        imageBase64: page.imageBase64,
        width: page.width,
        height: page.height,
        prompt: "",
        size: "1024x1024",
        promptStatus: "idle" as const,
        imageStatus: "idle" as const
      }));
      setItems(preparedItems);
      setGlobalStatus(`Loaded ${rendered.pages.length} page(s). Generating prompts...`);
      for (const item of preparedItems) {
        // eslint-disable-next-line no-await-in-loop
        await generatePromptForItem(item.id, item);
      }
      setGlobalStatus("Prompt generation completed.");
    } catch (error) {
      setGlobalStatus(error instanceof Error ? error.message : "Failed to parse PDF.");
    } finally {
      setProcessingPdf(false);
    }
  }

  function updateItem(id: string, patch: Partial<PromptItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function generatePromptForItem(id: string, sourceItem?: PromptItem) {
    const item = sourceItem ?? items.find((i) => i.id === id);
    if (!item) return;

    updateItem(id, { promptStatus: "generating", promptError: undefined });
    try {
      const apiKey = await getDecryptedApiKey();
      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          pageImage: item.imageBase64,
          pageIndex: item.pageIndex,
          totalPages: totalPdfPages,
          fileName,
          width: item.width,
          height: item.height
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prompt generation failed.");

      updateItem(id, {
        prompt: data.prompt,
        negativePrompt: data.negativePrompt,
        notes: data.notes,
        size: data.suggestedSize || item.size,
        promptStatus: "done"
      });
    } catch (error) {
      updateItem(id, {
        promptStatus: "error",
        promptError: error instanceof Error ? error.message : "Prompt generation failed"
      });
    }
  }

  async function generateImageForItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    updateItem(id, { imageStatus: "generating", imageError: undefined });
    try {
      const apiKey = await getDecryptedApiKey();
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          prompt: item.prompt,
          negativePrompt: item.negativePrompt,
          size: item.size
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed.");

      updateItem(id, { imageStatus: "done", outputImageBase64: data.imageBase64 });
    } catch (error) {
      updateItem(id, {
        imageStatus: "error",
        imageError: error instanceof Error ? error.message : "Image generation failed"
      });
    }
  }

  async function generatePromptsForAll() {
    setGlobalStatus("Generating prompts...");
    for (const item of items) {
      // eslint-disable-next-line no-await-in-loop
      await generatePromptForItem(item.id);
    }
    setGlobalStatus("Prompt generation completed.");
  }

  async function generateImagesForAll() {
    setGlobalStatus("Generating images...");
    for (const item of items) {
      if (!item.prompt.trim()) continue;
      // eslint-disable-next-line no-await-in-loop
      await generateImageForItem(item.id);
    }
    setGlobalStatus("Image generation completed.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/unlock";
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">PageToPixel AI</h1>
        <button type="button" onClick={logout} className="rounded-md bg-slate-800 px-3 py-2 text-sm">
          Logout
        </button>
      </div>

      <section className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-2">
        <ProviderSelector provider={provider} onChange={setProvider} />
        <ApiKeyManager
          value={apiKeyInput}
          onChange={setApiKeyInput}
          onSave={handleSaveKey}
          onClear={handleClearKey}
          status={keyStatus}
        />
        <PdfUploader onFile={handlePdf} />
        <div>
          <label className="mb-1 block text-sm text-slate-300">Process first N pages (max {MAX_PAGE_LIMIT})</label>
          <input
            type="number"
            min={1}
            max={MAX_PAGE_LIMIT}
            value={pagesToProcess}
            onChange={(e) => setPagesToProcess(Number(e.target.value))}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </div>
      </section>

      <section className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generatePromptsForAll}
          disabled={!items.length}
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Generate prompts for all pages
        </button>
        <button
          type="button"
          onClick={generateImagesForAll}
          disabled={!items.length}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Create images for all prompts
        </button>
      </section>

      <p className="mb-4 text-sm text-slate-400">
        {processingPdf ? "Processing PDF..." : globalStatus}
        {totalPdfPages ? ` (PDF total pages: ${totalPdfPages})` : ""}
      </p>

      <div className="space-y-4">
        {items.map((item) => (
          <PromptCard
            key={item.id}
            item={item}
            onPromptChange={(id, prompt) => updateItem(id, { prompt })}
            onSizeChange={(id, size) => updateItem(id, { size })}
            onGeneratePrompt={generatePromptForItem}
            onGenerateImage={generateImageForItem}
          />
        ))}
      </div>
    </main>
  );
}
