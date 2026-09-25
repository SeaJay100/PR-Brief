# 📋 PR-Brief

> **Smart, structured Pull Request descriptions and changelogs generated instantly from Git diffs, commit logs, or GitHub links.**

PR-Brief eliminates lazy `"fixes"` or `"updates"` descriptions. It ingests your code changes, automatically categorizes modified files by layer (Frontend, Backend, Database, Config, Tests, Docs), extracts key behavioral modifications, and generates a review-ready PR description or release note.

---

## 🚀 Quick Start

### 1. Start the Server
The application is pre-configured and ready to run:

```bash
# Production server (recommended)
npm run build
npm run start

# Or development server with hot-reload
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 How to Use PR-Brief

### Step 1: Input Your Changes

You have three easy ways to supply code changes:

#### Option A: Quick Test with Sample Presets (No terminal required)
- Click **"Try with Sample Diff"** on the empty state screen, or
- Select from the **"Sample Diffs"** dropdown in the header:
  - 💳 *Full-Stack: Stripe Billing & Subscriptions*
  - 🐛 *Bugfix: WebSocket Memory Leak on Reconnect*
  - 🗄️ *Enterprise DB & Security: RBAC Roles & Audit Logging*

#### Option B: Direct Git Diff (Default)
In your terminal, copy your branch changes:
```bash
# Compare your current branch against main:
git diff main...HEAD

# Or for uncommitted local changes:
git diff
```
1. Paste the diff into the **Direct Git Diff** textarea.
2. *(Optional)* Click **"+ Add commit messages"** and paste your recent commit log:
   ```bash
   git log main..HEAD --oneline
   ```

#### Option C: Fetch from GitHub URL
1. Click the **GitHub PR / URL** tab.
2. Enter any GitHub PR link, shorthand, or comparison:
   - `https://github.com/owner/repo/pull/123`
   - `owner/repo#123`
   - `https://github.com/owner/repo/compare/main...feature-branch`
3. *(Optional)* Add a GitHub Personal Access Token (PAT) if the repository is private.
4. Click **"Fetch GitHub Diff"**.

---

### Step 2: Configure Template & Tone

In the left panel bottom controls:

- **Template**:
  - **Standard**: Executive summary, key changes grouped by scope, categorized impact, and step-by-step test instructions.
  - **Bugfix**: Issue reference, root cause analysis, fix details, and regression verification checklist.
  - **Minimal**: High-signal TL;DR and quick verification checklist.
  - **Release Note**: User-facing changelog, database alterations, breaking changes, and upgrade instructions.
- **Tone**:
  - **Technical**: Deep engineering depth and architectural terms.
  - **Concise**: Terse, high signal-to-noise bullets.
  - **Detailed**: Thorough walkthrough across modified layers.
  - **Stakeholder**: Product-focused impact and business value.

---

### Step 3: Choose Generation Engine (Optional)

Click the **⚙️ Settings** icon in the header:
- **Built-in Smart Semantic Parser (Default)**:
  - 100% offline, local AST & regex pattern analyzer.
  - **Zero setup, zero cost, no API keys needed**.
- **External AI Providers**:
  - Choose **Google Gemini**, **OpenAI (GPT-4o)**, **Anthropic Claude**, **Groq (Llama 3)**, or local **Ollama**.
  - Enter your API key (saved exclusively in your browser's `localStorage`).

---

### Step 4: Generate, Preview & Export

1. Click **"Generate PR Brief"** or press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (<kbd>Cmd</kbd> + <kbd>Enter</kbd>).
2. **Review Stats**: View additions/deletions, categorized chips, and estimated review time in the top metrics bar.
3. **Switch View Modes**:
   - **Preview**: Rendered GitHub-flavored markdown with styled checkboxes, tables, and code snippets.
   - **Raw Markdown**: Editable raw text.
   - **Split**: Side-by-side editing and preview.
4. **Export Actions**:
   - **Copy Markdown**: One-click copy with instant toast confirmation.
   - **Copy Title**: Copy the suggested conventional commit title.
   - **Export as Release Note**: Convert into release changelog format.
   - **Export .md**: Download as a markdown file.

---

## 🧪 Testing & Verification

Run the automated test suite:

```bash
# Run unit & logic verification tests
npm test

# Run ESLint check
npm run lint

# Build production bundle
npm run build
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Markdown**: `react-markdown` + `remark-gfm`
- **Parsing**: Custom multi-layer AST and unified diff parser with automatic lockfile noise suppression
