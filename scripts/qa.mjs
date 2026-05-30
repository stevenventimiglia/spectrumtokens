import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const exists = (path) => fs.existsSync(new URL(path, root));
const checks = [];

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractAttributes(tag) {
  const attrs = {};
  for (const [, name, quote, value] of tag.matchAll(/\s([\w:-]+)(?:=("|')([^"']*)\2)?/g)) {
    attrs[name] = value ?? "";
  }
  return attrs;
}

function allTags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => match[0]);
}

function makeElement() {
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: true,
    tabIndex: 0,
    dataset: {},
    children: [],
    attributes: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    addEventListener() {},
    append(child) { this.children.push(child); },
    querySelector() { return makeElement(); },
    querySelectorAll() { return [makeElement(), makeElement(), makeElement(), makeElement()]; },
    focus() { this.focused = true; },
    select() {},
    click() {},
    remove() {},
    getBoundingClientRect() { return { left: 120, bottom: 160, width: 92 }; }
  };
}

function runAppProbe(extra = "") {
  const rules = [];
  const sheet = {
    href: "http://127.0.0.1:4173/assets/css/styles.css",
    get cssRules() { return rules; },
    insertRule(ruleText, index) {
      const selectorText = ruleText.slice(0, ruleText.indexOf("{")).trim();
      rules.splice(index, 0, { selectorText, cssText: ruleText });
    },
    deleteRule(index) { rules.splice(index, 1); }
  };
  const elements = new Map();
  const get = (key) => elements.get(key) || (elements.set(key, makeElement()), elements.get(key));
  const tabFormats = ["css", "js", "figma", "json", "scss", "tailwind"];
  const context = {
    console,
    navigator: { clipboard: { writeText: async () => {} } },
    window: { innerWidth: 1200, setTimeout() {}, addEventListener() {} },
    document: {
      activeElement: null,
      documentElement: makeElement(),
      styleSheets: [sheet],
      querySelector: (selector) => get(selector),
      querySelectorAll: (selector) => selector === ".tab-button"
        ? tabFormats.map((format, index) => ({ ...makeElement(), id: `tab-${format}`, dataset: { format }, attributes: { "aria-selected": index === 0 ? "true" : "false" } }))
        : [7, 8, 10].map((depth) => ({ ...makeElement(), value: String(depth), checked: depth === 8 })),
      createElement: () => makeElement(),
      execCommand: () => true,
      addEventListener() {},
      body: { append() {} }
    },
    Blob: function Blob() {},
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} }
  };
  vm.runInNewContext(`${read("assets/js/app.js")}\n${extra}`, context, { filename: "assets/js/app.js" });
  return { context, rules };
}

function hexToRgb(hex) {
  const value = hex.slice(1);
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}

function relativeLuminance(hex) {
  const channels = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

check("JavaScript parses", () => {
  execFileSync("node", ["--check", "assets/js/app.js"], { cwd: new URL(".", root), stdio: "pipe" });
  execFileSync("node", ["--check", "assets/js/app.min.js"], { cwd: new URL(".", root), stdio: "pipe" });
});

check("HTML asset references resolve from repo root", () => {
  const html = read("index.html");
  assert(!html.includes('../assets/'), "index.html must not reference ../assets from the root page");
  for (const tag of [...allTags(html, "link"), ...allTags(html, "script")]) {
    const attrs = extractAttributes(tag);
    const path = attrs.href || attrs.src;
    if (!path || path.startsWith("http") || path.startsWith("#")) continue;
    assert(exists(path), `Missing asset referenced by HTML: ${path}`);
  }
});

check("No inline CSS or runtime element style API", () => {
  const html = read("index.html");
  const js = read("assets/js/app.js");
  assert(!/\sstyle\s*=/.test(html), "HTML contains style attributes");
  assert(!/\.\s*style\b/.test(js), "JS uses element.style inline styling");
  assert(!/setAttribute\(["']style["']/.test(js), "JS sets a style attribute");
  assert(!/setProperty\(/.test(js), "JS writes inline style properties");
});


check("Production assets are minified and referenced", () => {
  const html = read("index.html");
  assert(html.includes("assets/css/styles.min.css"), "HTML should reference minified CSS");
  assert(html.includes("assets/js/app.min.js"), "HTML should reference minified JS");
  assert(exists("assets/css/styles.min.css"), "Missing minified CSS");
  assert(exists("assets/js/app.min.js"), "Missing minified JS");
  assert(read("assets/css/styles.min.css").length < read("assets/css/styles.css").length, "Minified CSS should be smaller than source CSS");
  assert(read("assets/js/app.min.js").length < read("assets/js/app.js").length, "Minified JS should be smaller than source JS");
});

check("Labels, tabs, and ARIA references are valid", () => {
  const html = read("index.html");
  const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]));
  for (const label of allTags(html, "label")) {
    const attrs = extractAttributes(label);
    if (attrs.for) assert(ids.has(attrs.for), `Label points to missing id: ${attrs.for}`);
  }
  for (const tag of [...allTags(html, "button"), ...allTags(html, "div")]) {
    const attrs = extractAttributes(tag);
    if (attrs["aria-controls"]) assert(ids.has(attrs["aria-controls"]), `aria-controls points to missing id: ${attrs["aria-controls"]}`);
    if (attrs["aria-labelledby"]) assert(ids.has(attrs["aria-labelledby"]), `aria-labelledby points to missing id: ${attrs["aria-labelledby"]}`);
  }
  assert(html.includes('role="tabpanel"'), "Export panel needs tabpanel role");
  assert(html.includes('tabindex="0"'), "Export panel should be keyboard focusable");
  assert(html.includes('aria-labelledby="primaryColorLabel hexInputLabel"'), "Hex input needs a programmatic label");
  assert(html.includes('aria-label="Save current primary color"'), "Primary color save button needs an accessible label");
  assert(html.includes('<span>Web</span>'), "Seven-stop scale depth should be labeled Web");
});

check("Visible button text is included in accessible names", () => {
  const html = read("index.html");
  const js = read("assets/js/app.js");
  assert(js.includes('`${formatExportLabel(role.name)} ${role.hex}. Open copy options`'), "Role swatch names must include visible role and hex text");
  assert(js.includes('`${token.hex}. Open copy options for ${token.name}`'), "Spectrum swatch names must include visible hex text");
  assert(html.includes('data-copy="scss-var"'), "Copy menu should include SCSS variable copy");
  assert(html.includes('data-copy="scss-property"'), "Copy menu should include SCSS property copy");
});

check("Install metadata and service worker are absent", () => {
  const html = read("index.html");
  const js = read("assets/js/app.js");
  assert(!exists("manifest.webmanifest"), "Manifest should not be present");
  assert(!exists("service-worker.js"), "Service worker should not be present");
  assert(!fs.existsSync(new URL("assets/img", root)), "Unused app image assets should not be present");
  assert(!html.includes("rel=\"manifest\""), "HTML should not link a web manifest");
  assert(!html.includes("apple-mobile-web-app"), "HTML should not include Apple PWA metadata");
  assert(!html.includes("theme-color"), "HTML should not include install theme metadata");
  assert(!js.includes("serviceWorker"), "App should not register a service worker");
});

check("Responsive CSS and motion preferences are covered", () => {
  const css = read("assets/css/styles.css");
  assert(!/@media\s*\(max-width/i.test(css), "CSS should remain progressive-enhancement min-width based");
  assert(!/max-width\s*:/.test(css), "CSS should not rely on max-width constraints");
  assert(css.includes("min-height: 147px"), "Desktop role strip needs reserved height to prevent CLS");
  assert(css.includes("prefers-reduced-motion: reduce"), "CSS missing reduced-motion handling");
  assert(css.includes("forced-colors: active"), "CSS missing forced-colors handling");
});

check("Generated app render and exports are valid", () => {
  const probe = runAppProbe(`
    const sets = buildTokenSets();
    const payload = {
      toneRules: document.styleSheets[0].cssRules.filter((rule) => rule.selectorText.startsWith('[data-tone-id=')).length,
      swatchRules: document.styleSheets[0].cssRules.filter((rule) => rule.selectorText.startsWith('[data-swatch-id=')).length,
      cssLight: buildCss(sets).includes('/* ==================== Light Theme ==================== */'),
      cssBlue: buildCss(sets).includes('/* Blue */'),
      jsBlue: buildJs(sets).includes('// Blue'),
      scssPartial: buildScss(sets).includes('$palette-roles: (') &&
        buildScss(sets).includes('$palette-spectrum: (') &&
        buildScss(sets).includes('@mixin palette-css-vars($mode: light)') &&
        buildScss(sets).includes('--color-primary: var(--primary);'),
      tailwindDark: buildTailwind(sets).includes('// ==================== Dark Theme ===================='),
      jsonOk: Boolean(JSON.parse(buildJson(sets)).color.modes.dark),
      figmaOk: Boolean(JSON.parse(buildFigma(sets)).modes.light),
      noteMatchesPurple300: (() => {
        const light = sets.light;
        return roleMap(light.roles).note === findSpectrumToken(light.spectrum, 'purple', 300).hex;
      })(),
      savedPrimaryRender: (() => {
        state.savedPrimaries = ['#123456'];
        renderSavedPrimaries();
        return document.querySelector('#savedPrimarySwatches').children.length === 1 &&
          document.styleSheets[0].cssRules.some((rule) => rule.selectorText.startsWith('[data-saved-primary-id='));
      })(),
      greyChanges: (() => {
        const before = findSpectrumToken(buildSpectrumData('light'), 'grey', 300).hex;
        state.primary = '#EF4444';
        const after = findSpectrumToken(buildSpectrumData('light'), 'grey', 300).hex;
        return before !== after;
      })()
    };
    globalThis.__payload = payload;
  `);
  const payload = probe.context.__payload;
  assert(payload.toneRules === 8, `Expected 8 tone-strip rules, got ${payload.toneRules}`);
  assert(payload.swatchRules === 72, `Expected 72 default swatch rules, got ${payload.swatchRules}`);
  assert(payload.cssLight && payload.cssBlue && payload.jsBlue && payload.scssPartial && payload.tailwindDark, "Export comments missing");
  assert(payload.jsonOk && payload.figmaOk, "JSON/Figma exports did not parse");
  assert(payload.noteMatchesPurple300, "Note role should use the purple 300 token");
  assert(payload.savedPrimaryRender, "Saved primary swatches should render with dynamic color rules");
  assert(payload.greyChanges, "Grey scale should react to primary color changes");
});

check("Generated swatch text contrast meets WCAG AA", () => {
  const probe = runAppProbe(`
    const failures = [];
    ['light', 'dark'].forEach((mode) => {
      state.theme = mode;
      const spectrum = buildSpectrumData(mode);
      spectrum.forEach((scale) => scale.tokens.forEach((token) => {
        const ink = getReadableInk(token.hex);
        globalThis.__contrastPairs.push({ token: token.name, hex: token.hex, ink });
      }));
    });
  `.replace("globalThis.__contrastPairs.push", "globalThis.__contrastPairs = globalThis.__contrastPairs || []; globalThis.__contrastPairs.push"));
  const pairs = probe.context.__contrastPairs || [];
  const failures = pairs.filter((pair) => contrast(pair.hex, pair.ink) < 4.5);
  assert(failures.length === 0, `Low contrast swatch text: ${failures.map((item) => `${item.token} ${item.hex}/${item.ink}`).join(', ')}`);
});

let failed = 0;
for (const { name, fn } of checks) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(`  ${error.message}`);
  }
}

if (failed) {
  console.error(`\n${failed} QA check${failed === 1 ? "" : "s"} failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} QA checks passed.`);
