"use client";

import React, { useState } from "react";
import {
  GitPullRequest,
  Settings,
  Sparkles,
  ChevronDown,
  Layers,
  Bug,
  Database,
  Cpu,
} from "lucide-react";
import { GithubIcon } from "./GithubIcon";
import { SAMPLE_PRESETS } from "@/lib/sample-diffs";
import { AppSettings, SampleDiffPreset } from "@/types";

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onSelectPreset: (preset: SampleDiffPreset) => void;
}

export function Header({
  settings,
  onOpenSettings,
  onSelectPreset,
}: HeaderProps) {
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);

  const getPresetIcon = (id: string) => {
    if (id.includes("stripe")) return <Layers className="w-4 h-4 text-sky-400" />;
    if (id.includes("leak") || id.includes("bugfix")) return <Bug className="w-4 h-4 text-rose-400" />;
    return <Database className="w-4 h-4 text-emerald-400" />;
  };

  const getProviderLabel = () => {
    switch (settings.provider) {
      case "smart-parser":
        return "Smart Parser (Local)";
      case "gemini":
        return "Gemini API";
      case "openai":
        return "OpenAI API";
      case "groq":
        return "Groq Llama 3";
      case "anthropic":
        return "Claude API";
      case "ollama":
        return "Local Ollama";
      default:
        return settings.provider;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <GitPullRequest className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">PR-Brief</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                v1.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Clean, structured PR descriptions & changelogs from Git diffs
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Sample Presets Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700/80 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition-all shadow-sm"
              title="Load realistic sample diffs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Sample Diff</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {presetDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setPresetDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl p-2 shadow-2xl z-30 space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Sample Git Diffs
                  </div>
                  {SAMPLE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPreset(p);
                        setPresetDropdownOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-zinc-800/80 transition-colors flex items-start gap-2.5 group"
                    >
                      <div className="mt-0.5 shrink-0">{getPresetIcon(p.id)}</div>
                      <div>
                        <p className="text-xs font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                          {p.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Engine indicator / Settings trigger */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700 transition-colors"
            title="Configure AI Provider & API Keys"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">{getProviderLabel()}</span>
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* GitHub link */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors hidden sm:block"
            title="GitHub Repository"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
