"use client";

export function PdfUploader({ onFile }: { onFile: (file: File) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-300">PDF Upload</label>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
        className="w-full rounded-md border border-dashed border-slate-600 bg-slate-900 p-3 text-sm"
      />
    </div>
  );
}
