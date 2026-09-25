export type FileCategory =
  | "Frontend"
  | "Backend"
  | "Database"
  | "Config"
  | "Tests"
  | "Documentation"
  | "Chore";

export type DiffFileStatus = "added" | "deleted" | "modified" | "renamed";

export interface DiffFile {
  path: string;
  oldPath?: string;
  status: DiffFileStatus;
  category: FileCategory;
  additions: number;
  deletions: number;
  isBinary: boolean;
  isLockfile: boolean;
  summary?: string;
}

export interface DiffStats {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  categoryCounts: Record<FileCategory, number>;
  estimatedReviewMinutes: number;
  omittedLockfilesCount: number;
}

export interface ParsedDiff {
  files: DiffFile[];
  stats: DiffStats;
  cleanDiff: string;
  truncated: boolean;
  originalLength: number;
  suggestedTitle?: string;
}

export type PRTemplate = "standard" | "bugfix" | "minimal" | "release-notes";

export type PRTone = "technical" | "concise" | "detailed" | "stakeholder";

export type AIProvider =
  | "smart-parser"
  | "gemini"
  | "openai"
  | "groq"
  | "anthropic"
  | "ollama";

export interface AppSettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface GenerateRequest {
  diff: string;
  commits?: string;
  template: PRTemplate;
  tone: PRTone;
  provider?: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface GenerateResponse {
  success: boolean;
  title: string;
  markdown: string;
  stats: DiffStats;
  providerUsed: string;
  modelUsed?: string;
  warnings?: string[];
  error?: string;
}

export interface SampleDiffPreset {
  id: string;
  name: string;
  description: string;
  template: PRTemplate;
  tone: PRTone;
  diff: string;
  commits: string;
  suggestedTitle: string;
}
