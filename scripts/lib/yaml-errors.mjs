// A YAML error of a headmatter or a slide's frontmatter, in plain words and on the line of the file where it is.
// The YAML package's own messages ("Nested mappings are not allowed in compact mappings") name its grammar, not the mistake.

/**
 * `error` is a YAML error (`code`, `message`, `linePos`), `raw` the YAML text, `firstLine` the line of the file its first
 * line is on and `part` "headmatter", "frontmatter" or "config file". Returns `{ line, message }`.
 */
export function describeYamlError(error, raw, firstLine, part) {
  const lines = raw.replace(/\n$/, '').split('\n');
  // A quote that is never closed is reported where the text ends: the line that opens it is the one to fix.
  const quote = /closing ['"]?quote/i.test(error.message ?? '') ? openQuote(lines) : null;
  if (quote)
    return {
      line: firstLine + quote.at - 1,
      message: `the ${quote.char} that starts ${quote.key ? `the value of "${quote.key}"` : 'this value'} is never closed; add the closing ${quote.char}`,
    };
  // The error's own line; a bracket that is never closed is reported after the last line, so stay inside.
  const at = Math.min(Math.max(error.linePos?.[0]?.line ?? 1, 1), lines.length);
  const text = lines[at - 1] ?? '';
  return { line: firstLine + at - 1, message: plainWords(error, text, part) };
}

// The line (from 1) and key of the quoted value that is still open at the end, read line by line as YAML does: a quoted value
// may go on over several lines, so one that opens and closes later is fine. `''` inside single quotes is a quote, not the end.
function openQuote(lines) {
  let open = null;
  lines.forEach((line, i) => {
    let rest = line;
    if (!open) {
      const m = /^\s*(?:-\s+)?(?:([\w$-]+)\s*:\s+)?(['"])(.*)$/.exec(line);
      if (!m || /^\s*#/.test(line)) return;
      open = { at: i + 1, key: m[1], char: m[2] };
      rest = m[3];
    }
    const closed =
      open.char === '"' ? /(?<!\\)(?:\\\\)*"/.test(rest) : /'/.test(rest.replace(/''/g, ''));
    if (closed) open = null;
  });
  return open;
}

function plainWords(error, text, part) {
  const pair = /^\s*([\w$-]+)\s*:\s+(.*\S)\s*$/.exec(text);
  const own = error.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, '');
  switch (error.code) {
    case 'BLOCK_AS_IMPLICIT_KEY':
      if (pair && /:\s/.test(pair[2]))
        return `the value of "${pair[1]}" has ": " in it, which reads as a second key; put it in quotes: ${pair[1]}: "${pair[2].replace(/"/g, '\\"')}"`;
      return `the line after "${text.trim()}" is indented more than it, or a value there has ": " in it and needs quotes`;
    case 'TAB_AS_INDENT':
      return 'this line is indented with a tab; YAML needs spaces';
    case 'DUPLICATE_KEY':
      return pair ? `"${pair[1]}" is set twice` : 'a key is set twice';
    case 'BAD_INDENT':
      if (/end with a [\]}]/.test(own)) return `a ${own.includes(']') ? '[' : '{'} is not closed`;
      break;
    case 'MISSING_CHAR':
      if (/closing ['"]?quote/i.test(own)) return 'a quote is not closed';
      if (/Implicit map keys/.test(own) && part === 'config file')
        return `"${text.trim()}" is not a "key: value" line`;
      if (/Implicit map keys/.test(own))
        return `"${text.trim()}" is not a "key: value" line; if it is the slide's text, the --- that ends the ${part} is missing above it`;
      break;
  }
  return own;
}
