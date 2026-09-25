import { categorizeFilePath, isLockfilePath, parseGitDiff } from "../src/lib/diff-parser";
import { generateRuleBasedBrief } from "../src/lib/rule-based-generator";
import { constructPrompt, resolveModernModel } from "../src/lib/ai-service";
import { SAMPLE_PRESETS } from "../src/lib/sample-diffs";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

console.log("=== 1. Testing File Categorization ===");
assert(categorizeFilePath("src/components/Button.tsx") === "Frontend", "Button.tsx is Frontend");
assert(categorizeFilePath("src/app/page.tsx") === "Frontend", "page.tsx is Frontend");
assert(categorizeFilePath("src/app/api/generate/route.ts") === "Backend", "route.ts is Backend");
assert(categorizeFilePath("server.ts") === "Backend", "server.ts is Backend");
assert(categorizeFilePath("prisma/schema.prisma") === "Database", "schema.prisma is Database");
assert(categorizeFilePath("migrations/001_init.sql") === "Database", "001_init.sql is Database");
assert(categorizeFilePath("package.json") === "Config", "package.json is Config");
assert(categorizeFilePath("package-lock.json") === "Config", "package-lock.json is Config");
assert(categorizeFilePath(".github/workflows/ci.yml") === "Config", "ci.yml is Config");
assert(categorizeFilePath("tests/diff-parser.test.ts") === "Tests", "diff-parser.test.ts is Tests");
assert(categorizeFilePath("src/lib/auth.spec.ts") === "Tests", "auth.spec.ts is Tests");
assert(categorizeFilePath("README.md") === "Documentation", "README.md is Documentation");
assert(categorizeFilePath("docs/architecture.md") === "Documentation", "architecture.md is Documentation");

console.log("\n=== 2. Testing Lockfile Detection ===");
assert(isLockfilePath("package-lock.json"), "package-lock.json is lockfile");
assert(isLockfilePath("yarn.lock"), "yarn.lock is lockfile");
assert(isLockfilePath("pnpm-lock.yaml"), "pnpm-lock.yaml is lockfile");
assert(!isLockfilePath("package.json"), "package.json is not lockfile");
assert(!isLockfilePath("src/types/index.ts"), "index.ts is not lockfile");

console.log("\n=== 3. Testing Sample Presets Parsing ===");
assert(SAMPLE_PRESETS.length >= 3, "At least 3 sample presets provided");

for (const preset of SAMPLE_PRESETS) {
  console.log(`Testing preset: ${preset.name} (${preset.id})`);
  const parsed = parseGitDiff(preset.diff, preset.commits);
  assert(parsed.files.length > 0, `${preset.id} has parsed files`);
  assert(parsed.stats.totalFiles > 0, `${preset.id} stats totalFiles > 0`);
  assert(parsed.stats.totalAdditions > 0 || parsed.stats.totalDeletions > 0, `${preset.id} has additions or deletions`);

  // Test rule based brief generation for each preset
  const brief = generateRuleBasedBrief({
    parsed,
    commits: preset.commits,
    template: preset.template,
    tone: preset.tone,
  });

  assert(brief.title.length > 0, `${preset.id} generated title is not empty`);
  assert(brief.markdown.length > 50, `${preset.id} generated markdown has sufficient content`);

  // Test prompt construction for AI service
  const prompt = constructPrompt(parsed, preset.commits, preset.template, preset.tone);
  assert(prompt.systemPrompt.includes("Pull Request"), `${preset.id} system prompt contains PR review context`);
  assert(prompt.userPrompt.length > 0, `${preset.id} user prompt contains diff info`);
}

console.log("\n=== 4. Testing Edge Cases in Diff Parsing ===");
const emptyParsed = parseGitDiff("");
assert(emptyParsed.files.length === 0, "Empty diff yields 0 files");
assert(emptyParsed.stats.totalFiles === 0, "Empty diff yields 0 totalFiles");

const singleLineDiff = `--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-old\n+new`;
const singleParsed = parseGitDiff(singleLineDiff);
assert(singleParsed.files.length === 1, "Fallback parser handles unified diff");
assert(singleParsed.stats.totalAdditions === 1, "Single line additions count 1");
assert(singleParsed.stats.totalDeletions === 1, "Single line deletions count 1");

console.log("\n=== 5. Testing Multi-Provider Model Fallbacks & Remappings ===");
assert(resolveModernModel("gemini") === "gemini-2.5-flash", "Gemini default is gemini-2.5-flash");
assert(resolveModernModel("gemini", "gemini-1.5-flash") === "gemini-2.5-flash", "Remaps legacy gemini-1.5-flash to gemini-2.5-flash");
assert(resolveModernModel("gemini", "gemini-1.5-flash-8b") === "gemini-2.5-flash-lite", "Remaps legacy gemini-1.5-flash-8b to gemini-2.5-flash-lite");
assert(resolveModernModel("gemini", "gemini-1.5-pro") === "gemini-2.5-pro", "Remaps legacy gemini-1.5-pro to gemini-2.5-pro");
assert(resolveModernModel("gemini", "gemini-2.0-flash") === "gemini-3.8-flash", "Remaps sunset gemini-2.0-flash to gemini-3.8-flash");
assert(resolveModernModel("gemini", "gemini-2.0-flash-lite") === "gemini-2.5-flash-lite", "Remaps sunset gemini-2.0-flash-lite to gemini-2.5-flash-lite");
assert(resolveModernModel("gemini", "gemini-3.8-flash") === "gemini-3.8-flash", "Preserves active gemini-3.8-flash");
assert(resolveModernModel("gemini", "gemini-3.5-flash") === "gemini-3.5-flash", "Preserves active gemini-3.5-flash");
assert(resolveModernModel("gemini", "gemini-2.5-flash-lite") === "gemini-2.5-flash-lite", "Preserves active gemini-2.5-flash-lite");
assert(resolveModernModel("openai") === "gpt-4o-mini", "OpenAI default is gpt-4o-mini");
assert(resolveModernModel("openai", "gpt-3.5-turbo") === "gpt-4o-mini", "Remaps deprecated gpt-3.5-turbo");
assert(resolveModernModel("groq") === "llama-3.3-70b-versatile", "Groq default is llama-3.3-70b-versatile");
assert(resolveModernModel("anthropic") === "claude-3-7-sonnet-20250219", "Anthropic default is claude-3-7-sonnet");

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n");
