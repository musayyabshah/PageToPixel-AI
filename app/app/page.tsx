"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { PdfUploader } from "@/components/PdfUploader";
import { ProviderSelector } from "@/components/ProviderSelector";
import { DEFAULT_PAGES_TO_PROCESS, KEY_STORAGE_PREFIX, MAX_PAGE_LIMIT } from "@/lib/config";
import { decryptText, encryptText, getOrCreateClientSecret } from "@/lib/crypto";
import { renderPdfPages } from "@/lib/pdf";
import { ProviderName, ScriptToolkitResult } from "@/lib/providers/types";

type UploadedPage = {
  pageIndex: number;
  thumbnailDataUrl: string;
  text: string;
};

function SectionCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.45)] backdrop-blur">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mb-4 mt-1 text-sm text-slate-300">{subtitle}</p>
      {children}
    </section>
  );
}

export default function AppPage() {
  const [provider, setProvider] = useState<ProviderName>("openai");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keyStatus, setKeyStatus] = useState("");
  const [pagesToProcess, setPagesToProcess] = useState(DEFAULT_PAGES_TO_PROCESS);
  const [fileName, setFileName] = useState("");
  const [totalPdfPages, setTotalPdfPages] = useState<number | undefined>(undefined);
  const [uploadedPages, setUploadedPages] = useState<UploadedPage[]>([]);
  const [toolkit, setToolkit] = useState<ScriptToolkitResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("Upload your script PDF to generate an editor toolkit.");

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
    setStatus("Reading PDF and extracting script...");
    setFileName(file.name);

    try {
      const rendered = await renderPdfPages(file, pagesToProcess);
      setTotalPdfPages(rendered.totalPages);
      setUploadedPages(
        rendered.pages.map((page) => ({
          pageIndex: page.pageIndex,
          thumbnailDataUrl: page.thumbnailDataUrl,
          text: page.text
        }))
      );

      const scriptText = rendered.pages.map((p) => `Page ${p.pageIndex + 1}: ${p.text}`).join("\n\n");
      const apiKey = await getDecryptedApiKey();

      setStatus("Generating premium visual prompts, links, news, and reference materials...");

      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, scriptText, fileName: file.name })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setToolkit(data);
      setStatus("Toolkit ready. Your visual research package is now generated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to analyze script.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 md:px-8">
      <div className="mb-8 rounded-3xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500/20 via-slate-900 to-slate-950 p-8 shadow-2xl">
        <p className="mb-3 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-200">
          PAGE TO PIXEL · EDITOR SUITE
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">AI Visual Research Workbench for Video Editors</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">
          Upload your script PDF and instantly get polished image prompts, related image links, current news resources,
          video references, and production research—all organized for fast editing workflows.
        </p>
      </div>

      <section className="mb-6 grid gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 md:grid-cols-2">
        <ProviderSelector provider={provider} onChange={setProvider} />
        <ApiKeyManager value={apiKeyInput} onChange={setApiKeyInput} onSave={handleSaveKey} onClear={handleClearKey} status={keyStatus} />
        <PdfUploader onFile={analyzeScript} />
        <div>
          <label className="mb-1 block text-sm text-slate-300">Process first N pages (max {MAX_PAGE_LIMIT})</label>
          <input
            type="number"
            min={1}
            max={MAX_PAGE_LIMIT}
            value={pagesToProcess}
            onChange={(e) => setPagesToProcess(Number(e.target.value))}
            className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2"
          />
        </div>
      </section>

      <p className="mb-6 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-200">
        {processing ? "Working... " : "Status: "}
        {status}
        {totalPdfPages ? ` · PDF pages: ${totalPdfPages}` : ""}
      </p>

      {!!uploadedPages.length && (
        <SectionCard title="Script Pages" subtitle="Quick page preview extracted from your PDF.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

          <SectionCard title="AI Image Prompts" subtitle="High-quality prompts for generating cinematic visuals.">
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

          <SectionCard title="Image Resources" subtitle="Direct references and source links for still imagery.">
            <ul className="space-y-2">
              {toolkit.imageReferences.map((item, index) => (
                <li key={`${item.url}-${index}`} className="rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm">
                  <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-indigo-300 hover:text-indigo-200">
                    {item.title}
                  </a>
                  <p className="text-slate-300">{item.description}</p>
                  <p className="text-xs text-slate-400">{item.source || "Reference"}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Related News" subtitle="Editorially relevant stories and article links.">
              <ul className="space-y-2">
                {toolkit.newsLinks.map((item, index) => (
                  <li key={`${item.url}-${index}`} className="rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm">
                    <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-indigo-300 hover:text-indigo-200">
                      {item.title}
                    </a>
                    <p className="text-slate-300">{item.description}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Video Clips & B-roll" subtitle="Useful references for motion visuals and editing inspiration.">
              <ul className="space-y-2">
                {toolkit.videoReferences.map((item, index) => (
                  <li key={`${item.url}-${index}`} className="rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm">
                    <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-indigo-300 hover:text-indigo-200">
                      {item.title}
                    </a>
                    <p className="text-slate-300">{item.description}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>

          <SectionCard title="Reference Materials" subtitle="Background explainers, reports, and context for your script topic.">
            <ul className="space-y-2">
              {toolkit.researchReferences.map((item, index) => (
                <li key={`${item.url}-${index}`} className="rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm">
                  <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-indigo-300 hover:text-indigo-200">
                    {item.title}
                  </a>
                  <p className="text-slate-300">{item.description}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}
    </main>
  );
}
