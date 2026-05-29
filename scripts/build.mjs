import fs from "node:fs";

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~()])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function minifyJs(js) {
  let out = "";
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let regex = false;
  let previousSignificant = "";

  for (let index = 0; index < js.length; index += 1) {
    const char = js[index];
    const next = js[index + 1];

    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
        out += "\n";
      }
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      out += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (regex) {
      out += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "/") {
        regex = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      out += char;
      previousSignificant = char;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && /[=(:,!&|?{};\n]/.test(previousSignificant || "\n")) {
      regex = true;
      out += char;
      continue;
    }

    if (/\s/.test(char)) {
      const prev = out[out.length - 1] || "";
      let j = index + 1;
      while (j < js.length && /\s/.test(js[j])) j += 1;
      const upcoming = js[j] || "";
      if (/[\w$#]/.test(prev) && /[\w$#]/.test(upcoming)) out += " ";
      continue;
    }

    if (/[{}()[\];,:?=+\-*<>!&|.%]/.test(char)) {
      out = out.replace(/\s+$/g, "");
      out += char;
    } else {
      out += char;
    }

    if (!/\s/.test(char)) previousSignificant = char;
  }

  return out.trim();
}

fs.writeFileSync("assets/css/styles.min.css", minifyCss(fs.readFileSync("assets/css/styles.css", "utf8")) + "\n");
fs.writeFileSync("assets/js/app.min.js", minifyJs(fs.readFileSync("assets/js/app.js", "utf8")) + "\n");
console.log("Built assets/css/styles.min.css and assets/js/app.min.js");
