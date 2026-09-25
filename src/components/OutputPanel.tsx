"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Download,
  RefreshCw,
  Eye,
  FileEdit,
  Columns,
  Sparkles,
  ScrollText,
  AlertTriangle,
  GitPullRequest,
  Tag,
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useToast } from "./Toast";
import { cn } from "@/lib/utils";

interface OutputPanelProps {
  title: string;
  markdown: string;
  onChangeMarkdown: (val: string) => void;
  isLoading: boolean;
  onRegenerate: () => void;
  onExportReleaseNotes: () => void;
  providerUsed?: string;
  modelUsed?: string;
  warnings?: string[];
  onLoadSample: () => void;
}

export function OutputPanel({
  title,
  markdown,
  onChangeMarkdown,
  isLoading,
  onRegenerate,
  onExportReleaseNotes,
  providerUsed,
  modelUsed,
  warnings,
  onLoadSample,
}: OutputPanelProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"preview" | "raw" | "split">("preview");
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const handleCopyMarkdown = () => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown);
    setCopiedMarkdown(true);
    toast({
      type: "success",
      title: "Markdown Copied!",
      message: "Pull request description copied to clipboard.",
    });
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleCopyTitle = () => {
    if (!title) return;
    navigator.clipboard.writeText(title);
    setCopiedTitle(true);
    toast({
      type: "success",
      title: "PR Title Copied!",
      message: title,
    });
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const handleDownload = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PR_DESCRIPTION_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      type: "success",
      title: "File Downloaded",
      message: "Saved as markdown document.",
    });
  };

  if (!markdown && !isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
          <GitPullRequest className="w-6 h-6 stroke-[2]" />
        </div>
        <h3 className="text-base font-semibold text-white">No PR Brief Generated Yet</h3>
        <p className="text-xs text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
          Paste your git diff or fetch a GitHub PR on the left, then click{" "}
          <span className="text-emerald-400 font-medium">Generate PR Brief</span> to produce structured markdown.
        </p>
        <button
          onClick={onLoadSample}
          className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 text-xs font-medium border border-zinc-700/80 transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Try with Sample Diff</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm overflow-hidden shadow-xl">
      {/* Top Header & Actions */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/70 flex flex-wrap items-center justify-between gap-3">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
          <button
            onClick={() => setViewMode("preview")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              viewMode === "preview" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => setViewMode("raw")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              viewMode === "raw" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <FileEdit className="w-3.5 h-3.5 text-sky-400" />
            <span>Raw Markdown</span>
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={cn(
              "hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              viewMode === "split" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
            )}
            title="Side-by-side split view"
          >
            <Columns className="w-3.5 h-3.5 text-amber-400" />
            <span>Split</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors disabled:opacity-50"
            title="Regenerate brief with current settings"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-emerald-400")} />
            <span className="hidden sm:inline">Regenerate</span>
          </button>

          <button
            onClick={onExportReleaseNotes}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
            title="Convert to Release Notes format"
          >
            <ScrollText className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Release Note</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
            title="Download markdown file"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Export .md</span>
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-all shadow-md shadow-emerald-500/10 active:scale-95"
            title="Copy PR Markdown to clipboard"
          >
            {copiedMarkdown ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Suggested PR Title Banner */}
      {title && (
        <div className="px-4 py-2.5 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0">
              PR Title:
            </span>
            <span className="font-mono text-xs text-emerald-300 font-medium truncate">
              {title}
            </span>
          </div>
          <button
            onClick={handleCopyTitle}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white transition-colors"
            title="Copy Title"
          >
            {copiedTitle ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedTitle ? "Copied" : "Copy Title"}</span>
          </button>
        </div>
      )}

      {/* Warnings & Engine Attribution */}
      {warnings && warnings.length > 0 && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto min-h-[300px]">
        {viewMode === "preview" && (
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 shadow-inner">
            <MarkdownRenderer content={markdown} />
          </div>
        )}

        {viewMode === "raw" && (
          <textarea
            value={markdown}
            onChange={(e) => onChangeMarkdown(e.target.value)}
            className="w-full h-full min-h-[400px] rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none resize-none leading-relaxed"
            spellCheck={false}
          />
        )}

        {viewMode === "split" && (
          <div className="grid grid-cols-2 gap-4 h-full min-h-[400px]">
            <textarea
              value={markdown}
              onChange={(e) => onChangeMarkdown(e.target.value)}
              className="w-full h-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 overflow-y-auto shadow-inner">
              <MarkdownRenderer content={markdown} />
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-[11px] text-zinc-500">
        <div>
          {providerUsed && (
            <span>
              Engine: <strong className="text-zinc-300 font-medium">{providerUsed}</strong>
              {modelUsed && <span> ({modelUsed})</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>{markdown ? `${markdown.split("\n").length} lines` : ""}</span>
        </div>
      </div>
    </div>
  );
}
