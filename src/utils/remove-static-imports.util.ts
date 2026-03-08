export function removeStaticImports(code: string): string {
  const len = code.length;
  let i = 0;
  let result = "";

  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < len) {
    const c = code[i];
    const next = code[i + 1];

    // line comment
    if (
      !inSingle && !inDouble && !inTemplate && !inBlockComment && c === "/" &&
      next === "/"
    ) {
      inLineComment = true;
    }

    if (inLineComment && c === "\n") {
      inLineComment = false;
    }

    // block comment
    if (
      !inSingle && !inDouble && !inTemplate && !inLineComment && c === "/" &&
      next === "*"
    ) {
      inBlockComment = true;
    }

    if (inBlockComment && c === "*" && next === "/") {
      inBlockComment = false;
      result += "*/";
      i += 2;
      continue;
    }

    if (inLineComment || inBlockComment) {
      result += c;
      i++;
      continue;
    }

    // strings
    if (!inDouble && !inTemplate && c === "'" && code[i - 1] !== "\\") {
      inSingle = !inSingle;
    } else if (!inSingle && !inTemplate && c === '"' && code[i - 1] !== "\\") {
      inDouble = !inDouble;
    } else if (!inSingle && !inDouble && c === "`" && code[i - 1] !== "\\") {
      inTemplate = !inTemplate;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      // detect static import
      if (code.startsWith("import", i)) {
        const after = code[i + 6];

        // skip dynamic import()
        if (after === "(") {
          result += "import";
          i += 6;
          continue;
        }

        // skip until semicolon or newline
        let j = i;
        while (j < len && code[j] !== ";" && code[j] !== "\n") {
          j++;
        }

        if (code[j] === ";") j++;

        i = j;
        continue;
      }
    }

    result += c;
    i++;
  }

  return result;
}
