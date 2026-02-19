"use client";

export function PdfUploader({ onFile }: { onFile: (file: File) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-300">Script PDF</label>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
        className="w-full rounded-xl border border-dashed border-indigo-300/30 bg-slate-950/70 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-3 file:py-1 file:text-white"
      />
    </div>
  );
}
