"use client";

import { ProviderName } from "@/lib/providers/types";

export function ProviderSelector({
  provider,
  onChange
}: {
  provider: ProviderName;
  onChange: (provider: ProviderName) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-300">Provider</label>
      <select
        value={provider}
        onChange={(e) => onChange(e.target.value as ProviderName)}
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
      >
        <option value="openai">OpenAI</option>
        <option value="gemini">Google Gemini</option>
      </select>
    </div>
  );
}
