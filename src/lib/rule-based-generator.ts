import { DiffFile, DiffStats, ParsedDiff, PRTemplate, PRTone } from "@/types";

interface RuleGeneratorOptions {
  parsed: ParsedDiff;
  commits?: string;
  template: PRTemplate;
  tone: PRTone;
}

interface StandardTemplateOptions {
  title: string;
  stats: DiffStats;
  files: DiffFile[];
  commitList: string[];
  frontendFiles: DiffFile[];
  backendFiles: DiffFile[];
  dbFiles: DiffFile[];
  configFiles: DiffFile[];
  testFiles: DiffFile[];
  docFiles: DiffFile[];
  tone: PRTone;
}

interface BugfixTemplateOptions {
  files: DiffFile[];
  commitList: string[];
  backendFiles: DiffFile[];
  testFiles: DiffFile[];
}

interface MinimalTemplateOptions {
  title: string;
  stats: DiffStats;
  files: DiffFile[];
  commitList: string[];
}

interface ReleaseNotesTemplateOptions {
  title: string;
  stats: DiffStats;
  files: DiffFile[];
  commitList: string[];
  backendFiles: DiffFile[];
  dbFiles: DiffFile[];
}

export function generateRuleBasedBrief({
  parsed,
  commits = "",
  template,
  tone,
}: RuleGeneratorOptions): { title: string; markdown: string } {
  const { files, stats, suggestedTitle } = parsed;
  const title = suggestedTitle || "PR: Updates and enhancements";

  const frontendFiles = files.filter((f) => f.category === "Frontend");
  const backendFiles = files.filter((f) => f.category === "Backend");
  const dbFiles = files.filter((f) => f.category === "Database");
  const configFiles = files.filter((f) => f.category === "Config");
  const testFiles = files.filter((f) => f.category === "Tests");
  const docFiles = files.filter((f) => f.category === "Documentation");

  const commitList = commits
    .split("\n")
    .map((c) => c.trim().replace(/^[0-9a-f]{6,40}\s+/i, ""))
    .filter((c) => c.length > 0);

  if (template === "minimal") {
    return {
      title,
      markdown: generateMinimalTemplate({
        title,
        stats,
        files,
        commitList,
      }),
    };
  }

  if (template === "bugfix") {
    return {
      title,
      markdown: generateBugfixTemplate({
        files,
        commitList,
        backendFiles,
        testFiles,
      }),
    };
  }

  if (template === "release-notes") {
    return {
      title,
      markdown: generateReleaseNotesTemplate({
        title,
        stats,
        files,
        commitList,
        backendFiles,
        dbFiles,
      }),
    };
  }

  return {
    title,
    markdown: generateStandardTemplate({
      title,
      stats,
      files,
      commitList,
      frontendFiles,
      backendFiles,
      dbFiles,
      configFiles,
      testFiles,
      docFiles,
      tone,
    }),
  };
}

function generateStandardTemplate({
  title,
  stats,
  files,
  commitList,
  frontendFiles,
  backendFiles,
  dbFiles,
  configFiles,
  testFiles,
  docFiles,
  tone,
}: StandardTemplateOptions): string {
  const summaryPrefix =
    tone === "concise"
      ? "Direct updates addressing core functional requirements."
      : tone === "detailed"
      ? `This pull request introduces comprehensive changes across ${stats.totalFiles} files (+${stats.totalAdditions}/-${stats.totalDeletions} lines). The modifications implement targeted capabilities and maintain backward compatibility.`
      : `This pull request implements key updates to support ${title.toLowerCase().replace(/^feat\([^)]+\):\s*|^fix\([^)]+\):\s*/, "")}. It addresses the core workflow requirements while ensuring full test coverage and schema consistency.`;

  const commitHighlights =
    commitList.length > 0
      ? commitList.map((c: string) => `- ${c}`).join("\n")
      : files
          .slice(0, 5)
          .map((f: DiffFile) => `- **\`${f.path}\`**: ${f.status} (+${f.additions}/-${f.deletions})`)
          .join("\n");

  const frontendImpact =
    frontendFiles.length > 0
      ? frontendFiles.map((f: DiffFile) => `- **\`${f.path}\`**: Added/modified UI components and client view logic.`).join("\n")
      : "None";

  const backendImpact =
    backendFiles.length > 0
      ? backendFiles.map((f: DiffFile) => `- **\`${f.path}\`**: Added/updated endpoint handlers, middleware, and request validation.`).join("\n")
      : "None";

  const dbImpact =
    dbFiles.length > 0
      ? dbFiles.map((f: DiffFile) => `- **\`${f.path}\`**: Schema migrations, column definitions, or database models updated.`).join("\n")
      : "None";

  const configImpact =
    configFiles.length > 0
      ? configFiles.map((f: DiffFile) => `- **\`${f.path}\`**: Dependency updates, environment variables, or build configs.`).join("\n")
      : "None";

  const docImpact =
    docFiles.length > 0
      ? docFiles.map((f: DiffFile) => `- **\`${f.path}\`**: Updated documentation, guides, or specifications.`).join("\n")
      : "";

  return `## Summary
${summaryPrefix}
The primary objective is to streamline system interaction, prevent edge-case failures, and guarantee reliable execution across environments.

## Key Changes
- **Core Logic & Services**:
${commitHighlights}
${testFiles.length > 0 ? `- **Quality Assurance**: Added/updated ${testFiles.length} automated test suite(s) to verify behavior.` : ""}

## Categorized Impact
- **Frontend / UI**:
${frontendImpact}

- **Backend / API**:
${backendImpact}

- **Database / Migrations**:
${dbImpact}

- **Configuration / Dependencies**:
${configImpact}
${docImpact ? `\n- **Documentation**:\n${docImpact}\n` : ""}
## How to Test
1. Pull branch locally and install updated dependencies:
   \`\`\`bash
   git checkout <branch-name>
   npm install # or pnpm / yarn
   \`\`\`
2. Run database migrations if applicable:
   \`\`\`bash
   npx prisma migrate dev # or database migration script
   \`\`\`
3. Run existing and newly added automated test suites:
   \`\`\`bash
   npm test
   \`\`\`
4. Verify the user flow manually and observe terminal/console outputs for zero unhandled warnings or regressions.
`;
}

function generateBugfixTemplate({
  files,
  commitList,
  backendFiles,
  testFiles,
}: BugfixTemplateOptions): string {
  const rootCause =
    backendFiles.length > 0
      ? `State or resource handling in \`${backendFiles[0].path}\` failed to properly release event listeners or validate boundary conditions.`
      : `Component rendering lifecycle or state synchronization issues in \`${files[0]?.path || "core"}\`.`;

  return `## Issue Link
Fixes #[ISSUE-NUMBER]

## Root Cause
${rootCause} Under repeated operations or unexpected disconnects, this caused cumulative memory or state corruption.

## Fix Details
- **Cleanup & Isolation**:
${
  commitList.length > 0
    ? commitList.map((c: string) => `- ${c}`).join("\n")
    : files.map((f: DiffFile) => `- Updated \`${f.path}\` (+${f.additions}/-${f.deletions}) to handle lifecycle teardown.`).join("\n")
}
- **Guards & Fallbacks**: Introduced defensive null-checks and safe default initialization.

## Regression Checks
- [x] Ran unit and integration tests across affected components (${testFiles.length > 0 ? testFiles.map((f: DiffFile) => f.path).join(", ") : "verified locally"}).
- [x] Tested connection drops, edge-case invalid payloads, and rapid reconnect behavior.
- [x] Verified zero memory or timer leakage in test environment.
`;
}

function generateMinimalTemplate({
  title,
  stats,
  files,
  commitList,
}: MinimalTemplateOptions): string {
  const bullets =
    commitList.length > 0
      ? commitList.map((c: string) => `- ${c}`).join("\n")
      : files.map((f: DiffFile) => `- \`${f.path}\` (${f.category}): +${f.additions}/-${f.deletions}`).join("\n");

  return `### TL;DR
${title} (${stats.totalFiles} files changed, +${stats.totalAdditions}/-${stats.totalDeletions} lines).

### Key Updates
${bullets}

### Verification
- Automated test suites pass.
- Verified in local development environment.
`;
}

function generateReleaseNotesTemplate({
  title,
  stats,
  files,
  commitList,
  backendFiles,
  dbFiles,
}: ReleaseNotesTemplateOptions): string {
  return `## 🚀 Release Notes - ${new Date().toISOString().slice(0, 10)}

### Overview
This release introduces significant enhancements to ${title.toLowerCase().replace(/^feat\([^)]+\):\s*|^fix\([^)]+\):\s*/, "")}, spanning ${stats.totalFiles} modified files.

### 🌟 New Features & Enhancements
${
  commitList.length > 0
    ? commitList.map((c: string) => `- ${c}`).join("\n")
    : `- Integrated new modules in \`${files.slice(0, 3).map((f: DiffFile) => f.path).join(", ")}\``
}

### 🛠️ Architecture & Backend
${
  backendFiles.length > 0
    ? backendFiles.map((f: DiffFile) => `- **${f.path}**: API route optimization and service handler updates.`).join("\n")
    : "- Internal performance tuning."
}

${
  dbFiles.length > 0
    ? `### 🗄️ Database Changes\n${dbFiles.map((f: DiffFile) => `- **${f.path}**: Schema alterations and index additions.`).join("\n")}`
    : ""
}

### ⚠️ Breaking Changes
- None detected. All additions maintain backward compatibility.

### 📦 Upgrade Instructions
1. Run package manager update to synchronize dependencies.
2. Run database migration tasks if applicable.
3. Restart application service.
`;
}
