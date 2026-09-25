import { NextRequest, NextResponse } from "next/server";
import { parseGitDiff } from "@/lib/diff-parser";
import { generateBriefWithProvider } from "@/lib/ai-service";
import { GenerateRequest, GenerateResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const {
      diff,
      commits = "",
      template = "standard",
      tone = "technical",
      provider = "smart-parser",
      apiKey,
      model,
      baseUrl,
    } = body;

    if (!diff || !diff.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Git diff is empty. Please paste a diff or select a sample preset.",
        },
        { status: 400 }
      );
    }

    const parsed = parseGitDiff(diff, commits);

    if (parsed.files.length === 0 && !diff.includes("+") && !diff.includes("-")) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid diff chunks detected. Please paste output from `git diff main...HEAD`.",
        },
        { status: 400 }
      );
    }

    const result = await generateBriefWithProvider({
      parsed,
      commits,
      template,
      tone,
      provider,
      apiKey,
      model,
      baseUrl,
    });

    const response: GenerateResponse = {
      success: true,
      title: result.title,
      markdown: result.markdown,
      stats: parsed.stats,
      providerUsed: result.providerUsed,
      modelUsed: result.modelUsed,
      warnings: result.warnings,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("[GENERATE_API_ERROR]", err);
    const message = err instanceof Error ? err.message : "Failed to generate PR brief. Please try again.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
