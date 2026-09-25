"use client";

import React, { useState } from "react";
import {
  FileDiff,
  Sparkles,
  Loader2,
  Trash2,
  AlertTriangle,
  SlidersHorizontal,
  Code2,
  Layers,
  Bug,
  ListFilter,
  ScrollText,
} from "lucide-react";
import { GithubIcon } from "./GithubIcon";
import { PRTemplate, PRTone, AppSettings } from "@/types";
import { cn } from "@/lib/utils";

interface DiffInputPanelProps {
  diff: string;
  onChangeDiff: (diff: string) => void;
  commits: string;
  onChangeCommits: (commits: string) => void;
  template: PRTemplate;
  onChangeTemplate: (template: PRTemplate) => void;
  tone: PRTone;
  onChangeTone: (tone: PRTone) => void;
  onGenerate: () => void;
  isLoading: boolean;
  settings: AppSettings;
  onOpenSettings: () => void;
}

export function DiffInputPanel({
  diff,
  onChangeDiff,
  commits,
  onChangeCommits,
  template,
  onChangeTemplate,
  tone,
  onChangeTone,
  onGenerate,
  isLoading,
  settings,
  onOpenSettings,
}: DiffInputPanelProps) {
  const [activeTab, setActiveTab] = useState<"diff" | "github">("diff");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [showCommitInput, setShowCommitInput] = useState(false);

  const handleFetchGithub = async () => {
    if (!githubUrl.trim()) return;
    setIsFetchingGithub(true);
    setGithubError(null);

    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl, token: githubToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch GitHub PR");
      }

      onChangeDiff(data.diff || "");
      if (data.commits) {
        onChangeCommits(data.commits);
        setShowCommitInput(true);
      }
      setActiveTab("diff");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch PR from GitHub.";
      setGithubError(message);
    } finally {
      setIsFetchingGithub(false);
    }
  };

  const lineCount = diff ? diff.split("\n").length : 0;

  const TEMPLATES: { id: PRTemplate; name: string; desc: string; icon: React.ElementType }[] = [
    {
      id: "standard",
      name: "Standard",
      desc: "What, Why, Impact, How to Test",
      icon: Layers,
    },
    {
      id: "bugfix",
      name: "Bugfix",
      desc: "Issue, Root cause, Regressions",
      icon: Bug,
    },
    {
      id: "minimal",
      name: "Minimal",
      desc: "Quick bullet summary & verification",
      icon: ListFilter,
    },
    {
      id: "release-notes",
      name: "Release Note",
      desc: "Changelog & upgrade instructions",
      icon: ScrollText,
    },
  ];

  const TONES: { id: PRTone; label: string; desc: string }[] = [
    { id: "technical", label: "Technical", desc: "Engineering depth & architecture" },
    { id: "concise", label: "Concise", desc: "Brief, high signal-to-noise bullets" },
    { id: "detailed", label: "Detailed", desc: "Deep context across modified layers" },
    { id: "stakeholder", label: "Stakeholder", desc: "Product impact & business value" },
  ];

  return (
    <div className="flex flex-col h-full rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm overflow-hidden shadow-xl">
      {/* Top Header & Tabs */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/70">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
          <button
            onClick={() => setActiveTab("diff")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              activeTab === "diff"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <FileDiff className="w-3.5 h-3.5 text-emerald-400" />
            <span>Direct Git Diff</span>
          </button>
          <button
            onClick={() => setActiveTab("github")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              activeTab === "github"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <GithubIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>GitHub PR / URL</span>
          </button>
        </div>

        {activeTab === "diff" && diff && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 font-mono text-[11px]">
              {lineCount} lines ({diff.length.toLocaleString()} chars)
            </span>
            <button
              onClick={() => {
                onChangeDiff("");
                onChangeCommits("");
              }}
              className="p-1 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Clear input"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
        {activeTab === "github" ? (
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                GitHub Pull Request or Compare URL
              </label>
              <p className="text-[11px] text-zinc-400 mb-2">
                Supports URLs like <code className="text-emerald-400">https://github.com/owner/repo/pull/123</code> or shorthand <code className="text-emerald-400">owner/repo#123</code>.
              </p>
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/facebook/react/pull/28000"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Personal Access Token (Optional)
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (needed for private repos or rate limits)"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>

            {githubError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <p>{githubError}</p>
              </div>
            )}

            <button
              onClick={handleFetchGithub}
              disabled={isFetchingGithub || !githubUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              {isFetchingGithub ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching Diff from GitHub API...</span>
                </>
              ) : (
                <>
                  <GithubIcon className="w-4 h-4" />
                  <span>Fetch PR Diff & Commits</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Raw Git Diff</span>
              </label>
              <span className="text-[11px] text-zinc-400">
                Terminal command: <code className="text-zinc-300 bg-zinc-800/80 px-1 py-0.5 rounded">git diff main...HEAD</code>
              </span>
            </div>

            <div className="relative flex-1 flex flex-col">
              <textarea
                value={diff}
                onChange={(e) => onChangeDiff(e.target.value)}
                placeholder="diff --git a/src/app.ts b/src/app.ts&#10;index 1a2b3c..4d5e6f 100644&#10;--- a/src/app.ts&#10;+++ b/src/app.ts&#10;@@ -10,6 +10,12 @@&#10;+ // Paste your git diff here or click 'Load Sample Diff' above"
                className="w-full flex-1 min-h-[220px] rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y leading-relaxed shadow-inner"
                spellCheck={false}
              />
            </div>

            {/* Commit logs toggle / input */}
            <div className="mt-3">
              {!showCommitInput && !commits ? (
                <button
                  type="button"
                  onClick={() => setShowCommitInput(true)}
                  className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  <span>+ Include Commit Log History (Optional)</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">
                      Commit History <span className="text-zinc-500 font-normal">(`git log main..HEAD --oneline`)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCommitInput(false);
                        onChangeCommits("");
                      }}
                      className="text-[11px] text-zinc-400 hover:text-zinc-300"
                    >
                      Hide
                    </button>
                  </div>
                  <textarea
                    value={commits}
                    onChange={(e) => onChangeCommits(e.target.value)}
                    placeholder="9f2b81a feat: add checkout session&#10;4c1a70e feat: add subscription modal"
                    rows={3}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/70 focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration Selectors */}
        <div className="pt-3 border-t border-zinc-800/80 space-y-3.5">
          {/* PR Template Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              PR Structure Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = template === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => onChangeTemplate(tmpl.id)}
                    className={cn(
                      "flex flex-col text-left p-2.5 rounded-xl border transition-all",
                      isSelected
                        ? "border-emerald-500/70 bg-emerald-500/10 text-white shadow-sm"
                        : "border-zinc-800/80 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-emerald-400" : "text-zinc-400")} />
                      <span className="text-xs font-semibold">{tmpl.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 line-clamp-1">{tmpl.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Writing Tone & Detail
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TONES.map((t) => {
                const isSelected = tone === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChangeTone(t.id)}
                    className={cn(
                      "flex flex-col text-left p-2.5 rounded-xl border transition-all",
                      isSelected
                        ? "border-emerald-500/70 bg-emerald-500/10 text-white shadow-sm"
                        : "border-zinc-800/80 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    <span className="text-xs font-semibold mb-0.5">{t.label}</span>
                    <span className="text-[10px] text-zinc-400 line-clamp-1">{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Provider:</span>
          <span className="text-emerald-400 font-medium">
            {settings.provider === "smart-parser" ? "Smart Engine (No Key)" : settings.provider}
          </span>
        </button>

        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading || !diff.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-semibold text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
              <span>Generating Brief...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-zinc-950" />
              <span>Generate PR Brief</span>
              <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-zinc-950/20 text-zinc-900 rounded">
                Ctrl+Enter
              </kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
