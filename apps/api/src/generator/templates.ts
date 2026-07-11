import MarkdownIt from 'markdown-it';

type Heading = { level: number; id: string; text: string };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractCoverField(markdown: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`-\\s*\\*\\*${escapedLabel}:\\*\\*\\s*(.+)`, 'i'),
    new RegExp(`\\|\\s*${escapedLabel}\\s*\\|\\s*(.+?)\\s*\\|`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  return '';
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function renderWithAnchors(markdown: string) {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
  const headings: Heading[] = [];

  const defaultHeadingOpen =
    md.renderer.rules.heading_open ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const level = Number(tokens[idx].tag.substring(1));
    // Only anchor h2/h3 for ToC clarity
    if (level === 2 || level === 3) {
      const inline = tokens[idx + 1];
      let text = '';
      if (inline && inline.type === 'inline' && Array.isArray(inline.children)) {
        text = inline.children
          .filter((t: any) => t.type === 'text' || t.type === 'code_inline')
          .map((t: any) => t.content)
          .join('');
      }
      const id = slugify(text || `section-${idx}`);
      tokens[idx].attrSet('id', id);
      headings.push({ level, id, text: text || id });
    }
    return defaultHeadingOpen(tokens, idx, options, env, self);
  };

  const html = md.render(markdown ?? '');
  return { html, headings };
}

function renderToc(headings: Heading[]) {
  if (!headings.length) return '';
  const filtered = headings.filter((heading) => {
    if (heading.level === 2) return true;
    if (heading.level !== 3) return false;
    const normalized = heading.text.trim().toLowerCase();
    return normalized !== 'detailed findings';
  });

  const groups: Array<{ parent: Heading; children: Heading[] }> = [];
  for (const heading of filtered) {
    if (heading.level === 2) {
      groups.push({ parent: heading, children: [] });
      continue;
    }
    const currentGroup = groups[groups.length - 1];
    if (currentGroup) {
      currentGroup.children.push(heading);
    }
  }

  const items = groups
    .map(({ parent, children }) => {
      const childMarkup = children.length
        ? `<ul class="toc-sublist">
            ${children
              .map(
                (child) => `
                  <li>
                    <button type="button" class="toc-link toc-link-sub" data-target="${child.id}">${child.text}</button>
                  </li>`,
              )
              .join('')}
          </ul>`
        : '';
      return `
        <li class="toc-item">
          <button type="button" class="toc-link" data-target="${parent.id}">${parent.text}</button>
          ${childMarkup}
        </li>`;
    })
    .join('');

  return `
  <div class="toc">
    <h2>Table of Contents</h2>
    <ul>
      ${items}
    </ul>
  </div>`;
}

export function renderDocumentHtml(title: string, markdown: string) {
  const { html: body, headings } = renderWithAnchors(markdown ?? '');
  const toc = renderToc(headings);
  const companyName = extractCoverField(markdown, 'Company') || 'Not provided';
  const systemName = extractCoverField(markdown, 'AI System') || title;
  const reportType = headings[0]?.text || 'EU AI Act Technical Documentation';
  const generatedOn = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <base href="about:srcdoc" />
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: 0.7in 0.8in 0.8in;
        }
        :root {
          --ink: #0f172a;
          --muted: #64748b;
          --line: #dbe4ee;
          --panel: #f8fafc;
          --panel-2: #eef4f7;
          --accent: #0f766e;
          --accent-soft: #dff7f2;
          --navy: #0f172a;
          --blue: #0f4c81;
          --sky: #0ea5e9;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont,
            'Segoe UI', sans-serif;
          margin: 0;
          line-height: 1.55;
          color: var(--ink);
          background: linear-gradient(180deg, #f7fafc 0%, #ffffff 24%);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          scroll-behavior: smooth;
        }
        .report-shell {
          max-width: 8.2in;
          margin: 0 auto;
        }
        .cover {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 28px;
          background: linear-gradient(135deg, #0f172a 0%, #18283d 55%, #17304b 100%);
          color: #fff;
          padding: 2rem 2rem 2.2rem;
          box-shadow: 0 32px 80px -42px rgba(15, 23, 42, 0.45);
          margin-bottom: 1.2rem;
        }
        .cover::before {
          content: '';
          position: absolute;
          top: -90px;
          right: -60px;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.14);
          filter: blur(8px);
        }
        .cover::after {
          content: '';
          position: absolute;
          bottom: -80px;
          left: -40px;
          width: 200px;
          height: 200px;
          border-radius: 999px;
          background: rgba(45, 212, 191, 0.12);
          filter: blur(8px);
        }
        .cover-top {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          position: relative;
          z-index: 1;
        }
        .cover-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          margin-top: 1.35rem;
          position: relative;
          z-index: 1;
        }
        .cover-meta-card {
          border: 1px solid rgba(226, 232, 240, 0.12);
          background: rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 0.8rem 0.9rem;
        }
        .cover-meta-label {
          display: block;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(226, 232, 240, 0.7);
          margin-bottom: 0.3rem;
        }
        .cover-meta-value {
          display: block;
          font-size: 13px;
          line-height: 1.5;
          color: #fff;
          font-weight: 600;
        }
        .brand-mark {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.1rem;
        }
        .brand-badge {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, #e2e8f0 0%, #ffffff 100%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--navy);
          font-size: 18px;
          font-weight: 800;
        }
        .brand-copy {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(226, 232, 240, 0.8);
        }
        .cover h1 {
          font-size: 32px;
          line-height: 1.08;
          letter-spacing: -0.04em;
          margin: 0.2rem 0 0.8rem;
          color: #fff;
          border: none;
          padding: 0;
        }
        .cover p {
          margin: 0;
          color: rgba(226, 232, 240, 0.88);
          max-width: 78%;
          font-size: 13px;
          line-height: 1.7;
        }
        .cover-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border-radius: 999px;
          padding: 0.45rem 0.75rem;
          margin-bottom: 0.9rem;
          border: 1px solid rgba(226, 232, 240, 0.14);
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.88);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .toc {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid var(--line);
          padding: 1rem 1.25rem;
          border-radius: 18px;
          margin: 0 0 1.5rem;
          box-shadow: 0 22px 50px -42px rgba(15, 23, 42, 0.22);
        }
        .toc h2 {
          margin: 0 0 0.7rem;
          font-size: 15px;
          letter-spacing: -0.02em;
        }
        .toc ul {
          list-style: none;
          padding-left: 0;
          margin: 0;
          columns: 2;
          column-gap: 2rem;
        }
        .toc li {
          margin: 0.3rem 0;
          break-inside: avoid;
        }
        .toc-item {
          margin-bottom: 0.8rem;
        }
        .toc-link {
          appearance: none;
          border: none;
          background: transparent;
          padding: 0;
          color: var(--blue);
          text-decoration: none;
          font-size: 13px;
          line-height: 1.5;
          text-align: left;
          cursor: pointer;
          font-weight: 600;
        }
        .toc-link-sub {
          font-size: 12px;
          font-weight: 500;
          color: #4b5563;
        }
        .toc-sublist {
          columns: 1 !important;
          margin-top: 0.35rem !important;
          padding-left: 0.9rem !important;
        }
        .toc-sublist li {
          margin: 0.22rem 0;
        }
        .toc a {
          color: var(--blue);
          text-decoration: none;
          font-size: 13px;
        }
        .content {
          background: #fff;
          border: 1px solid rgba(219, 228, 238, 0.92);
          border-radius: 24px;
          padding: 1.45rem 1.5rem 1.6rem;
          box-shadow: 0 28px 70px -52px rgba(15, 23, 42, 0.28);
        }
        .content > *:first-child {
          margin-top: 0 !important;
        }
        h1, h2, h3, h4 {
          color: var(--ink);
          page-break-after: avoid;
        }
        h1 {
          font-size: 1.85rem;
          letter-spacing: -0.04em;
          border-bottom: 2px solid var(--line);
          padding-bottom: 0.55rem;
          margin: 0 0 1rem;
        }
        h2 {
          font-size: 1.18rem;
          letter-spacing: -0.02em;
          margin: 1.8rem 0 0.7rem;
          padding: 0.7rem 0.9rem;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 18px 30px -28px rgba(15, 23, 42, 0.18);
        }
        h3 {
          font-size: 1rem;
          margin: 1.1rem 0 0.55rem;
          padding-left: 0.75rem;
          border-left: 3px solid var(--sky);
        }
        p {
          margin: 0.45rem 0 0.8rem;
          color: #243245;
        }
        strong {
          color: var(--ink);
        }
        hr {
          border: none;
          border-top: 1px solid var(--line);
          margin: 1.4rem 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.15rem 0 1.4rem;
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          page-break-inside: avoid;
          box-shadow: 0 18px 34px -30px rgba(15, 23, 42, 0.16);
        }
        th, td {
          border: 1px solid var(--line);
          padding: 0.72rem 0.8rem;
          text-align: left;
          vertical-align: top;
          font-size: 13px;
        }
        th {
          background: linear-gradient(180deg, #f8fafc 0%, #eef5f8 100%);
          color: var(--ink);
          font-weight: 700;
        }
        tr:nth-child(even) td {
          background: #fbfdfe;
        }
        ul {
          padding-left: 1.1rem;
          margin: 0.45rem 0 1rem;
        }
        ol {
          padding-left: 1.25rem;
          margin: 0.45rem 0 1rem;
        }
        li {
          margin: 0.28rem 0;
          color: #243245;
        }
        blockquote {
          margin: 1rem 0;
          padding: 0.9rem 1rem;
          border-left: 4px solid var(--accent);
          background: var(--accent-soft);
          border-radius: 0 14px 14px 0;
          color: #134e4a;
        }
        code {
          background: #eef2f7;
          padding: 0.08rem 0.35rem;
          border-radius: 6px;
          font-size: 0.92em;
        }
        .report-footer {
          margin-top: 1.3rem;
          padding-top: 1rem;
          border-top: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          color: var(--muted);
          font-size: 11px;
        }
        .report-footer strong {
          display: block;
          color: var(--ink);
          margin-bottom: 0.2rem;
          font-size: 12px;
        }
        @media print {
          body {
            background: #fff;
          }
          .cover,
          .toc,
          .content {
            box-shadow: none;
          }
          h2,
          table {
            box-shadow: none;
          }
          .content {
            border-color: #e2e8f0;
          }
        }
      </style>
      <script>
        window.addEventListener('DOMContentLoaded', () => {
          document.querySelectorAll('.toc-link[data-target]').forEach((link) => {
            link.addEventListener('click', (event) => {
              event.preventDefault();
              const targetId = link.getAttribute('data-target');
              if (!targetId) return;
              const target = document.getElementById(targetId);
              if (!target) return;
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          });
        });
      </script>
    </head>
    <body>
      <div class="report-shell">
        <section class="cover">
          <div class="cover-top">
            <div>
              <div class="brand-mark">
                <span class="brand-badge">N</span>
                <div class="brand-copy">NeuralDocx Consulting Report</div>
              </div>
              <div class="cover-kicker">${escapeHtml(reportType)}</div>
              <h1>${escapeHtml(systemName)}</h1>
              <p>
                Professional AI governance and regulatory documentation prepared in a consulting-report format for internal review, audit readiness, and stakeholder decision-making.
              </p>
              <div class="cover-meta">
                <div class="cover-meta-card">
                  <span class="cover-meta-label">Prepared for</span>
                  <span class="cover-meta-value">${escapeHtml(companyName)}</span>
                </div>
                <div class="cover-meta-card">
                  <span class="cover-meta-label">AI system</span>
                  <span class="cover-meta-value">${escapeHtml(systemName)}</span>
                </div>
                <div class="cover-meta-card">
                  <span class="cover-meta-label">Report type</span>
                  <span class="cover-meta-value">${escapeHtml(reportType)}</span>
                </div>
                <div class="cover-meta-card">
                  <span class="cover-meta-label">Generated on</span>
                  <span class="cover-meta-value">${generatedOn}</span>
                </div>
                <div class="cover-meta-card">
                  <span class="cover-meta-label">Prepared by</span>
                  <span class="cover-meta-value">NeuralDocx</span>
                </div>
              </div>
            </div>
            <div class="brand-copy" style="text-align:right;">
              Generated on<br />${generatedOn}
            </div>
          </div>
        </section>

        ${toc}

        <main class="content">
          ${body}
          <div class="report-footer">
            <div>
              <strong>Prepared by NeuralDocx</strong>
              AI compliance documentation service
            </div>
            <div>
              Generated on ${generatedOn}
            </div>
          </div>
        </main>
      </div>
    </body>
  </html>`;
}
