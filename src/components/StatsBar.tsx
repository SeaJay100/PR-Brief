"use client";

import React, { useState } from "react";
import {
  FileCode,
  Plus,
  Minus,
  Clock,
  ChevronDown,
  ChevronUp,
  FileCheck,
  ShieldAlert,
} from "lucide-react";
import { DiffStats, DiffFile, FileCategory } from "@/types";
import { cn } from "@/lib/utils";

interface StatsBarProps {
  stats: DiffStats | null;
  files: DiffFile[];
  suggestedTitle?: string;
  isTruncated?: boolean;
}

const CATEGORY_COLORS: Record<FileCategory, { bg: string; text: string; border: string }> = {
  Frontend: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
  },
  Backend: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  Database: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  Config: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  Tests: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
  Documentation: {
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/20",
  },
  Chore: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/20",
  },
};

export function StatsBar({ stats, files, isTruncated }: StatsBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!stats || stats.totalFiles === 0) {
    return null;
  }

  const activeCategories = (Object.keys(stats.categoryCounts) as FileCategory[]).filter(
    (cat) => stats.categoryCounts[cat] > 0
  );

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-3.5 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Key Metrics */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 text-zinc-200 border border-zinc-700/50 font-medium">
            <FileCode className="w-3.5 h-3.5 text-zinc-400" />
            <span>{stats.totalFiles} {stats.totalFiles === 1 ? "file" : "files"}</span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 font-mono text-[11px]">
            <span className="text-emerald-400 flex items-center">
              <Plus className="w-3 h-3" />
              {stats.totalAdditions}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-rose-400 flex items-center">
              <Minus className="w-3 h-3" />
              {stats.totalDeletions}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/60 text-zinc-400 border border-zinc-700/40">
            <Clock className="w-3.5 h-3.5 text-amber-400/90" />
            <span>~{stats.estimatedReviewMinutes} min review</span>
          </div>

          {stats.omittedLockfilesCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px]">
              <FileCheck className="w-3 h-3 text-purple-400" />
              <span>{stats.omittedLockfilesCount} lockfile pruned for tokens</span>
            </div>
          )}

          {isTruncated && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>Diff truncated to prevent context overflow</span>
            </div>
          )}
        </div>

        {/* Right: Category Chips & Drawer Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeCategories.map((cat) => {
              const count = stats.categoryCounts[cat];
              const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Chore;
              return (
                <span
                  key={cat}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-medium rounded-md border flex items-center gap-1",
                    colors.bg,
                    colors.text,
                    colors.border
                  )}
                >
                  <span>{cat}</span>
                  <span className="opacity-70 font-mono text-[10px]">({count})</span>
                </span>
              );
            })}
          </div>

          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-colors ml-1"
            title="Inspect changed files"
          >
            <span>Files</span>
            {drawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible File List Drawer */}
      {drawerOpen && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-1.5 max-h-56 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-1 text-xs">
            {files.map((file, idx) => {
              const colors = CATEGORY_COLORS[file.category] || CATEGORY_COLORS.Chore;
              return (
                <div
                  key={`${file.path}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60 hover:border-zinc-700 transition-colors font-mono text-[11px]"
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-sans font-medium uppercase",
                        file.status === "added" && "bg-emerald-500/20 text-emerald-400",
                        file.status === "deleted" && "bg-rose-500/20 text-rose-400",
                        file.status === "modified" && "bg-blue-500/20 text-blue-400",
                        file.status === "renamed" && "bg-amber-500/20 text-amber-400"
                      )}
                    >
                      {file.status}
                    </span>
                    <span className="text-zinc-200 truncate">{file.path}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] border font-sans", colors.bg, colors.text, colors.border)}>
                      {file.category}
                    </span>
                    <span className="text-emerald-400">+{file.additions}</span>
                    <span className="text-rose-400">-{file.deletions}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
