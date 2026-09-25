import { AIProvider, ParsedDiff, PRTemplate, PRTone } from "@/types";
import { generateRuleBasedBrief } from "./rule-based-generator";

interface GenerateAIOptions {
  parsed: ParsedDiff;
  commits?: string;
  template: PRTemplate;
  tone: PRTone;
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export const DEFAULT_PROVIDER_MODELS: Record<AIProvider, string> = {
  "smart-parser": "Rule-Based AST",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
  anthropic: "claude-3-7-sonnet-20250219",
  ollama: "llama3",
};

// Known deprecated or legacy models mapped to their modern, active successors across all providers
export const MODEL_REMAP_MAP: Record<string, string> = {
  // Google Gemini legacy models
  "gemini-1.5-flash": "gemini-2.5-flash-lite",
  "gemini-1.5-flash-8b": "gemini-2.5-flash-lite",
  "gemini-1.5-pro": "gemini-2.5-pro",
  "gemini-1.0-pro": "gemini-2.5-flash-lite",
  "gemini-pro": "gemini-2.5-flash-lite",

  // OpenAI legacy models
  "gpt-3.5-turbo": "gpt-4o-mini",
  "gpt-3.5-turbo-16k": "gpt-4o-mini",
  "gpt-4-turbo-preview": "gpt-4o",
  "gpt-4-1106-preview": "gpt-4o",
  "gpt-4-0125-preview": "gpt-4o",

  // Groq legacy models
  "llama3-8b-8192": "llama-3.3-70b-versatile",
  "llama3-70b-8192": "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile": "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768": "llama-3.3-70b-versatile",

  // Anthropic legacy models
  "claude-3-sonnet-20240229": "claude-3-7-sonnet-20250219",
  "claude-3-opus-20240229": "claude-3-7-sonnet-20250219",
  "claude-2.1": "claude-3-5-haiku-20241022",
  "claude-2.0": "claude-3-5-haiku-20241022",
};

export function resolveModernModel(provider: AIProvider, inputModel?: string): string {
  const defaultModel = DEFAULT_PROVIDER_MODELS[provider] || "gpt-4o-mini";
  if (!inputModel || !inputModel.trim()) {
    return defaultModel;
  }
  const clean = inputModel.trim().replace(/^models\//, "");
  return MODEL_REMAP_MAP[clean] || clean;
}

export function constructPrompt(
  parsed: ParsedDiff,
  commits: string = "",
  template: PRTemplate,
  tone: PRTone
): { systemPrompt: string; userPrompt: string } {
  let templateInstructions = "";

  if (template === "bugfix") {
    templateInstructions = `Format your response strictly using this Bugfix template:
## Issue Link
Fixes #[ISSUE-NUMBER or link]

## Root Cause
Detailed explanation of why the failure occurred, what condition was missed, and the underlying fault.

## Fix Details
- **[Scope/Module]**: Bullet points describing specific fixes, cleanups, defensive guards.

## Regression Checks
- [ ] List of specific automated or manual regression verification checks.
`;
  } else if (template === "minimal") {
    templateInstructions = `Format your response strictly using this Minimal/Micro template:
### TL;DR
1-2 sentence executive overview.

### Key Updates
- High-level bullet points summarizing the core behavioral shifts.

### Verification
- Brief checklist of what was tested.
`;
  } else if (template === "release-notes") {
    templateInstructions = `Format your response strictly using this Release Notes / Changelog template:
## Release Notes - [Version/Date]

### New Features & Improvements
- Bullet points describing user or developer facing capabilities.

### Fixes & Internal Changes
- Bullet points detailing bug resolutions and refactors.

### Database & Config Changes
- List any schema, env, or dependency alterations.

### Breaking Changes
- Note any backward incompatibilities, or state "None".

### Upgrade Instructions
- Step-by-step developer instructions.
`;
  } else {
    templateInstructions = `Format your response strictly using this Standard template:
## Summary
A 2-3 sentence executive summary explaining WHAT changed and WHY.

## Key Changes
Group changes logically (e.g., Features, Refactors, Bug Fixes, Schema Changes):
- **[Scope/Module]**: Bullet points detailing specific behavioral changes.

## Categorized Impact
- **Frontend / UI**: (None or brief list)
- **Backend / API**: (New/modified endpoints or handlers)
- **Database / Migrations**: (New tables, altered columns)
- **Configuration / Dependencies**: (New packages or env vars)

## How to Test
1. Step-by-step instructions for the reviewer to verify the behavior locally.
2. Specific edge cases to observe.
`;
  }

  const toneGuidance = {
    technical: "Use precise, engineering-focused terminology with deep architectural context.",
    concise: "Keep all descriptions terse, high-signal, and bulleted. Avoid fluff or boilerplate.",
    detailed: "Provide comprehensive explanations for every modified subsystem and boundary condition.",
    stakeholder: "Focus on business value, user impact, and stability while keeping engineering details clear.",
  }[tone];

  const systemPrompt = `You are an expert senior software engineer reviewing a pull request diff.
Your task is to generate a professional, accurate, and structured Pull Request description adhering to these instructions:
1. Tone: ${toneGuidance}
2. Accurately reflect the actual changes present in the diff and commit messages. Do NOT hallucinate changes that are not in the diff.
3. Highlight breaking changes, migrations, or sensitive security/auth alterations.
4. Also suggest a Conventional Commit title on the very first line prefixed with "TITLE: ". Example: "TITLE: feat(billing): add Stripe checkout and upgrade modal"

${templateInstructions}`;

  const userPrompt = `Pull Request Analysis Data:
Total Files Changed: ${parsed.stats.totalFiles}
Total Additions: +${parsed.stats.totalAdditions}
Total Deletions: -${parsed.stats.totalDeletions}
Category Breakdown: ${Object.entries(parsed.stats.categoryCounts)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => `${cat} (${count})`)
    .join(", ")}

${commits ? `Commit Messages:\n${commits}\n\n` : ""}Files Changed:
${parsed.files.map((f) => `- ${f.path} (${f.status}, +${f.additions}/-${f.deletions})`).join("\n")}

Git Diff:
\`\`\`diff
${parsed.cleanDiff}
\`\`\`
`;

  return { systemPrompt, userPrompt };
}

export const generateBriefWithProvider = generateWithAI;

export async function generateWithAI({
  parsed,
  commits = "",
  template,
  tone,
  provider,
  apiKey,
  model,
  baseUrl,
}: GenerateAIOptions): Promise<{
  title: string;
  markdown: string;
  providerUsed: string;
  modelUsed?: string;
  warnings?: string[];
}> {
  if (provider === "smart-parser") {
    const brief = generateRuleBasedBrief({ parsed, commits, template, tone });
    return {
      title: brief.title,
      markdown: brief.markdown,
      providerUsed: "Smart Semantic Parser (Local Rule-Based)",
      modelUsed: "AST & Diff Pattern Analyzer",
    };
  }

  const effectiveKey =
    apiKey ||
    (provider === "gemini"
      ? process.env.GEMINI_API_KEY
      : provider === "openai"
      ? process.env.OPENAI_API_KEY
      : provider === "groq"
      ? process.env.GROQ_API_KEY
      : provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : undefined);

  if (!effectiveKey && provider !== "ollama") {
    const fallback = generateRuleBasedBrief({ parsed, commits, template, tone });
    return {
      title: fallback.title,
      markdown: fallback.markdown,
      providerUsed: "Smart Semantic Parser (Fallback)",
      modelUsed: "Local Engine",
      warnings: [`No API key was provided for ${provider}. Switched to built-in smart semantic parser.`],
    };
  }

  const { systemPrompt, userPrompt } = constructPrompt(parsed, commits, template, tone);

  try {
    let rawOutput = "";
    let modelName = resolveModernModel(provider, model);
    const warnings: string[] = [];

    if (provider === "gemini") {
      const res = await callGeminiAPI(effectiveKey!, modelName, systemPrompt, userPrompt);
      rawOutput = res.text;
      if (res.usedModel !== modelName) {
        warnings.push(`Model '${modelName}' was unavailable; automatically resolved to '${res.usedModel}'.`);
        modelName = res.usedModel;
      }
    } else if (provider === "openai" || provider === "groq") {
      const defaultEndpoint = provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";
      const res = await callOpenAICompatibleAPI(
        effectiveKey!,
        baseUrl || defaultEndpoint,
        modelName,
        systemPrompt,
        userPrompt,
        provider
      );
      rawOutput = res.text;
      if (res.usedModel !== modelName) {
        warnings.push(`Model '${modelName}' was unavailable; automatically resolved to '${res.usedModel}'.`);
        modelName = res.usedModel;
      }
    } else if (provider === "anthropic") {
      const res = await callAnthropicAPI(effectiveKey!, modelName, systemPrompt, userPrompt);
      rawOutput = res.text;
      if (res.usedModel !== modelName) {
        warnings.push(`Model '${modelName}' was unavailable; automatically resolved to '${res.usedModel}'.`);
        modelName = res.usedModel;
      }
    } else if (provider === "ollama") {
      const res = await callOllamaAPI(baseUrl || "http://localhost:11434", modelName, systemPrompt, userPrompt);
      rawOutput = res.text;
      if (res.usedModel !== modelName) {
        warnings.push(`Model '${modelName}' was unavailable; automatically resolved to '${res.usedModel}'.`);
        modelName = res.usedModel;
      }
    }

    let title = parsed.suggestedTitle || "PR: Updates and improvements";
    let markdown = rawOutput.trim();

    const titleMatch = markdown.match(/^TITLE:\s*(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
      markdown = markdown.replace(/^TITLE:\s*.+$/m, "").trim();
    }

    return {
      title,
      markdown,
      providerUsed: provider,
      modelUsed: modelName,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error: unknown) {
    console.error(`[AI_PROVIDER_ERROR_${provider}]`, error);
    const fallback = generateRuleBasedBrief({ parsed, commits, template, tone });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      title: fallback.title,
      markdown: fallback.markdown,
      providerUsed: "Smart Semantic Parser (Fallback)",
      modelUsed: "Local Engine",
      warnings: [`Failed to query ${provider}: ${errorMessage}. Displaying brief generated via smart semantic parser.`],
    };
  }
}

// -------------------------------------------------------------
// Provider Callers with Built-In Automated Model Fallback Chains
// -------------------------------------------------------------

async function callGeminiAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; usedModel: string }> {
  // Active, modern models ordered by suitability and availability
  const candidateModels = [
    model,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-pro",
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

  let lastError: Error | null = null;

  for (const currentModel of candidateModels) {
    const cleanModel = currentModel.replace(/^models\//, "").trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    // For transient errors (503/429), try up to 2 times with a backoff delay
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2500,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return { text, usedModel: cleanModel };
          }
        }

        const errorText = await res.text();

        // Fail fast on auth errors
        if (
          res.status === 400 &&
          (errorText.includes("API_KEY_INVALID") ||
            errorText.includes("API key not valid") ||
            errorText.includes("CREDENTIALS_MISSING"))
        ) {
          throw new Error(`Gemini API error (${res.status}): ${errorText}`);
        }

        // On 503 (high demand) or 429 (rate limit), wait with backoff if we have another attempt
        if (res.status === 503 || res.status === 429) {
          lastError = new Error(`Gemini API error (${res.status}): ${errorText}`);
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue; // Retry this model once after delay
          }
          break; // Move to the next model in candidateModels
        }

        if (res.status === 502 || res.status === 404 || res.status === 400) {
          lastError = new Error(`Gemini API error (${res.status}): ${errorText}`);
          break; // Move to next model in candidateModels
        }

        throw new Error(`Gemini API error (${res.status}): ${errorText}`);
      } catch (e: unknown) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (
          lastError.message.includes("401") ||
          lastError.message.includes("403") ||
          lastError.message.includes("API_KEY_INVALID")
        ) {
          throw lastError; // Auth errors fail fast
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate with Gemini API");
}

async function callOpenAICompatibleAPI(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  provider: "openai" | "groq"
): Promise<{ text: string; usedModel: string }> {
  const defaultFallback = provider === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini";
  const secondaryFallback = provider === "groq" ? "llama-3.1-8b-instant" : "gpt-4o";
  const tertiaryFallback = provider === "groq" ? "gemma2-9b-it" : "gpt-4.1-mini";

  const modelsToTry = [
    model,
    defaultFallback,
    secondaryFallback,
    tertiaryFallback,
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

  let lastError: Error | null = null;
  const cleanBase = baseUrl.replace(/\/$/, "");
  const url = `${cleanBase}/chat/completions`;

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 2500,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) {
            return { text, usedModel: currentModel };
          }
        }

        const errorText = await res.text();
        lastError = new Error(`${provider.toUpperCase()} API error (${res.status}): ${errorText}`);

        // Immediate fail on authentication error
        if (
          res.status === 401 ||
          res.status === 403 ||
          errorText.includes("invalid_api_key") ||
          errorText.includes("AuthenticationError")
        ) {
          throw lastError;
        }

        // On 503, 429, or 502, backoff and retry once
        if (res.status === 503 || res.status === 429 || res.status === 502) {
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
          break; // Move to next fallback model
        }

        // Model error: not found, decommissioned, or invalid model
        const isModelError =
          res.status === 404 ||
          (res.status === 400 &&
            (errorText.includes("model_not_found") ||
              errorText.includes("model_decommissioned") ||
              errorText.includes("does not exist") ||
              errorText.includes("invalid_model") ||
              errorText.includes("rate_limit") ||
              errorText.includes("capacity")));

        if (isModelError) {
          break;
        }

        throw lastError;
      } catch (e: unknown) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (
          lastError.message.includes("401") ||
          lastError.message.includes("403") ||
          lastError.message.includes("invalid_api_key")
        ) {
          throw lastError;
        }
      }
    }
  }

  throw lastError || new Error(`Failed to generate with ${provider} API`);
}

async function callAnthropicAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; usedModel: string }> {
  const modelsToTry = [
    model,
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

  let lastError: Error | null = null;
  const url = "https://api.anthropic.com/v1/messages";

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: currentModel,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
            max_tokens: 2500,
            temperature: 0.2,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.content?.[0]?.text;
          if (text) {
            return { text, usedModel: currentModel };
          }
        }

        const errorText = await res.text();
        lastError = new Error(`Anthropic API error (${res.status}): ${errorText}`);

        if (
          res.status === 401 ||
          res.status === 403 ||
          errorText.includes("authentication_error")
        ) {
          throw lastError;
        }

        // Retry on 529 (overloaded), 503, 429, or 502
        if (res.status === 529 || res.status === 503 || res.status === 429 || res.status === 502) {
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
          break; // Move to next fallback model
        }

        const isModelError =
          res.status === 404 ||
          (res.status === 400 &&
            (errorText.includes("not_found_error") ||
              errorText.includes("model") ||
              errorText.includes("invalid_request_error") ||
              errorText.includes("overloaded_error")));

        if (isModelError) {
          break;
        }

        throw lastError;
      } catch (e: unknown) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (
          lastError.message.includes("401") ||
          lastError.message.includes("403") ||
          lastError.message.includes("authentication_error")
        ) {
          throw lastError;
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate with Anthropic API");
}

async function callOllamaAPI(
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; usedModel: string }> {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const chatUrl = `${cleanBase}/api/chat`;

  // First try the requested model
  try {
    const res = await fetch(chatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.message?.content;
      if (text) {
        return { text, usedModel: model };
      }
    }

    // If model not found, query Ollama's local tags to discover an installed model
    if (res.status === 404) {
      try {
        const tagsRes = await fetch(`${cleanBase}/api/tags`);
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          const availableModels: string[] = tagsData?.models?.map((m: { name?: string }) => m.name) || [];
          for (const localModel of availableModels) {
            if (!localModel || localModel === model) continue;
            const retryRes = await fetch(chatUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: localModel,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                stream: false,
              }),
            });
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              const text = retryData?.message?.content;
              if (text) {
                return { text, usedModel: localModel };
              }
            }
          }
        }
      } catch (discoveryErr) {
        console.warn("Failed to discover local Ollama models:", discoveryErr);
      }
    }

    const errorText = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${errorText}`);
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}
