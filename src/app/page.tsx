"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { DiffInputPanel } from "@/components/DiffInputPanel";
import { StatsBar } from "@/components/StatsBar";
import { OutputPanel } from "@/components/OutputPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { useToast } from "@/components/Toast";
import { parseGitDiff } from "@/lib/diff-parser";
import { SAMPLE_PRESETS } from "@/lib/sample-diffs";
import {
  AppSettings,
  GenerateResponse,
  PRTemplate,
  PRTone,
  SampleDiffPreset,
} from "@/types";

const DEFAULT_SETTINGS: AppSettings = {
  provider: "smart-parser",
  apiKey: "",
  model: "Rule-Based AST",
  baseUrl: "",
};

export default function Home() {
  const { toast } = useToast();

  // Input states
  const [diff, setDiff] = useState("");
  const [commits, setCommits] = useState("");
  const [template, setTemplate] = useState<PRTemplate>("standard");
  const [tone, setTone] = useState<PRTone>("technical");

  // Output states
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");
  const [providerUsed, setProviderUsed] = useState("");
  const [modelUsed, setModelUsed] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Settings & modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pr_brief_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            parsed.provider === "gemini" &&
            (parsed.model === "gemini-2.0-flash" || parsed.model === "gemini-2.0-flash-lite")
          ) {
            parsed.model = "gemini-2.5-flash";
            localStorage.setItem("pr_brief_settings", JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch (e) {
        console.warn("Failed to load settings from localStorage", e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem("pr_brief_settings", JSON.stringify(newSettings));
      toast({
        type: "success",
        title: "Settings Saved",
        message: `Provider set to ${newSettings.provider}`,
      });
    } catch (e) {
      console.warn("Failed to save settings to localStorage", e);
    }
  };

  // Real-time pre-AI parsing derived state
  const parsedDiff = React.useMemo(() => {
    if (!diff || !diff.trim()) return null;
    return parseGitDiff(diff, commits);
  }, [diff, commits]);

  const parsedStats = parsedDiff?.stats ?? null;
  const parsedFiles = parsedDiff?.files ?? [];
  const isTruncated = parsedDiff?.truncated ?? false;

  // Handle Preset Selection
  const handleSelectPreset = useCallback(
    (preset: SampleDiffPreset) => {
      setDiff(preset.diff);
      setCommits(preset.commits);
      setTemplate(preset.template);
      setTone(preset.tone);
      setGeneratedTitle(preset.suggestedTitle);

      toast({
        type: "info",
        title: `Loaded: ${preset.name}`,
        message: "Sample diff and commit history populated.",
      });
    },
    [toast]
  );

  // Generate Brief Handler
  const handleGenerate = useCallback(
    async (overrideTemplate?: PRTemplate) => {
      if (!diff || !diff.trim()) {
        toast({
          type: "error",
          title: "Missing Diff",
          message: "Please paste a git diff or select a sample preset first.",
        });
        return;
      }

      const activeTemplate = overrideTemplate || template;
      setIsLoading(true);
      setWarnings([]);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            diff,
            commits,
            template: activeTemplate,
            tone,
            provider: settings.provider,
            apiKey: settings.apiKey,
            model: settings.model,
            baseUrl: settings.baseUrl,
          }),
        });

        const data: GenerateResponse = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to generate PR brief");
        }

        setGeneratedTitle(data.title);
        setGeneratedMarkdown(data.markdown);
        setProviderUsed(data.providerUsed);
        setModelUsed(data.modelUsed || "");
        if (data.warnings && data.warnings.length > 0) {
          setWarnings(data.warnings);
        }

        toast({
          type: "success",
          title: "PR Brief Generated!",
          message: `${data.stats.totalFiles} files analyzed with ${data.providerUsed}`,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        toast({
          type: "error",
          title: "Generation Failed",
          message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [diff, commits, template, tone, settings, toast]
  );

  // Export as Release Note
  const handleExportReleaseNotes = useCallback(() => {
    setTemplate("release-notes");
    handleGenerate("release-notes");
  }, [handleGenerate]);

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleGenerate]);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Navigation */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectPreset={handleSelectPreset}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-4">
        {/* Pre-AI Parsed Metrics & Categories Bar */}
        <StatsBar
          stats={parsedStats}
          files={parsedFiles}
          suggestedTitle={generatedTitle}
          isTruncated={isTruncated}
        />

        {/* Split Grid: Left Input, Right Output */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
          {/* Left Panel: Diff & Configuration Input */}
          <DiffInputPanel
            diff={diff}
            onChangeDiff={setDiff}
            commits={commits}
            onChangeCommits={setCommits}
            template={template}
            onChangeTemplate={setTemplate}
            tone={tone}
            onChangeTone={setTone}
            onGenerate={() => handleGenerate()}
            isLoading={isLoading}
            settings={settings}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Right Panel: Markdown Preview & Export */}
          <OutputPanel
            title={generatedTitle}
            markdown={generatedMarkdown}
            onChangeMarkdown={setGeneratedMarkdown}
            isLoading={isLoading}
            onRegenerate={() => handleGenerate()}
            onExportReleaseNotes={handleExportReleaseNotes}
            providerUsed={providerUsed}
            modelUsed={modelUsed}
            warnings={warnings}
            onLoadSample={() => handleSelectPreset(SAMPLE_PRESETS[0])}
          />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
