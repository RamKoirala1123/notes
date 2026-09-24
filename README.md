# MyNotes Next.js Edition

A modern, privacy-focused Markdown note manager built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Dexie IndexedDB**.

Everything is stored locally inside your browser, making it zero-config, ultra-fast, and 100% compatible with static/serverless hosting on **Vercel** with your **custom domain**!

---

## ✨ Features

- 📝 **Markdown Editor & Split Live Preview**: CodeMirror & GFM styled Markdown rendering with live preview.
- 🧮 **LaTeX Math (KaTeX)**: Inline `$E=mc^2$` & block math equation rendering.
- 📊 **Mermaid Diagrams**: Interactive flowcharts, sequence diagrams, and mind maps.
- 🔗 **Wikilinks (`[[slug]]`)**: Bidirectional note connections that create linked notes automatically.
- 🏷️ **Tag Management**: Frontmatter tags & `#inline` hashtags with real-time sidebar filters.
- 📤 **Import & Export**: Bulk import `.md` files (with frontmatter metadata) & export all notes as Markdown or standalone HTML documents.
- 🌐 **Public Page Publishing**: Toggle public visibility for notes to share static, sanitized links.
- 💾 **IndexedDB Local Storage**: Privacy-first browser storage with auto-save.

---

## 🚀 Local Development

1. Navigate to `mynotes-nextjs` folder:
   ```bash
   cd mynotes-nextjs
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to Vercel (Custom Domain)

### Option A: Via Vercel CLI

1. Install Vercel CLI (if not installed):
   ```bash
   npm i -g vercel
   ```

2. Deploy from the `mynotes-nextjs` directory:
   ```bash
   vercel
   ```

3. Deploy to production:
   ```bash
   vercel --prod
   ```

### Option B: Via GitHub Repository

1. Push your `mynotes-nextjs` directory or repository to GitHub / GitLab / Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import your project repository.
4. Set **Root Directory** to `mynotes-nextjs` (if inside a monorepo).
5. Click **Deploy**.

### 🔗 Connecting Your Custom Domain on Vercel

1. In your Vercel Project Dashboard, go to **Settings** → **Domains**.
2. Type your domain name (e.g. `notes.yourdomain.com` or `yourdomain.com`) and click **Add**.
3. Update your DNS settings at your domain provider (Cloudflare, Namecheap, GoDaddy, etc.):
   - **CNAME**: Point `notes` to `cname.vercel-dns.com`
   - **A Record**: Point `@` to `76.76.21.21`
4. Once DNS propagates, your site will automatically serve with HTTPS on your custom domain!
