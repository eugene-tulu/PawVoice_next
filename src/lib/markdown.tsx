import type { ReactNode } from "react";

// Minimal, dependency-free Markdown renderer tuned to the structure of our
// legal docs (headings, bold/italic, links, lists with nesting, blockquotes,
// rules, and tables). Content is trusted (our own files), so no sanitization.

function renderInline(text: string, prefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex =
    /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    const key = `${prefix}-${i++}`;
    if (m[2] !== undefined) nodes.push(<strong key={key} className="font-semibold text-ink">{m[2]}</strong>);
    else if (m[4] !== undefined) nodes.push(<em key={key}>{m[4]}</em>);
    else if (m[6] !== undefined) nodes.push(<code key={key} className="font-mono text-[0.85em] bg-paper-2 px-1.5 py-0.5 rounded text-ink">{m[6]}</code>);
    else if (m[8] !== undefined) nodes.push(<a key={key} href={m[9]} className="text-accent underline underline-offset-2 hover:text-ink">{m[8]}</a>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

type Item = { depth: number; text: string };

function buildList(items: Item[], start: number, depth: number): { node: ReactNode; next: number } {
  const lis: ReactNode[] = [];
  let i = start;
  while (i < items.length) {
    const it = items[i];
    if (it.depth < depth) break;
    let nested: ReactNode = null;
    let consumed = i + 1;
    if (i + 1 < items.length && items[i + 1].depth > depth) {
      const res = buildList(items, i + 1, depth + 1);
      nested = res.node;
      consumed = res.next;
    }
    lis.push(
      <li key={i} className="leading-relaxed">
        {renderInline(it.text, `li-${i}`)}
        {nested}
      </li>,
    );
    i = consumed;
  }
  return {
    node: <ul className="list-disc pl-6 space-y-2 marker:text-accent">{lis}</ul>,
    next: i,
  };
}

export function renderMarkdown(md: string): ReactNode {
  const lines = md.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2], `h-${key}`);
      const cls =
        level === 1
          ? "font-display text-3xl font-bold text-ink mt-2 mb-5"
          : level === 2
            ? "font-display text-xl font-semibold text-ink mt-10 mb-3 scroll-mt-24"
            : "font-display text-lg font-semibold text-ink mt-6 mb-2";
      const Tag = (`h${level}` as "h1" | "h2" | "h3");
      blocks.push(
        <Tag key={key++} className={cls} id={slug(heading[2])}>
          {content}
        </Tag>,
      );
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push(<hr key={key++} className="my-8 border-rule" />);
      i++;
      continue;
    }

    if (
      trimmed.startsWith("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes("-")
    ) {
      const header = splitRow(lines[i]);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-6 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-rule">
                {header.map((c, ci) => (
                  <th key={ci} className="py-2 pr-4 font-semibold text-ink">
                    {renderInline(c, `th-${key}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-rule">
                  {r.map((c, ci) => (
                    <td key={ci} className="py-2.5 pr-4 text-ink-2 align-top">
                      {renderInline(c, `td-${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="border-l-2 border-accent pl-4 my-5 text-ink-2 italic leading-relaxed"
        >
          {buf.map((b, bi) => (
            <p key={bi}>{renderInline(b, `bq-${key}-${bi}`)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items: Item[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        const m = /^(\s*)-\s+(.*)$/.exec(lines[i])!;
        items.push({ depth: Math.floor(m[1].length / 2), text: m[2] });
        i++;
      }
      const minDepth = Math.min(...items.map((it) => it.depth));
      blocks.push(
        <div key={key++} className="my-4 text-ink-2">
          {buildList(items, 0, minDepth).node}
        </div>,
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith(">") &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith("|") && i + 1 < lines.length && lines[i + 1].includes("-"))
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="text-ink-2 leading-relaxed mb-4">
        {renderInline(para.join(" "), `p-${key}`)}
      </p>,
    );
  }

  return <>{blocks}</>;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
