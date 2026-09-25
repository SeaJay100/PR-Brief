import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url, token } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid GitHub Pull Request or Comparison URL is required." },
        { status: 400 }
      );
    }

    const cleanInput = url.trim();

    const prRegex = /(?:github\.com\/|^)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/(?:pull|pulls)\/(\d+)/i;
    const shorthandRegex = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)#(\d+)$/i;
    const compareRegex = /(?:github\.com\/|^)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/compare\/(.+)$/i;

    const prMatch = cleanInput.match(prRegex) || cleanInput.match(shorthandRegex);
    const compareMatch = !prMatch ? cleanInput.match(compareRegex) : null;

    const headers: Record<string, string> = {
      "User-Agent": "PR-Brief-App",
    };

    const rawToken = (typeof token === "string" ? token : process.env.GITHUB_TOKEN || "").trim();
    if (rawToken) {
      const cleanToken = rawToken.replace(/^(Bearer|token)\s+/i, "").trim();
      headers["Authorization"] = `Bearer ${cleanToken}`;
    }

    if (prMatch) {
      const [, owner, repo, pullNumber] = prMatch;

      const diffRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
        {
          headers: {
            ...headers,
            Accept: "application/vnd.github.v3.diff",
          },
        }
      );

      if (!diffRes.ok) {
        const errorText = await diffRes.text();
        return NextResponse.json(
          {
            error: `GitHub API error (${diffRes.status}): ${
              diffRes.status === 404
                ? "Pull request not found or repository is private. Provide a GitHub Personal Access Token if it is private."
                : errorText
            }`,
          },
          { status: diffRes.status }
        );
      }

      const diff = await diffRes.text();

      let title = "";
      let commitsText = "";

      try {
        const metaRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
          {
            headers: {
              ...headers,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          title = metaData.title || "";
        }

        const commitsRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/commits?per_page=50`,
          {
            headers: {
              ...headers,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        if (commitsRes.ok) {
          const commitsData = await commitsRes.json();
          if (Array.isArray(commitsData)) {
            commitsText = commitsData
              .map((c) => {
                const sha = (c.sha || "").slice(0, 7);
                const msg = (c.commit?.message || "").split("\n")[0];
                return `${sha} ${msg}`;
              })
              .join("\n");
          }
        }
      } catch (e) {
        console.warn("Failed to fetch commit metadata:", e);
      }

      return NextResponse.json({
        success: true,
        owner,
        repo,
        pullNumber,
        title,
        diff,
        commits: commitsText,
      });
    }

    if (compareMatch) {
      const [, owner, repo, rawRange] = compareMatch;
      const range = rawRange.split("?")[0].split("#")[0].trim();

      const diffRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/compare/${range}`,
        {
          headers: {
            ...headers,
            Accept: "application/vnd.github.v3.diff",
          },
        }
      );

      if (!diffRes.ok) {
        return NextResponse.json(
          {
            error: `GitHub API error (${diffRes.status}): Comparison '${range}' not found or repository is private. Ensure the branches exist on '${owner}/${repo}', and provide a GitHub Personal Access Token if the repo is private.`,
          },
          { status: diffRes.status }
        );
      }

      const diff = await diffRes.text();
      let commitsText = "";

      try {
        const metaRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/compare/${range}`,
          {
            headers: {
              ...headers,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          if (Array.isArray(metaData.commits)) {
            commitsText = metaData.commits
              .map((c: { sha?: string; commit?: { message?: string } }) => {
                const sha = (c.sha || "").slice(0, 7);
                const msg = (c.commit?.message || "").split("\n")[0];
                return `${sha} ${msg}`;
              })
              .join("\n");
          }
        }
      } catch (e) {
        console.warn("Failed to fetch compare metadata:", e);
      }

      return NextResponse.json({
        success: true,
        owner,
        repo,
        diff,
        commits: commitsText,
      });
    }

    return NextResponse.json(
      {
        error:
          "Unrecognized GitHub format. Example supported formats:\n- https://github.com/owner/repo/pull/123\n- owner/repo#123\n- https://github.com/owner/repo/compare/main...branch",
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[GITHUB_FETCH_ERROR]", err);
    const message = err instanceof Error ? err.message : "Failed to fetch from GitHub.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
