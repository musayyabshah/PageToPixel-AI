"use client";

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
  promptError?: string;
};

export function PromptCard({
  item,
  onPromptChange,
  onSizeChange,
  onGeneratePrompt
}: {
  item: PromptItem;
  onPromptChange: (id: string, prompt: string) => void;
  onSizeChange: (id: string, size: string) => void;
  onGeneratePrompt: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[220px,1fr,260px]">
      <div>
        <p className="mb-2 text-sm font-medium">Page {item.pageIndex + 1}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumbnailDataUrl} alt={`Page ${item.pageIndex + 1}`} className="w-full rounded border border-slate-800" />
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Best Prompt</label>
        <textarea
          value={item.prompt}
          onChange={(e) => onPromptChange(item.id, e.target.value)}
          rows={10}
          className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
        />
        {item.notes && <p className="mt-2 text-xs text-slate-400">Notes: {item.notes}</p>}
        {item.negativePrompt && <p className="mt-2 text-xs text-slate-400">Negative: {item.negativePrompt}</p>}
        {item.promptError && <p className="mt-2 text-sm text-rose-400">Prompt error: {item.promptError}</p>}
      </div>

      <div className="space-y-2">
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Suggested Size</label>
        <select
          value={item.size}
          onChange={(e) => onSizeChange(item.id, e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
        >
          <option value="1024x1024">1024x1024</option>
          <option value="1024x1536">1024x1536</option>
          <option value="1536x1024">1536x1024</option>
        </select>
        <button
          type="button"
          onClick={() => onGeneratePrompt(item.id)}
          disabled={item.promptStatus === "generating"}
          className="w-full rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {item.promptStatus === "generating" ? "Generating prompt..." : "Regenerate best prompt"}
        </button>
        <p className="text-xs text-slate-400">Prompt status: {item.promptStatus}</p>
      </div>
    </div>
  );
}
