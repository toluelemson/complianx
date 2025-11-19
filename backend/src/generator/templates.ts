import MarkdownIt from 'markdown-it';

type Heading = { level: number; id: string; text: string };

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
  const items = headings
    .map((h) => {
      const pad = h.level === 3 ? 'padding-left: 1rem;' : '';
      return `<li style="${pad}"><a href="#${h.id}">${h.text}</a></li>`;
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
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        body {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont,
            'Segoe UI', sans-serif;
          margin: 0;
          padding: 2rem;
          line-height: 1.6;
          color: #0f172a;
          background: #ffffff;
        }
        h1, h2, h3 {
          color: #0f172a;
        }
        h1 {
          font-size: 2rem;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
        }
        .toc {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 1rem 1.25rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        .toc ul { list-style: none; padding-left: 0; margin: 0; }
        .toc li { margin: 0.25rem 0; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }
        th, td {
          border: 1px solid #cbd5f5;
          padding: 0.75rem;
          text-align: left;
        }
        th {
          background: #f8fafc;
        }
        ul {
          padding-left: 1.25rem;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${toc}
      ${body}
    </body>
  </html>`;
}
