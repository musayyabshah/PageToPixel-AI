"use client";

export function ApiKeyManager({
  value,
  onChange,
  onSave,
  onClear,
  status
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  status: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-300">API Key</label>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste API key"
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        />
        <button className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium" onClick={onSave} type="button">
          Save
        </button>
        <button className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium" onClick={onClear} type="button">
          Clear
        </button>
      </div>
      {status && <p className="mt-1 text-xs text-slate-400">{status}</p>}
    </div>
  );
}
