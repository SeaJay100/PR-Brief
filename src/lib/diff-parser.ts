import { DiffFile, DiffFileStatus, DiffStats, FileCategory, ParsedDiff } from "@/types";

const LOCKFILE_NAMES = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "cargo.lock",
  "poetry.lock",
  "composer.lock",
  "gemfile.lock",
  "go.sum",
  "bun.lockb",
  "bun.lock",
];

export function categorizeFilePath(path: string): FileCategory {
  const normalized = path.toLowerCase().replace(/\\/g, "/");

  // Tests
  if (
    normalized.includes(".test.") ||
    normalized.includes(".spec.") ||
    normalized.includes("__tests__/") ||
    normalized.startsWith("tests/") ||
    normalized.startsWith("test/") ||
    normalized.includes("/tests/") ||
    normalized.includes("/test/") ||
    normalized.includes("/e2e/") ||
    normalized.includes("/cypress/")
  ) {
    return "Tests";
  }

  // Database & Migrations
  if (
    normalized.includes("prisma/migrations") ||
    normalized.includes("/migrations/") ||
    normalized.startsWith("migrations/") ||
    normalized.endsWith(".sql") ||
    normalized.includes("schema.prisma") ||
    normalized.includes("/db/") ||
    normalized.startsWith("db/") ||
    normalized.includes("alembic/") ||
    normalized.includes("/drizzle/")
  ) {
    return "Database";
  }

  // Documentation
  if (
    normalized.endsWith(".md") ||
    normalized.endsWith(".mdx") ||
    normalized.includes("/docs/") ||
    normalized.startsWith("docs/") ||
    normalized === "license" ||
    normalized === "changelog.md"
  ) {
    return "Documentation";
  }

  // Config & CI/CD
  if (
    normalized.includes(".github/") ||
    normalized.includes(".gitlab-ci") ||
    normalized.endsWith("docker-compose.yml") ||
    normalized.endsWith("docker-compose.yaml") ||
    normalized.endsWith("dockerfile") ||
    normalized.endsWith("package.json") ||
    LOCKFILE_NAMES.some((lf) => normalized.endsWith(lf)) ||
    normalized.includes(".env") ||
    normalized.endsWith("tsconfig.json") ||
    normalized.includes("tailwind.config.") ||
    normalized.includes("next.config.") ||
    normalized.includes("vite.config.") ||
    normalized.includes("webpack.config.") ||
    normalized.includes("eslint.config.") ||
    normalized.includes(".eslintrc") ||
    normalized.includes(".prettierrc") ||
    normalized.endsWith(".yaml") ||
    normalized.endsWith(".yml")
  ) {
    return "Config";
  }

  // Backend / API
  if (
    normalized.includes("/routes/") ||
    normalized.startsWith("routes/") ||
    normalized.includes("/controllers/") ||
    normalized.startsWith("controllers/") ||
    normalized.includes("/api/") ||
    normalized.startsWith("api/") ||
    normalized.includes("/handlers/") ||
    normalized.includes("/services/") ||
    normalized.includes("/middleware/") ||
    normalized.includes("server.ts") ||
    normalized.includes("server.js") ||
    normalized.endsWith(".py") ||
    normalized.endsWith(".go") ||
    normalized.endsWith(".rs") ||
    normalized.endsWith(".java") ||
    normalized.endsWith(".rb") ||
    normalized.endsWith(".php") ||
    normalized.endsWith(".c") ||
    normalized.endsWith(".cpp")
  ) {
    return "Backend";
  }

  // Frontend / UI
  if (
    normalized.endsWith(".tsx") ||
    normalized.endsWith(".jsx") ||
    normalized.endsWith(".vue") ||
    normalized.endsWith(".svelte") ||
    normalized.endsWith(".css") ||
    normalized.endsWith(".scss") ||
    normalized.endsWith(".sass") ||
    normalized.endsWith(".less") ||
    normalized.endsWith(".html") ||
    normalized.includes("/components/") ||
    normalized.includes("/views/") ||
    normalized.includes("/pages/") ||
    normalized.includes("/styles/") ||
    normalized.includes("/ui/") ||
    normalized.includes("app/")
  ) {
    return "Frontend";
  }

  return "Chore";
}

export function isLockfilePath(path: string): boolean {
  const normalized = path.toLowerCase().replace(/\\/g, "/");
  return LOCKFILE_NAMES.some(
    (name) => normalized.endsWith(name) || normalized.includes(`/${name}`)
  );
}

export function parseGitDiff(rawDiff: string, rawCommits: string = ""): ParsedDiff {
  const initialCategoryCounts: Record<FileCategory, number> = {
    Frontend: 0,
    Backend: 0,
    Database: 0,
    Config: 0,
    Tests: 0,
    Documentation: 0,
    Chore: 0,
  };

  if (!rawDiff || !rawDiff.trim()) {
    return {
      files: [],
      stats: {
        totalFiles: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        categoryCounts: initialCategoryCounts,
        estimatedReviewMinutes: 0,
        omittedLockfilesCount: 0,
      },
      cleanDiff: "",
      truncated: false,
      originalLength: 0,
      suggestedTitle: "",
    };
  }

  const originalLength = rawDiff.length;
  const files: DiffFile[] = [];
  const cleanChunks: string[] = [];
  let omittedLockfilesCount = 0;

  // Split into files by "diff --git"
  const fileRegex = /^diff --git a\/(.+?) b\/(.+?)$/gm;
  const sections: { raw: string; pathA: string; pathB: string }[] = [];

  let match: RegExpExecArray | null;
  const matches: { index: number; pathA: string; pathB: string }[] = [];

  while ((match = fileRegex.exec(rawDiff)) !== null) {
    matches.push({
      index: match.index,
      pathA: match[1],
      pathB: match[2],
    });
  }

  if (matches.length === 0) {
    // Fallback: If not standard "diff --git", check for unified diff or simpler diff headers
    const lines = rawDiff.split("\n");
    let currentPath = "unnamed.diff";
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith("+++ b/")) {
        currentPath = line.substring(6).trim();
      } else if (line.startsWith("+++ ")) {
        currentPath = line.substring(4).trim();
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
      }
    }

    const category = categorizeFilePath(currentPath);
    const lockfile = isLockfilePath(currentPath);
    const fallbackFile: DiffFile = {
      path: currentPath,
      status: "modified",
      category,
      additions,
      deletions,
      isBinary: false,
      isLockfile: lockfile,
    };
    files.push(fallbackFile);
    initialCategoryCounts[category] = 1;

    return {
      files,
      stats: {
        totalFiles: 1,
        totalAdditions: additions,
        totalDeletions: deletions,
        categoryCounts: initialCategoryCounts,
        estimatedReviewMinutes: Math.max(1, Math.round((additions + deletions) / 40) + 1),
        omittedLockfilesCount: 0,
      },
      cleanDiff: rawDiff.length > 80000 ? rawDiff.slice(0, 80000) + "\n\n[Diff truncated for context limits]" : rawDiff,
      truncated: rawDiff.length > 80000,
      originalLength,
      suggestedTitle: generateSuggestedTitle(files, rawCommits),
    };
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : rawDiff.length;
    const chunk = rawDiff.substring(start, end);
    sections.push({
      raw: chunk,
      pathA: matches[i].pathA,
      pathB: matches[i].pathB,
    });
  }

  let totalAdditions = 0;
  let totalDeletions = 0;
  const categoryCounts = { ...initialCategoryCounts };

  // MAX characters for clean diff to prevent hitting provider token limits
  const MAX_DIFF_LENGTH = 75000;
  let accumulatedCleanLength = 0;
  let isTruncated = false;

  for (const sec of sections) {
    const path = sec.pathB || sec.pathA;
    const category = categorizeFilePath(path);
    const isLockfile = isLockfilePath(path);

    let additions = 0;
    let deletions = 0;
    let status: DiffFileStatus = "modified";
    const isBinary = sec.raw.includes("Binary files") || sec.raw.includes("GIT binary patch");

    if (sec.raw.includes("new file mode")) {
      status = "added";
    } else if (sec.raw.includes("deleted file mode")) {
      status = "deleted";
    } else if (sec.raw.includes("similarity index") && sec.raw.includes("rename to")) {
      status = "renamed";
    }

    const lines = sec.raw.split("\n");
    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
      }
    }

    totalAdditions += additions;
    totalDeletions += deletions;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    files.push({
      path,
      oldPath: sec.pathA !== sec.pathB ? sec.pathA : undefined,
      status,
      category,
      additions,
      deletions,
      isBinary,
      isLockfile,
    });

    if (isLockfile) {
      omittedLockfilesCount++;
      const lockfileSummary = `diff --git a/${path} b/${path}\n[Lockfile changes omitted for LLM token optimization: +${additions}, -${deletions} lines]`;
      cleanChunks.push(lockfileSummary);
      accumulatedCleanLength += lockfileSummary.length;
    } else if (isBinary) {
      const binarySummary = `diff --git a/${path} b/${path}\n[Binary file modified: ${path}]`;
      cleanChunks.push(binarySummary);
      accumulatedCleanLength += binarySummary.length;
    } else {
      // If we are about to exceed the limit, selectively include headers and partial chunk
      if (accumulatedCleanLength + sec.raw.length > MAX_DIFF_LENGTH) {
        const remainingSpace = Math.max(0, MAX_DIFF_LENGTH - accumulatedCleanLength);
        if (remainingSpace > 500) {
          cleanChunks.push(sec.raw.slice(0, remainingSpace) + `\n... [File ${path} truncated for context limits]`);
        } else {
          cleanChunks.push(`diff --git a/${path} b/${path}\n[Diff omitted due to context length limits: +${additions}, -${deletions} lines in ${path}]`);
        }
        isTruncated = true;
        accumulatedCleanLength = MAX_DIFF_LENGTH;
      } else {
        cleanChunks.push(sec.raw);
        accumulatedCleanLength += sec.raw.length;
      }
    }
  }

  const cleanDiff = cleanChunks.join("\n") + (isTruncated ? "\n\n> **Note**: Some diff content was truncated to fit within LLM context limits." : "");

  const totalLines = totalAdditions + totalDeletions;
  const estimatedReviewMinutes = Math.max(1, Math.round(totalLines / 45 + files.length * 0.5));

  const stats: DiffStats = {
    totalFiles: files.length,
    totalAdditions,
    totalDeletions,
    categoryCounts,
    estimatedReviewMinutes,
    omittedLockfilesCount,
  };

  const suggestedTitle = generateSuggestedTitle(files, rawCommits);

  return {
    files,
    stats,
    cleanDiff,
    truncated: isTruncated,
    originalLength,
    suggestedTitle,
  };
}

export function generateSuggestedTitle(files: DiffFile[], commitsRaw: string = ""): string {
  if (commitsRaw && commitsRaw.trim()) {
    const commitLines = commitsRaw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (const line of commitLines) {
      const cleanLine = line.replace(/^[0-9a-f]{6,40}\s+/i, "").trim();
      if (cleanLine.length > 5) {
        return cleanLine;
      }
    }
  }

  if (files.length === 0) {
    return "PR: updates and improvements";
  }

  const categories = files.map((f) => f.category);
  const isBugfix = files.some((f) => f.path.toLowerCase().includes("fix") || f.path.toLowerCase().includes("bug"));
  const hasDb = categories.includes("Database");
  const hasBackend = categories.includes("Backend");
  const hasFrontend = categories.includes("Frontend");

  const mainFile = files[0].path.split("/").pop()?.replace(/\.[^/.]+$/, "") || "core";

  if (isBugfix) {
    return `fix(${mainFile}): resolve unexpected behavior and update tests`;
  }

  if (hasDb && (hasBackend || hasFrontend)) {
    return `feat(data): implement schema migrations and service updates for ${mainFile}`;
  }

  if (hasBackend && !hasFrontend) {
    return `feat(api): add endpoint handlers and service logic for ${mainFile}`;
  }

  if (hasFrontend && !hasBackend) {
    return `feat(ui): update ${mainFile} components and styles`;
  }

  return `feat(${mainFile}): implement updates across ${files.length} files`;
}
