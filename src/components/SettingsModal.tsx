"use client";

import React, { useState } from "react";
import { X, Key, ShieldCheck, Eye, EyeOff, Check } from "lucide-react";
import { AIProvider, AppSettings } from "@/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

const PROVIDER_OPTIONS: { id: AIProvider; name: string; desc: string; defaultModel: string }[] = [
  {
    id: "smart-parser",
    name: "Built-in Smart Semantic Engine (Offline / No Key)",
    desc: "100% private AST & diff pattern analyzer. Zero configuration or API keys needed.",
    defaultModel: "Rule-Based AST",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    desc: "High quality, ultra-fast generation with gemini-2.5-flash or 1.5-flash.",
    defaultModel: "gemini-2.5-flash",
  },
  {
    id: "openai",
    name: "OpenAI",
    desc: "Uses GPT-4o-mini or GPT-4o for nuanced code reasoning.",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "groq",
    name: "Groq (Llama 3.3)",
    desc: "Ultra-low latency inference via Groq cloud API.",
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    desc: "Deep architectural synthesis with Claude 3.5 Sonnet.",
    defaultModel: "claude-3-5-sonnet-20241022",
  },
  {
    id: "ollama",
    name: "Ollama (Local LLM)",
    desc: "Self-hosted local model running on your local machine (e.g. localhost:11434).",
    defaultModel: "llama3",
  },
];

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: SettingsModalProps) {
  const [current, setCurrent] = useState<AppSettings>(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  if (!isOpen) return null;

  const handleProviderChange = (provider: AIProvider) => {
    const opt = PROVIDER_OPTIONS.find((p) => p.id === provider);
    setCurrent((prev) => ({
      ...prev,
      provider,
      model: opt?.defaultModel || prev.model,
      baseUrl:
        provider === "ollama"
          ? "http://localhost:11434"
          : provider === "openai"
          ? "https://api.openai.com/v1"
          : provider === "groq"
          ? "https://api.groq.com/openai/v1"
          : "",
    }));
  };

  const handleSave = () => {
    onSaveSettings(current);
    setSavedBadge(true);
    setTimeout(() => {
      setSavedBadge(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Engine & API Settings</h2>
              <p className="text-xs text-zinc-400">Configure LLM providers or use the offline parser</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded-md hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Select Inference Provider
            </label>
            <div className="space-y-2">
              {PROVIDER_OPTIONS.map((opt) => {
                const selected = current.provider === opt.id;
                return (
                  <label
                    key={opt.id}
                    onClick={() => handleProviderChange(opt.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selected
                        ? "border-emerald-500/60 bg-emerald-500/5 text-zinc-100"
                        : "border-zinc-800/80 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="provider"
                      checked={selected}
                      onChange={() => handleProviderChange(opt.id)}
                      className="mt-1 text-emerald-500 focus:ring-emerald-400"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs sm:text-sm text-white">{opt.name}</span>
                        {opt.id === "smart-parser" && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 rounded">
                            Recommended / Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* API Key Input */}
          {current.provider !== "smart-parser" && (
            <div className="space-y-4 pt-2 border-t border-zinc-800/80">
              {current.provider !== "ollama" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <span>API Key</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-zinc-500">Stored in browser localStorage</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={current.apiKey}
                      onChange={(e) => setCurrent({ ...current, apiKey: e.target.value })}
                      placeholder={`Enter your ${current.provider} API key...`}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Model Override */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Model Identifier
                </label>
                <input
                  type="text"
                  value={current.model}
                  onChange={(e) => setCurrent({ ...current, model: e.target.value })}
                  placeholder="e.g. gemini-2.5-flash or gpt-4o-mini"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              {/* Base URL (for Ollama or OpenAI proxies) */}
              {(current.provider === "ollama" || current.provider === "openai") && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    API Base URL {current.provider === "ollama" ? "(Local Daemon)" : "(Optional Proxy)"}
                  </label>
                  <input
                    type="text"
                    value={current.baseUrl}
                    onChange={(e) => setCurrent({ ...current, baseUrl: e.target.value })}
                    placeholder={
                      current.provider === "ollama" ? "http://localhost:11434" : "https://api.openai.com/v1"
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* Privacy Note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Your credentials are saved exclusively in your browser&apos;s local storage. They are sent directly to the selected API provider and never stored or logged on any external server.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/90">
          <button
            onClick={() => {
              const resetSettings: AppSettings = {
                provider: "smart-parser",
                apiKey: "",
                model: "Rule-Based AST",
                baseUrl: "",
              };
              setCurrent(resetSettings);
              onSaveSettings(resetSettings);
            }}
            className="text-xs text-zinc-400 hover:text-rose-400 transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 font-semibold"
            >
              {savedBadge ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                "Save Configuration"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
