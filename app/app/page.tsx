"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { PdfUploader } from "@/components/PdfUploader";
import { ProviderSelector } from "@/components/ProviderSelector";
import { KEY_STORAGE_PREFIX } from "@/lib/config";
import { decryptText, encryptText, getOrCreateClientSecret } from "@/lib/crypto";
import { parsePdf } from "@/lib/pdf";
import { ProviderName, ScriptToolkitResult } from "@/lib/providers/types";

type UploadedPage = {
  pageIndex: number;
  thumbnailDataUrl: string;
};

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/65 p-6 shadow-[0_30px_80px_rgba(2,6,23,0.55)] backdrop-blur">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mb-4 mt-1 text-sm text-slate-300">{subtitle}</p>
      {children}
    </section>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-[min(92vw,480px)] rounded-3xl border border-indigo-300/30 bg-slate-900/90 p-8 text-center">
        <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-indigo-400/30 border-t-cyan-300" />
        <p className="text-lg font-semibold text-white">Analyzing your full script PDF</p>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
      </div>
    </div>
  );
}

function ResourceList({ items }: { items: ScriptToolkitResult["imageReferences"] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item.url}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm">
          <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-indigo-300 hover:text-indigo-200">
            {item.title}
          </a>
          <p className="text-slate-300">{item.description}</p>
          {item.source && <p className="text-xs text-slate-400">{item.source}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function AppPage() {
  const [provider, setProvider] = useState<ProviderName>("openai");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keyStatus, setKeyStatus] = useState("");
  const [fileName, setFileName] = useState("");
  const [totalPdfPages, setTotalPdfPages] = useState<number | undefined>(undefined);
  const [uploadedPages, setUploadedPages] = useState<UploadedPage[]>([]);
  const [toolkit, setToolkit] = useState<ScriptToolkitResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("Upload your full script PDF to generate complete visual resources.");

  const storageKey = useMemo(() => `${KEY_STORAGE_PREFIX}_${provider}`, [provider]);

  async function getDecryptedApiKey(): Promise<string> {
    const encrypted = localStorage.getItem(storageKey);
    if (!encrypted) throw new Error("No saved API key for selected provider.");
    return decryptText(encrypted, getOrCreateClientSecret());
  }

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) {
      setKeyStatus("Please enter a key before saving.");
      return;
    }
    const encrypted = await encryptText(apiKeyInput.trim(), getOrCreateClientSecret());
    localStorage.setItem(storageKey, encrypted);
    setApiKeyInput("");
    setKeyStatus("Encrypted key saved locally.");
  }

  function handleClearKey() {
    localStorage.removeItem(storageKey);
    setKeyStatus("Saved key cleared.");
  }

  async function analyzeScript(file: File) {
    setProcessing(true);
    setToolkit(null);
    setStatus("Extracting every page from your PDF...");
    setFileName(file.name);

    try {
      const parsed = await parsePdf(file);
      setTotalPdfPages(parsed.totalPages);
      setUploadedPages(parsed.pages.map((page) => ({ pageIndex: page.pageIndex, thumbnailDataUrl: page.thumbnailDataUrl })));

      const apiKey = await getDecryptedApiKey();
      setStatus("Generating high-accuracy prompt packs, links, and references...");

      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, scriptText: parsed.fullText, fileName: file.name })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setToolkit(data);
      setStatus("Toolkit ready. Full-PDF results are prepared for editing.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to analyze script.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 md:px-8">
      {processing && <LoadingOverlay message={status} />}

      <div className="mb-8 rounded-3xl border border-indigo-300/25 bg-gradient-to-br from-indigo-500/20 via-slate-900 to-slate-950 p-8 shadow-2xl">
        <p className="mb-3 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-200">
          PAGE TO PIXEL · PRO EDITOR WORKBENCH
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Professional Visual Research Platform for Video Editors</h1>
        <p className="mt-3 max-w-4xl text-sm text-slate-200 md:text-base">
          Paste your API key, upload your complete script PDF, and receive a production-ready package: AI image prompts,
          image discovery links, relevant news, b-roll references, and context research.
        </p>
      </div>

      <section className="mb-6 grid gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5 md:grid-cols-3">
        <ProviderSelector provider={provider} onChange={setProvider} />
        <ApiKeyManager value={apiKeyInput} onChange={setApiKeyInput} onSave={handleSaveKey} onClear={handleClearKey} status={keyStatus} />
        <PdfUploader onFile={analyzeScript} />
      </section>

      <p className="mb-6 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-200">
        Status: {status}
        {totalPdfPages ? ` · Total pages processed: ${totalPdfPages}` : ""}
      </p>

      {!!uploadedPages.length && (
        <SectionCard title="Preview" subtitle="The first pages are shown for quick visual confirmation. Analysis uses the full PDF.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {uploadedPages.map((page) => (
              <div key={page.pageIndex} className="rounded-xl border border-white/10 bg-slate-950/70 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.thumbnailDataUrl} alt={`Script page ${page.pageIndex + 1}`} className="mb-2 w-full rounded-lg" />
                <p className="text-xs text-slate-300">Page {page.pageIndex + 1}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {toolkit && (
        <div className="mt-6 space-y-5">
          <SectionCard title="Creative Direction" subtitle={`File: ${fileName || "Uploaded script"}`}>
            <p className="mb-3 text-sm text-slate-200">{toolkit.summary}</p>
            <p className="rounded-lg border border-indigo-300/20 bg-indigo-500/10 p-3 text-sm text-indigo-100">{toolkit.productionAngle}</p>
          </SectionCard>

          <SectionCard title="AI Image Prompts" subtitle="Cinematic prompts aligned with your script narrative.">
            <div className="grid gap-3 lg:grid-cols-2">
              {toolkit.imagePrompts.map((item, index) => (
                <article key={`${item.sceneTitle}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  <h4 className="font-semibold text-white">{item.sceneTitle}</h4>
                  <p className="mt-2 text-sm text-slate-200">{item.prompt}</p>
                  <p className="mt-2 text-xs text-cyan-200">Visual goal: {item.visualGoal}</p>
                  <a href={item.suggestedSearchLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-indigo-300 hover:text-indigo-200">
                    Open related image discovery →
                  </a>
                </article>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Image Resources" subtitle="Direct still-image sources for your cuts.">
              <ResourceList items={toolkit.imageReferences} />
            </SectionCard>
            <SectionCard title="Related News" subtitle="Topical article sources mapped to the script.">
              <ResourceList items={toolkit.newsLinks} />
            </SectionCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Video Clips & B-roll" subtitle="Motion references and footage leads.">
              <ResourceList items={toolkit.videoReferences} />
            </SectionCard>
            <SectionCard title="Reference Materials" subtitle="Reports, explainers, and deeper context.">
              <ResourceList items={toolkit.researchReferences} />
            </SectionCard>
          </div>
        </div>
      )}
    </main>
  );
}
