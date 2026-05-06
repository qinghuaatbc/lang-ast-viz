const KEYWORDS: Record<string, Set<string>> = {
  rust:       new Set(['let', 'if', 'else', 'while', 'print', 'class', 'extends', 'new', 'self', 'true', 'false']),
  go:         new Set(['var', 'if', 'else', 'while', 'print', 'class', 'extends', 'new', 'self', 'true', 'false']),
  python:     new Set(['if', 'else', 'while', 'print', 'class', 'extends', 'new', 'self', 'True', 'False']),
  typescript: new Set(['let', 'const', 'if', 'else', 'while', 'print', 'class', 'extends', 'new', 'self', 'true', 'false']),
  c:          new Set(['int', 'if', 'else', 'while', 'printf', 'class', 'extends', 'new', 'self', 'true', 'false']),
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function isIdentStart(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'
}

function isIdentChar(c: string): boolean {
  return isIdentStart(c) || (c >= '0' && c <= '9')
}

function highlightLine(line: string, kws: Set<string>): string {
  let out = ''
  let i = 0

  while (i < line.length) {
    const c = line[i]

    if (c >= '0' && c <= '9') {
      let num = ''
      while (i < line.length && line[i] >= '0' && line[i] <= '9') num += line[i++]
      out += `<span class="hl-num">${num}</span>`
      continue
    }

    if (isIdentStart(c)) {
      let word = ''
      while (i < line.length && isIdentChar(line[i])) word += line[i++]
      out += kws.has(word)
        ? `<span class="hl-kw">${word}</span>`
        : `<span class="hl-id">${word}</span>`
      continue
    }

    if (i + 1 < line.length) {
      const two = c + line[i + 1]
      if (two === '==' || two === '!=' || two === '<=' || two === '>=') {
        out += `<span class="hl-op">${esc(two)}</span>`
        i += 2
        continue
      }
    }

    if ('+-*/%=<>!'.includes(c)) {
      out += `<span class="hl-op">${esc(c)}</span>`
      i++
      continue
    }

    if ('{}'.includes(c)) {
      out += `<span class="hl-brace">${c}</span>`
      i++
      continue
    }
    if ('()[]'.includes(c)) {
      out += `<span class="hl-paren">${esc(c)}</span>`
      i++
      continue
    }
    if (c === ';' || c === ',') {
      out += `<span class="hl-punct">${c}</span>`
      i++
      continue
    }
    if (c === '.') {
      out += `<span class="hl-punct">.</span>`
      i++
      continue
    }

    out += esc(c)
    i++
  }

  return out
}

export function highlight(code: string, language: string, errorLines?: Set<number>): string {
  const kws = KEYWORDS[language] ?? KEYWORDS.rust
  const lines = code.split('\n')
  return lines.map((line, idx) => {
    const highlighted = highlightLine(line, kws)
    if (errorLines?.has(idx + 1)) {
      return `<span class="hl-error-line">${highlighted}</span>`
    }
    return highlighted
  }).join('\n')
}
