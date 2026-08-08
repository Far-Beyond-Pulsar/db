"use client";

import React, { useState } from "react";

const KEYWORDS =
  /\b(?:as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while)\b/;

const BUILTINS =
  /\b(?:Option|Result|Vec|String|Box|Rc|Arc|Some|None|Ok|Err|u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64|bool|char|i32::MAX)\b/;

const TOKEN =
  /\/\/[^\n]*|\/[*][\s\S]*?[*]\/|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`[^`\n]*`|#\[[^\]]*\]|#[^\s\[\]]+/g;

interface Token {
  text: string;
  cls: string;
}

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code)) !== null) {
    if (m.index > last) {
      const plain = code.slice(last, m.index);
      pushPlain(plain, tokens);
    }
    const text = m[0];
    let cls = "";
    if (text.startsWith("//")) {
      cls = "text-white/30 italic";
    } else if (text.startsWith("/*") || text.startsWith("*/")) {
      cls = "text-white/30 italic";
    } else if (text.startsWith('"') || text.startsWith("'") || text.startsWith("`")) {
      cls = "text-[#7dd3fc]";
    } else if (text.startsWith("#")) {
      cls = "text-[#c4b5fd]";
    }
    tokens.push({ text, cls });
    last = m.index + text.length;
  }
  if (last < code.length) {
    pushPlain(code.slice(last), tokens);
  }
  return tokens;
}

function pushPlain(plain: string, out: Token[]) {
  let last = 0;
  let m: RegExpExecArray | null;
  const combined = new RegExp(
    `(${KEYWORDS.source})|(${BUILTINS.source})|(\\b\\d+(?:\\.\\d+)?\\b)`,
    "g",
  );
  combined.lastIndex = 0;
  while ((m = combined.exec(plain)) !== null) {
    if (m.index > last) {
      out.push({ text: plain.slice(last, m.index), cls: "" });
    }
    const cls = m[1]
      ? "text-[#38bdf8]"
      : m[2]
        ? "text-[#f472b6]"
        : "text-[#c4b5fd]";
    out.push({ text: m[0], cls });
    last = m.index + m[0].length;
  }
  if (last < plain.length) {
    out.push({ text: plain.slice(last), cls: "" });
  }
}

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language = "rust", title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const lines = code.split("\n");

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-white/[0.07] bg-[#09090b]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0c0c0f]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
          </div>
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.06em] text-white/35">
            {title || language}
          </span>
        </div>
        <button
          onClick={copy}
          aria-label="Copy code"
          className="font-mono text-[11px] px-2 py-1 rounded border border-white/[0.10] bg-transparent text-white/40 hover:text-white/80 hover:border-white/20 transition-colors"
        >
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 font-mono text-[13px] leading-[1.6] text-white/70">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[40px_1fr]">
              <span className="text-right pr-4 select-none text-white/20">{i + 1}</span>
              <span className="whitespace-pre">
                {tokenize(line).map((t, j) =>
                  t.cls ? (
                    <span key={j} className={t.cls}>
                      {t.text}
                    </span>
                  ) : (
                    <span key={j}>{t.text}</span>
                  ),
                )}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

export default CodeBlock;
