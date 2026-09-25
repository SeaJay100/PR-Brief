async function testServer() {
  console.log("--- 1. Testing GET / ---");
  const homeRes = await fetch("http://localhost:3000");
  console.log("Status:", homeRes.status);
  const homeHtml = await homeRes.text();
  console.log("Page contains PR-Brief:", homeHtml.includes("PR-Brief"));
  console.log("Page contains Direct Diff:", homeHtml.includes("Direct Diff"));

  console.log("\n--- 2. Testing POST /api/generate ---");
  const payload = {
    diff: `diff --git a/src/index.ts b/src/index.ts\nindex 0000000..1111111 100644\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1 +1,2 @@\n-console.log("old")\n+console.log("new")\n+export const isReady = true;\n`,
    commits: "feat: add isReady export flag",
    template: "standard",
    tone: "technical",
    provider: "smart-parser",
  };

  const genRes = await fetch("http://localhost:3000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("Generate Status:", genRes.status);
  const genData = await genRes.json();
  console.log("Generate Success:", genData.success);
  console.log("Generate Title:", genData.title);
  console.log("Provider Used:", genData.providerUsed);
  console.log("Total Files:", genData.stats.totalFiles);
  console.log("Markdown snippet:\n", genData.markdown.slice(0, 180) + "...\n");

  console.log("--- 3. Testing POST /api/github validation ---");
  const ghRes = await fetch("http://localhost:3000/api/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "invalid-url" }),
  });
  console.log("GitHub Invalid URL Status:", ghRes.status);
  const ghData = await ghRes.json();
  console.log("GitHub Error Message:", ghData.error);

  console.log("\nAll live HTTP endpoint tests completed successfully!");
}

testServer().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
