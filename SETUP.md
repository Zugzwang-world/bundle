# Setup — from an empty folder to a live domain

macOS. Assumes nothing is installed or configured; every step verifies before it proceeds.
Roughly 20 minutes, most of it waiting on `npm install`.

Set these two once, at the top of your terminal session. Everything below reuses them.

```bash
export GH_USER="your-github-username"      # ← your account or org
export REPO="bundle"                        # ← repo name; suggestion: bundle, or bundle-zw-fs-001
export ROOT="$HOME/projects/$REPO"          # ← where the folder lives locally
```

---

## 0 · Recon — what's already on the machine

Paste this whole block. It changes nothing; it only reports.

```bash
{
  printf "\n%-24s %s\n" "CHECK" "RESULT"
  printf "%s\n" "--------------------------------------------------------"
  row () { printf "%-24s %s\n" "$1" "$2"; }

  row "macOS"        "$(sw_vers -productVersion 2>/dev/null || echo '??')"
  row "arch"         "$(uname -m)"
  row "shell"        "$SHELL"
  command -v brew    >/dev/null && row "homebrew"  "$(brew --version | head -1)"        || row "homebrew"  "— (optional)"
  command -v node    >/dev/null && row "node"      "$(node -v)"                          || row "node"      "MISSING"
  command -v npm     >/dev/null && row "npm"       "$(npm -v)"                           || row "npm"       "MISSING"
  command -v git     >/dev/null && row "git"       "$(git --version | awk '{print $3}')" || row "git"       "MISSING"
  row "git user.name"  "$(git config --global user.name  || echo 'NOT SET')"
  row "git user.email" "$(git config --global user.email || echo 'NOT SET')"
  command -v gh      >/dev/null && row "gh"        "$(gh --version | head -1 | awk '{print $3}')" || row "gh" "MISSING"
  gh auth status >/dev/null 2>&1 && row "gh auth"  "logged in" || row "gh auth" "NOT LOGGED IN"
  command -v claude  >/dev/null && row "claude"    "$(claude --version 2>/dev/null)"     || row "claude"    "MISSING"
  printf "\n"
}
```

**What each result needs to be, and the fix if it isn't:**

| Check | Needs | Fix |
|---|---|---|
| macOS | 13.0 or later | Required by Claude Code |
| node | **v22 or later** — Vite 8 and the Claude Code npm package both want it | `brew install node`, or nvm: `nvm install 22 && nvm use 22` |
| git | any recent version | `xcode-select --install` (ships with Command Line Tools) |
| git user.name / user.email | both set | `git config --global user.name "Your Name"` · `git config --global user.email "you@example.com"` |
| gh | any recent version | `brew install gh` |
| gh auth | logged in | `gh auth login` → GitHub.com → HTTPS → authenticate in browser |
| claude | prints a version | `curl -fsSL https://claude.ai/install.sh \| bash` (native installer, recommended) or `brew install --cask claude-code` |

Two notes on Claude Code, from the current docs:

- The **native installer auto-updates**; the Homebrew cask does not (you'd run `brew upgrade claude-code`).
- It requires a **Pro, Max, Team, Enterprise, or Console** account — the free Claude.ai plan doesn't include it.

Then confirm the install is healthy:

```bash
claude doctor    # read-only diagnostic: install type, auth state, settings validation
```

---

## 1 · Create the folder and unpack the project

```bash
mkdir -p "$ROOT" && cd "$ROOT"
unzip ~/Downloads/bundle-site.zip -d /tmp/bundle-unpack
mv /tmp/bundle-unpack/bundle-site/* /tmp/bundle-unpack/bundle-site/.[!.]* . 2>/dev/null
rm -rf /tmp/bundle-unpack
ls -a
```

You should see: `src/ public/ scripts/ .claude/ index.html package.json vite.config.js CLAUDE.md README.md SETUP.md .gitignore`

Sanity-check that the specification actually made it in — the site links to it from three places:

```bash
ls -l public/Bundle_ZW-FS-001_v1_0.pdf   # ~431 KB
md5 public/Bundle_ZW-FS-001_v1_0.pdf     # 1593298f912b330d5bcee37e72a55c2d
```

If that checksum matches, the PDF is byte-identical to the one the site was built against.

---

## 2 · Prove it runs before you commit anything

```bash
npm install
npm test          # reducer vs. the spec: journeys J-1…J-7, acceptance criteria
npm run smoke     # server-renders both routes, asserts key content
npm run build     # production build → dist/
```

All three must pass. Then look at it:

```bash
npm run dev       # → http://localhost:5173
```

Check both routes by hand: `/` should scroll through the argument with the hero animation gathering nine chats into one bundle; `/prototype` should let you flip **Bundle chats** and watch the rows fly into sections. Walk J-1 through J-7 using the checklist in the right-hand rail — if all seven tick, the behaviour is intact.

`Ctrl-C` to stop.

---

## 3 · Git and GitHub

```bash
cd "$ROOT"
git init -b main
git add -A
git status --short | head -20        # confirm node_modules/ and dist/ are NOT listed
git commit -m "Bundle — explainer site and operable prototype (ZW-FS-001 v1.0)"
```

Create the remote and push in one step. Drop `--public` for a private repo:

```bash
gh repo create "$GH_USER/$REPO" --public --source=. --remote=origin --push \
  --description "Bundle — an independent feature proposal for Claude, with an operable prototype. ZW-FS-001."
gh repo view --web
```

If `gh repo create` reports the name is taken, pick another `REPO` value and rerun.

---

## 4 · Claude Code

```bash
cd "$ROOT"
claude
```

On first run it opens a browser to authenticate. After that:

- **Don't run `/init`.** It generates a `CLAUDE.md` by inspection — this repo already has a handwritten one that maps the specification to the code, lists the strings that must stay verbatim, and records the ambiguities already resolved. `/init` would overwrite that with something worse.
- Permissions are pre-set in `.claude/settings.json`, committed with the repo: the verify loop (`npm test`, `npm run smoke`, `npm run build`) and read-only git run without prompting; commit, push, and `gh` ask first; `.env` reads and `rm -rf` are denied outright. Adjust interactively with `/permissions`.

A good first session, to confirm it has the context and not just the files:

```
Read CLAUDE.md and public/Bundle_ZW-FS-001_v1_0.pdf, then tell me which of the
four invariants is most at risk from the way selectIndex is currently written.
```

If the answer references INV-1 and the `listChats` derivation, it has genuinely read both. Then work normally — for example:

```
The bundle sections on the sidebar don't animate as smoothly as the ones on the
Chats and tasks page. Look at the layoutId prefixes in Rows.jsx and fix it.
Run npm test and npm run smoke before you tell me it's done.
```

**The working agreement to keep:** `npm test && npm run smoke && npm run build` before any change counts as finished. The tests encode the specification's acceptance criteria — if a change breaks one, the change is wrong, not the test.

---

## 5 · Deploy and point the domain

The repo is a static SPA — build it, serve `dist/`. Any of these hosts work; all of them do the build for you on push.

**Recommended: Vercel.** Auto-detects Vite, handles SPA routing without configuration, and custom domains are two clicks.

```bash
npm i -g vercel
vercel          # first run links the project; accept the detected Vite settings
vercel --prod
```

Or skip the CLI: at vercel.com → **Add New → Project** → import `$GH_USER/$REPO` → Deploy. Every push to `main` then redeploys automatically.

**Equally fine:** Netlify (the repo ships `public/_redirects`, so SPA routing works untouched) or Cloudflare Pages (build command `npm run build`, output directory `dist`).

**One caveat — GitHub Pages.** It can't serve `/prototype` as a deep link without help. If you choose it, either add the standard SPA 404 redirect, or switch `BrowserRouter` → `HashRouter` in `src/main.jsx` (URLs become `/#/prototype`). The other three hosts need no code change.

**Then the domain:** add it in your host's dashboard under Domains, and copy the exact DNS records it shows you into your registrar — an `A` record for the apex (`example.com`) and a `CNAME` for `www`, or whatever that host specifies. Use the values from the dashboard rather than any written down elsewhere; hosts change them. DNS propagation is usually minutes, occasionally an hour. Certificates are issued automatically once the records resolve.

Last check, against the live domain:

```bash
curl -sI https://yourdomain.com | head -3                    # 200
curl -sI https://yourdomain.com/prototype | head -3          # 200, not 404
curl -sI https://yourdomain.com/Bundle_ZW-FS-001_v1_0.pdf | head -3   # 200, application/pdf
```

If the second one 404s, SPA routing isn't configured — that's the GitHub Pages caveat above.

---

## Daily loop, afterwards

```bash
cd "$ROOT" && git pull
claude                                   # work
npm test && npm run smoke && npm run build
git add -A && git commit -m "..." && git push    # host redeploys on push
```
