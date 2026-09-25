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
5. Follow the template specifications precisely.

${templateInstructions}`;

  const userPrompt = `Here is the Git Diff and Commit Logs:

${commits ? `### Commit History:\n${commits}\n\n` : ""}
### Changed Files Overview (${parsed.stats.totalFiles} files, +${parsed.stats.totalAdditions}/-${parsed.stats.totalDeletions} lines):
${parsed.files.map((f) => `- ${f.path} [${f.category}] (${f.status}, +${f.additions}/-${f.deletions})`).join("\n")}

### Cleaned Git Diff:
\`\`\`diff
${parsed.cleanDiff}
\`\`\`
`;

  return { systemPrompt, userPrompt };
}

export async function generateBriefWithProvider(
  options: GenerateAIOptions
): Promise<{ title: string; markdown: string; providerUsed: string; modelUsed: string; warnings?: string[] }> {
  const { provider, apiKey, model, baseUrl, parsed, commits, template, tone } = options;

  if (provider === "smart-parser") {
    const result = generateRuleBasedBrief({ parsed, commits, template, tone });
    return {
      title: result.title,
      markdown: result.markdown,
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
    let modelName = model || "";

    if (provider === "gemini") {
      modelName = model || "gemini-2.5-flash";
      if (modelName === "gemini-2.0-flash" || modelName === "gemini-2.0-flash-lite") {
        modelName = "gemini-2.5-flash";
      }
      rawOutput = await callGeminiAPI(effectiveKey!, modelName, systemPrompt, userPrompt);
    } else if (provider === "openai") {
      modelName = model || "gpt-4o-mini";
      rawOutput = await callOpenAICompatibleAPI(
        effectiveKey!,
        baseUrl || "https://api.openai.com/v1",
        modelName,
        systemPrompt,
        userPrompt
      );
    } else if (provider === "groq") {
      modelName = model || "llama-3.3-70b-versatile";
      rawOutput = await callOpenAICompatibleAPI(
        effectiveKey!,
        "https://api.groq.com/openai/v1",
        modelName,
        systemPrompt,
        userPrompt
      );
    } else if (provider === "anthropic") {
      modelName = model || "claude-3-7-sonnet-20250219";
      rawOutput = await callAnthropicAPI(effectiveKey!, modelName, systemPrompt, userPrompt);
    } else if (provider === "ollama") {
      modelName = model || "llama3";
      rawOutput = await callOllamaAPI(baseUrl || "http://localhost:11434", modelName, systemPrompt, userPrompt);
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

async function callGeminiAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  let cleanModel = model.replace(/^models\//, "").trim();
  if (cleanModel === "gemini-2.0-flash" || cleanModel === "gemini-2.0-flash-lite") {
    cleanModel = "gemini-2.5-flash";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  let res = await fetch(url, {
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

  // If 404 (model deprecated or not found), attempt automatic fallback to gemini-2.5-flash
  if (res.status === 404 && cleanModel !== "gemini-2.5-flash") {
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const fallbackRes = await fetch(fallbackUrl, {
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
    if (fallbackRes.ok) {
      res = fallbackRes;
      cleanModel = "gemini-2.5-flash";
    }
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No text response returned from Gemini API");
  }

  return text;
}

async function callOpenAICompatibleAPI(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2500,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No text response returned from API");
  }

  return text;
}

async function callAnthropicAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = "https://api.anthropic.com/v1/messages";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 2500,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) {
    throw new Error("No text response returned from Anthropic");
  }

  return text;
}

async function callOllamaAPI(
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;

  const res = await fetch(url, {
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

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const text = data?.message?.content;
  if (!text) {
    throw new Error("No text response returned from Ollama");
  }

  return text;
}
