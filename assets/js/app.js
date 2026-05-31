const state = {
  primary: "#3B82F6",
  lightReach: 96,
  darkReach: 24,
  depth: 8,
  theme: "light",
  format: "css",
  savedPrimaries: []
};

const derivedRoleScales = [
  { name: "primary", hueOffset: 0, saturationOffset: 0 },
  { name: "secondary", hueOffset: 36, saturationOffset: -4 },
  { name: "accent", hueOffset: -42, saturationOffset: 5 }
];

const scaleRoleLinks = [
  { name: "note", scale: "purple", stop: 300 },
  { name: "info", scale: "grey", stop: 300 },
  { name: "success", scale: "green", stop: 300 },
  { name: "warning", scale: "orange", stop: 300 },
  { name: "error", scale: "red", stop: 300 }
];

const spectrumScales = [
  { name: "yellow", hue: 60 },
  { name: "orange", hue: 32 },
  { name: "red", hue: 0 },
  { name: "magenta", hue: 300 },
  { name: "purple", hue: 258 },
  { name: "blue", hue: 230 },
  { name: "cyan", hue: 190 },
  { name: "green", hue: 128 },
  { name: "grey", hue: 220, neutral: true }
];

const depthStops = {
  7: [50, 100, 200, 300, 400, 500, 600],
  8: [50, 100, 200, 300, 400, 500, 600, 700],
  10: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
};

const themeTokens = {
  light: {
    background: "#f8fafc",
    surface: "#ffffff",
    surfaceRaised: "#fdfefe",
    border: "#dbe3ee",
    text: "#172033",
    muted: "#66758a",
    codeBg: "#111827",
    codeText: "#dbeafe"
  },
  dark: {
    background: "#0f172a",
    surface: "#172033",
    surfaceRaised: "#1d2738",
    border: "#324155",
    text: "#e5edf7",
    muted: "#9fb0c5",
    codeBg: "#07111f",
    codeText: "#d8e7ff"
  }
};

const picker = document.querySelector("#colorPicker");
const hexInput = document.querySelector("#hexInput");
const hexStatus = document.querySelector("#hexStatus");
const addPrimaryButton = document.querySelector("#addPrimaryButton");
const pantonePrimaryButton = document.querySelector("#pantonePrimaryButton");
const savedPrimarySwatches = document.querySelector("#savedPrimarySwatches");
const lightnessRange = document.querySelector("#lightnessRange");
const darknessRange = document.querySelector("#darknessRange");
const lightnessOutput = document.querySelector("#lightnessOutput");
const darknessOutput = document.querySelector("#darknessOutput");
const themeToggle = document.querySelector("#themeToggle");
const themeToggleLabel = document.querySelector("#themeToggleLabel");
const toneStrip = document.querySelector("#toneStrip");
const roleStrip = document.querySelector("#roleStrip");
const spectrumGrid = document.querySelector("#spectrumGrid");
const copyMenu = document.querySelector("#copyMenu");
const exportPanel = document.querySelector("#panel-export");
const exportLabel = document.querySelector("#exportLabel");
const exportText = document.querySelector("#exportText");
const downloadButton = document.querySelector("#downloadButton");
const copyButton = document.querySelector("#copyButton");
const copyStatus = document.querySelector("#copyStatus");
const tokenCount = document.querySelector("#tokenCount");
const tabButtons = [...document.querySelectorAll(".tab-button")];
const pantoneModal = document.querySelector("#pantoneModal");
const pantoneTargetSwatch = document.querySelector("#pantoneTargetSwatch");
const pantoneTargetHex = document.querySelector("#pantoneTargetHex");
const pantoneMatchStatus = document.querySelector("#pantoneMatchStatus");
const pantoneResults = document.querySelector("#pantoneResults");
let activeCopyTarget = null;
let activeCopyAnchor = null;
let pantoneDefinitionsPromise = null;
let generatedId = 0;

function nextGeneratedId(prefix) {
  generatedId += 1;
  return `${prefix}-${generatedId}`;
}

function getAppStylesheet() {
  return [...document.styleSheets].find((sheet) => sheet.href && sheet.href.endsWith("styles.css")) || document.styleSheets[0];
}

function removeDynamicRules(match) {
  const sheet = getAppStylesheet();
  if (!sheet) return;
  for (let index = sheet.cssRules.length - 1; index >= 0; index -= 1) {
    const rule = sheet.cssRules[index];
    if (rule.selectorText && match(rule.selectorText)) sheet.deleteRule(index);
  }
}

function setDynamicRule(selector, declarations) {
  const sheet = getAppStylesheet();
  if (!sheet) return;
  removeDynamicRules((selectorText) => selectorText === selector);
  sheet.insertRule(`${selector} { ${declarations} }`, sheet.cssRules.length);
}

function clearGeneratedElementRules() {
  removeDynamicRules((selectorText) =>
    selectorText.startsWith('[data-tone-id=') ||
    selectorText.startsWith('[data-role-id=') ||
    selectorText.startsWith('[data-list-id=') ||
    selectorText.startsWith('[data-swatch-id=') ||
    selectorText.startsWith('[data-saved-primary-id=')
  );
}

function removeGeneratedRule(selector) {
  removeDynamicRules((selectorText) => selectorText === selector);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(value) {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toUpperCase();
  }
  return null;
}

function hexToRgb(hex) {
  const value = normalizeHex(hex).slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function srgbChannelToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function xyzToLabPivot(value) {
  return value > 0.008856 ? Math.cbrt(value) : (7.787 * value) + (16 / 116);
}

function rgbToLab({ r, g, b }) {
  const red = srgbChannelToLinear(r);
  const green = srgbChannelToLinear(g);
  const blue = srgbChannelToLinear(b);
  const x = (red * 0.4124564) + (green * 0.3575761) + (blue * 0.1804375);
  const y = (red * 0.2126729) + (green * 0.7151522) + (blue * 0.0721750);
  const z = (red * 0.0193339) + (green * 0.1191920) + (blue * 0.9503041);
  const fx = xyzToLabPivot(x / 0.95047);
  const fy = xyzToLabPivot(y);
  const fz = xyzToLabPivot(z / 1.08883);
  return [(116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

function deltaE2000(first, second) {
  const [l1, a1, b1] = first;
  const [l2, a2, b2] = second;
  const c1 = Math.sqrt((a1 ** 2) + (b1 ** 2));
  const c2 = Math.sqrt((a2 ** 2) + (b2 ** 2));
  const cBar = (c1 + c2) / 2;
  const cBar7 = cBar ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + (25 ** 7))));
  const a1Prime = (1 + g) * a1;
  const a2Prime = (1 + g) * a2;
  const c1Prime = Math.sqrt((a1Prime ** 2) + (b1 ** 2));
  const c2Prime = Math.sqrt((a2Prime ** 2) + (b2 ** 2));
  const h1Prime = (radiansToDegrees(Math.atan2(b1, a1Prime)) + 360) % 360;
  const h2Prime = (radiansToDegrees(Math.atan2(b2, a2Prime)) + 360) % 360;
  const deltaLPrime = l2 - l1;
  const deltaCPrime = c2Prime - c1Prime;
  let deltaH = h2Prime - h1Prime;
  if (c1Prime * c2Prime === 0) deltaH = 0;
  else if (deltaH > 180) deltaH -= 360;
  else if (deltaH < -180) deltaH += 360;
  const deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(degreesToRadians(deltaH / 2));
  const lBarPrime = (l1 + l2) / 2;
  const cBarPrime = (c1Prime + c2Prime) / 2;
  let hBarPrime = h1Prime + h2Prime;
  if (c1Prime * c2Prime === 0) hBarPrime = h1Prime + h2Prime;
  else if (Math.abs(h1Prime - h2Prime) > 180) hBarPrime = hBarPrime < 360 ? (hBarPrime + 360) / 2 : (hBarPrime - 360) / 2;
  else hBarPrime /= 2;
  const t = 1 -
    (0.17 * Math.cos(degreesToRadians(hBarPrime - 30))) +
    (0.24 * Math.cos(degreesToRadians(2 * hBarPrime))) +
    (0.32 * Math.cos(degreesToRadians((3 * hBarPrime) + 6))) -
    (0.20 * Math.cos(degreesToRadians((4 * hBarPrime) - 63)));
  const deltaTheta = 30 * Math.exp(-(((hBarPrime - 275) / 25) ** 2));
  const rC = 2 * Math.sqrt((cBarPrime ** 7) / ((cBarPrime ** 7) + (25 ** 7)));
  const sL = 1 + ((0.015 * ((lBarPrime - 50) ** 2)) / Math.sqrt(20 + ((lBarPrime - 50) ** 2)));
  const sC = 1 + (0.045 * cBarPrime);
  const sH = 1 + (0.015 * cBarPrime * t);
  const rT = -Math.sin(degreesToRadians(2 * deltaTheta)) * rC;
  return Math.sqrt(
    ((deltaLPrime / sL) ** 2) +
    ((deltaCPrime / sC) ** 2) +
    ((deltaHPrime / sH) ** 2) +
    (rT * (deltaCPrime / sC) * (deltaHPrime / sH))
  );
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function rgbToHsl({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    if (max === green) hue = 60 * ((blue - red) / delta + 2);
    if (max === blue) hue = 60 * ((red - green) / delta + 4);
  }

  return {
    h: (hue + 360) % 360,
    s: saturation * 100,
    l: lightness * 100
  };
}

function hslToRgb({ h, s, l }) {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) [red, green, blue] = [chroma, x, 0];
  else if (huePrime < 2) [red, green, blue] = [x, chroma, 0];
  else if (huePrime < 3) [red, green, blue] = [0, chroma, x];
  else if (huePrime < 4) [red, green, blue] = [0, x, chroma];
  else if (huePrime < 5) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  const match = lightness - chroma / 2;
  return {
    r: (red + match) * 255,
    g: (green + match) * 255,
    b: (blue + match) * 255
  };
}

function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function getContrastRatio(first, second) {
  const firstLuminance = getRelativeLuminance(first);
  const secondLuminance = getRelativeLuminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

function getReadableInk(hex) {
  return getContrastRatio(hex, "#000000") >= getContrastRatio(hex, "#FFFFFF") ? "#000000" : "#FFFFFF";
}

function mixLightness(index, total, lightReach, darkReach) {
  if (total === 1) return 50;
  const ratio = index / (total - 1);
  return lightReach + (darkReach - lightReach) * ratio;
}

function findSpectrumToken(spectrumData, scaleName, stop) {
  const scale = spectrumData.find((item) => item.name === scaleName);
  if (!scale) return null;
  return scale.tokens.find((token) => token.stop === stop) || null;
}

function buildRoleData(mode, spectrumData) {
  const primaryHsl = rgbToHsl(hexToRgb(state.primary));
  const derivedRoles = derivedRoleScales.map((role) => {
    const hue = (primaryHsl.h + role.hueOffset + 360) % 360;
    const saturation = clamp(primaryHsl.s + role.saturationOffset, 42, 94);
    const baseLightness = clamp(primaryHsl.l, state.darkReach, state.lightReach);
    const lightness = mode === "dark" ? clamp(baseLightness - 18, 36, 64) : baseLightness;
    const hex = rgbToHex(hslToRgb({ h: hue, s: saturation, l: lightness }));
    return {
      name: role.name,
      hex
    };
  });
  const linkedRoles = scaleRoleLinks.map((role) => {
    const token = findSpectrumToken(spectrumData, role.scale, role.stop);
    return {
      name: role.name,
      hex: token ? token.hex : state.primary,
      source: token ? token.name : null
    };
  });
  return [...derivedRoles, ...linkedRoles];
}

function buildSpectrumData(mode) {
  const primaryHsl = rgbToHsl(hexToRgb(state.primary));
  const stops = depthStops[state.depth];
  const baseSaturation = clamp(primaryHsl.s, 42, 94);
  const lightRange = mode === "dark"
    ? { light: clamp(state.lightReach - 38, 42, 62), dark: clamp(state.darkReach - 14, 6, 18) }
    : { light: state.lightReach, dark: state.darkReach };

  return spectrumScales.map((scale) => {
    const tokens = stops.map((stop, index) => {
      const lightness = mixLightness(index, stops.length, lightRange.light, lightRange.dark);
      const saturation = scale.neutral
        ? clamp(primaryHsl.s * 0.08, 4, 12)
        : clamp(baseSaturation - Math.max(0, index - 4) * 2.4, 34, 94);
      const hue = scale.neutral ? primaryHsl.h : scale.hue;
      const hex = rgbToHex(hslToRgb({ h: hue, s: saturation, l: lightness }));
      return {
        name: `${scale.name}-${stop}`,
        stop,
        hex
      };
    });

    return {
      name: scale.name,
      tokens
    };
  });
}

function getFlatSpectrumTokens(data) {
  return data.flatMap((scale) => scale.tokens.map((token) => ({ ...token, scale: scale.name })));
}

function roleMap(roleData) {
  return Object.fromEntries(roleData.map((role) => [role.name, role.hex]));
}

function setPrimaryColor(hex) {
  state.primary = hex;
  render();
}

function loadPantoneDefinitions() {
  if (!pantoneDefinitionsPromise) {
    pantoneDefinitionsPromise = fetch("data/pantone-definitions.json").then((response) => {
      if (!response.ok) throw new Error("Pantone definitions could not be loaded");
      return response.json();
    });
  }
  return pantoneDefinitionsPromise;
}

function getPantoneQuality(definitions, deltaE) {
  return definitions.matching.thresholds.find((threshold) => threshold.maxDeltaE === null || deltaE <= threshold.maxDeltaE)?.label || "Distant";
}

function getPantoneMatches(definitions, hex, limit = definitions.matching.defaultLimit) {
  const targetLab = rgbToLab(hexToRgb(hex));
  return definitions.colors
    .map((color) => {
      const deltaE = deltaE2000(targetLab, color.lab);
      return { ...color, deltaE, quality: getPantoneQuality(definitions, deltaE) };
    })
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, limit);
}

function getPantoneQualityIcon(quality) {
  if (quality === "Compatible") {
    return {
      className: "compatible",
      label: "Compatible",
      content: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 16.6 4.9 12.3l1.4-1.4 2.9 2.9 8.5-8.5 1.4 1.4-9.9 9.9Z"/></svg>'
    };
  }
  if (quality === "Close") return { className: "close", label: "Close", text: "!" };
  return { className: "distant", label: quality, text: "" };
}

function setPantoneModalOpen(open) {
  document.body.classList.toggle("modal-open", open);
}

function renderPantoneResults(matches) {
  pantoneResults.innerHTML = "";
  removeDynamicRules((selectorText) => selectorText.startsWith('[data-pantone-result-id='));
  matches.forEach((match) => {
    const row = document.createElement("article");
    const resultId = nextGeneratedId("pantone-result");
    const icon = getPantoneQualityIcon(match.quality);
    row.className = "pantone-result";
    row.dataset.pantoneResultId = resultId;
    setDynamicRule(`[data-pantone-result-id="${resultId}"]`, `--pantone-result-color: ${match.hex};`);
    const previewButton = match.quality === "Compatible"
      ? `<button class="pantone-preview-button" type="button" data-primary-hex="${match.hex}" aria-label="Use ${match.code} as primary color">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5.2 0 8.7 4.2 9.8 5.8a2 2 0 0 1 0 2.4C20.7 14.8 17.2 19 12 19s-8.7-4.2-9.8-5.8a2 2 0 0 1 0-2.4C3.3 9.2 6.8 5 12 5Zm0 2C7.7 7 4.8 10.4 3.9 12c.9 1.6 3.8 5 8.1 5s7.2-3.4 8.1-5C19.2 10.4 16.3 7 12 7Zm0 2.2A2.8 2.8 0 1 1 12 14.8 2.8 2.8 0 0 1 12 9.2Zm0 2A.8.8 0 1 0 12 12.8.8.8 0 0 0 12 11.2Z"/></svg>
        </button>`
      : "";
    row.innerHTML = `
      <span class="pantone-quality-icon ${icon.className}" aria-label="${icon.label}">${icon.content || icon.text}</span>
      <span class="pantone-result-swatch" aria-hidden="true"></span>
      <div>
        <h3>${match.code}</h3>
        <p>${match.library.label} - ${match.hex}</p>
      </div>
      <div class="pantone-score">
        <strong>${match.quality}</strong>
        <span>Delta E ${match.deltaE.toFixed(2)}</span>
        ${previewButton}
      </div>
    `;
    pantoneResults.append(row);
  });
}

async function openPantoneModal(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return;
  pantoneTargetHex.textContent = normalized;
  setDynamicRule("#pantoneTargetSwatch", `--pantone-target-color: ${normalized};`);
  pantoneResults.innerHTML = "";
  pantoneMatchStatus.textContent = "Loading Pantone definitions";
  setPantoneModalOpen(true);
  pantoneModal.showModal();
  try {
    const definitions = await loadPantoneDefinitions();
    const matches = getPantoneMatches(definitions, normalized);
    renderPantoneResults(matches);
    pantoneMatchStatus.textContent = `${definitions.colors.length} definitions checked`;
  } catch {
    pantoneMatchStatus.textContent = "Pantone definitions could not be loaded from this page context";
  }
}

function spectrumMap(spectrumData) {
  const colors = {};
  spectrumData.forEach((scale) => {
    colors[scale.name] = {};
    scale.tokens.forEach((token) => {
      colors[scale.name][token.stop] = token.hex;
    });
  });
  return colors;
}

function formatExportLabel(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function appendCssTheme(lines, selector, roleData, spectrumData, mode) {
  const theme = themeTokens[mode];
  lines.push(`/* ==================== ${formatExportLabel(mode)} Theme ==================== */`);
  lines.push(`${selector} {`);
  if (selector === ":root") lines.push(`  color-scheme: light;`);
  if (selector === ".dark") lines.push(`  color-scheme: dark;`);
  lines.push("", "  /* Role tokens */");
  roleData.forEach((role) => lines.push(`  --${role.name}: ${role.hex};`));
  lines.push("", "  /* Spectrum tokens */");
  spectrumData.forEach((scale) => {
    lines.push("", `  /* ${formatExportLabel(scale.name)} */`);
    scale.tokens.forEach((token) => lines.push(`  --${token.name}: ${token.hex};`));
  });
  lines.push("", "  /* Semantic aliases */");
  lines.push(`  --color-primary: var(--primary);`);
  lines.push(`  --color-primary-hover: var(--primary);`);
  lines.push(`  --color-secondary: var(--secondary);`);
  lines.push(`  --color-accent: var(--accent);`);
  lines.push(`  --color-note: var(--note);`);
  lines.push(`  --color-info: var(--info);`);
  lines.push(`  --color-success: var(--success);`);
  lines.push(`  --color-warning: var(--warning);`);
  lines.push(`  --color-error: var(--error);`);
  spectrumData.forEach((scale) => lines.push(`  --color-${scale.name}: var(--${scale.name}-500);`));
  lines.push("", "  /* Surface tokens */");
  lines.push(`  --color-background: ${theme.background};`);
  lines.push(`  --color-surface: ${theme.surface};`);
  lines.push(`  --color-surface-raised: ${theme.surfaceRaised};`);
  lines.push(`  --color-border: ${theme.border};`);
  lines.push(`  --color-text: ${theme.text};`);
  lines.push(`  --color-muted: ${theme.muted};`);
  lines.push("}");
}

function buildCss(tokenSets) {
  const lines = [
    "/* Add class=\"dark\" to a parent element to load the dark token values. */",
    "/* CSS uses block comments so this export remains valid global CSS. */",
    ""
  ];
  appendCssTheme(lines, ":root", tokenSets.light.roles, tokenSets.light.spectrum, "light");
  lines.push("");
  appendCssTheme(lines, ".dark", tokenSets.dark.roles, tokenSets.dark.spectrum, "dark");
  return lines.join("\n");
}

function appendJsObjectEntries(lines, entries, indent) {
  entries.forEach(([key, value]) => lines.push(`${indent}${key}: "${value}",`));
}

function buildJs(tokenSets) {
  const lines = [
    "// ==================== Role Colors ====================",
    "export const roleColors = {"
  ];
  ["light", "dark"].forEach((mode) => {
    lines.push(`  // ${formatExportLabel(mode)} theme`);
    lines.push(`  ${mode}: {`);
    appendJsObjectEntries(lines, Object.entries(roleMap(tokenSets[mode].roles)), "    ");
    lines.push("  },");
  });
  lines.push("};", "", "// ==================== Spectrum Tokens ====================", "export const colorTokens = {");
  ["light", "dark"].forEach((mode) => {
    lines.push(`  // ${formatExportLabel(mode)} theme`);
    lines.push(`  ${mode}: {`);
    tokenSets[mode].spectrum.forEach((scale) => {
      lines.push(`    // ${formatExportLabel(scale.name)}`);
      lines.push(`    ${scale.name}: {`);
      scale.tokens.forEach((token) => lines.push(`      ${token.stop}: "${token.hex}",`));
      lines.push("    },");
    });
    lines.push("  },");
  });
  lines.push("};", "", "// ==================== Semantic Colors ====================", "export const semanticColors = {");
  ["light", "dark"].forEach((mode) => {
    const roles = roleMap(tokenSets[mode].roles);
    const theme = themeTokens[mode];
    lines.push(`  // ${formatExportLabel(mode)} theme`);
    lines.push(`  ${mode}: {`);
    ["primary", "secondary", "accent", "note", "info", "success", "warning", "error"].forEach((role) => {
      lines.push(`    ${role}: "${roles[role]}",`);
    });
    lines.push(`    background: "${theme.background}",`);
    lines.push(`    surface: "${theme.surface}",`);
    lines.push(`    border: "${theme.border}",`);
    lines.push(`    text: "${theme.text}",`);
    lines.push("  },");
  });
  lines.push("};");
  return lines.join("\n");
}

function buildFigma(tokenSets) {
  const figma = {
    $description: "Palette export organized by light and dark theme modes.",
    modes: {
      light: {
        $description: "Light theme tokens.",
        color: {
          role: {},
          spectrum: {},
          semantic: themeTokens.light
        }
      },
      dark: {
        $description: "Dark theme tokens for a parent .dark class pattern.",
        color: {
          role: {},
          spectrum: {},
          semantic: themeTokens.dark
        }
      }
    }
  };
  ["light", "dark"].forEach((mode) => {
    tokenSets[mode].roles.forEach((role) => {
      figma.modes[mode].color.role[role.name] = { value: role.hex, type: "color", description: `${formatExportLabel(mode)} ${formatExportLabel(role.name)} role` };
    });
    tokenSets[mode].spectrum.forEach((scale) => {
      figma.modes[mode].color.spectrum[scale.name] = { $description: `${formatExportLabel(mode)} ${formatExportLabel(scale.name)} scale` };
      scale.tokens.forEach((token) => {
        figma.modes[mode].color.spectrum[scale.name][token.stop] = { value: token.hex, type: "color", description: token.name };
      });
    });
  });
  return JSON.stringify(figma, null, 2);
}

function buildJson(tokenSets) {
  const tokens = {
    $description: "Production color tokens organized by mode, role, spectrum, and semantic surface values.",
    color: {
      modes: {
        light: {
          $description: "Light theme tokens.",
          role: {},
          spectrum: {},
          semantic: themeTokens.light
        },
        dark: {
          $description: "Dark theme tokens for parent .dark class usage.",
          role: {},
          spectrum: {},
          semantic: themeTokens.dark
        }
      }
    }
  };
  ["light", "dark"].forEach((mode) => {
    tokenSets[mode].roles.forEach((role) => {
      tokens.color.modes[mode].role[role.name] = {
        value: role.hex,
        type: "color",
        name: role.name,
        description: `${formatExportLabel(mode)} ${formatExportLabel(role.name)} role`
      };
    });
    tokenSets[mode].spectrum.forEach((scale) => {
      tokens.color.modes[mode].spectrum[scale.name] = { $description: `${formatExportLabel(mode)} ${formatExportLabel(scale.name)} scale` };
      scale.tokens.forEach((token) => {
        tokens.color.modes[mode].spectrum[scale.name][token.stop] = {
          value: token.hex,
          type: "color",
          name: token.name,
          description: `${formatExportLabel(scale.name)} ${token.stop}`
        };
      });
    });
  });
  return JSON.stringify(tokens, null, 2);
}

function appendScssMap(lines, name, callback) {
  lines.push(`${name}: (`);
  callback("  ");
  lines.push(") !default;");
}

function buildScss(tokenSets) {
  const lines = [
    "// Spectrum Tokens palette partial.",
    "// Import with `@use \"palette\" as *;` and include `palette-css-vars()` where variables should be emitted.",
    "",
    "// ==================== Role Tokens ===================="
  ];

  appendScssMap(lines, "$palette-roles", (indent) => {
    ["light", "dark"].forEach((mode) => {
      lines.push(`${indent}${mode}: (`);
      tokenSets[mode].roles.forEach((role) => lines.push(`${indent}  ${role.name}: ${role.hex},`));
      lines.push(`${indent}),`);
    });
  });

  lines.push("", "// ==================== Spectrum Tokens ====================");
  appendScssMap(lines, "$palette-spectrum", (indent) => {
    ["light", "dark"].forEach((mode) => {
      lines.push(`${indent}${mode}: (`);
      tokenSets[mode].spectrum.forEach((scale) => {
        lines.push(`${indent}  ${scale.name}: (`);
        scale.tokens.forEach((token) => lines.push(`${indent}    ${token.stop}: ${token.hex},`));
        lines.push(`${indent}  ),`);
      });
      lines.push(`${indent}),`);
    });
  });

  lines.push("", "// ==================== Semantic Surface Tokens ====================");
  appendScssMap(lines, "$palette-semantic", (indent) => {
    ["light", "dark"].forEach((mode) => {
      const theme = themeTokens[mode];
      lines.push(`${indent}${mode}: (`);
      lines.push(`${indent}  background: ${theme.background},`);
      lines.push(`${indent}  surface: ${theme.surface},`);
      lines.push(`${indent}  surface-raised: ${theme.surfaceRaised},`);
      lines.push(`${indent}  border: ${theme.border},`);
      lines.push(`${indent}  text: ${theme.text},`);
      lines.push(`${indent}  muted: ${theme.muted},`);
      lines.push(`${indent}  code-bg: ${theme.codeBg},`);
      lines.push(`${indent}  code-text: ${theme.codeText},`);
      lines.push(`${indent}),`);
    });
  });

  lines.push("", "// ==================== Complete Palette ====================");
  appendScssMap(lines, "$palette", (indent) => {
    lines.push(`${indent}roles: $palette-roles,`);
    lines.push(`${indent}spectrum: $palette-spectrum,`);
    lines.push(`${indent}semantic: $palette-semantic,`);
  });

  lines.push(
    "",
    "// ==================== Helpers ====================",
    "@function palette-role($name, $mode: light) {",
    "  @return map-get(map-get($palette-roles, $mode), $name);",
    "}",
    "",
    "@function palette-spectrum($scale, $stop, $mode: light) {",
    "  @return map-get(map-get(map-get($palette-spectrum, $mode), $scale), $stop);",
    "}",
    "",
    "@function palette-semantic($name, $mode: light) {",
    "  @return map-get(map-get($palette-semantic, $mode), $name);",
    "}",
    "",
    "// ==================== CSS Custom Property Output ====================",
    "@mixin palette-css-vars($mode: light) {",
    "  color-scheme: if($mode == dark, dark, light);",
    "",
    "  @each $name, $value in map-get($palette-roles, $mode) {",
    "    --#{$name}: #{$value};",
    "  }",
    "",
    "  @each $scale, $tokens in map-get($palette-spectrum, $mode) {",
    "    @each $stop, $value in $tokens {",
    "      --#{$scale}-#{$stop}: #{$value};",
    "    }",
    "  }",
    "",
    "  --color-primary: var(--primary);",
    "  --color-primary-hover: var(--primary);",
    "  --color-secondary: var(--secondary);",
    "  --color-accent: var(--accent);",
    "  --color-note: var(--note);",
    "  --color-info: var(--info);",
    "  --color-success: var(--success);",
    "  --color-warning: var(--warning);",
    "  --color-error: var(--error);"
  );
  spectrumScales.forEach((scale) => lines.push(`  --color-${scale.name}: var(--${scale.name}-500);`));
  lines.push(
    "",
    "  @each $name, $value in map-get($palette-semantic, $mode) {",
    "    --color-#{$name}: #{$value};",
    "  }",
    "}",
    "",
    ":root {",
    "  @include palette-css-vars(light);",
    "}",
    "",
    ".dark {",
    "  @include palette-css-vars(dark);",
    "}"
  );

  return lines.join("\n");
}

function buildTailwind(tokenSets) {
  const lines = [
    "// Use Tailwind's class dark mode with `darkMode: 'class'` and add class=\"dark\" on a parent.",
    "export default {",
    "  darkMode: 'class',",
    "  theme: {",
    "    extend: {",
    "      colors: {"
  ];
  ["light", "dark"].forEach((mode) => {
    lines.push(`        // ==================== ${formatExportLabel(mode)} Theme ====================`);
    lines.push(`        "${mode}": {`);
    lines.push("          // Roles");
    tokenSets[mode].roles.forEach((role) => lines.push(`          "${role.name}": "${role.hex}",`));
    lines.push("          // Spectrum");
    tokenSets[mode].spectrum.forEach((scale) => {
      lines.push(`          // ${formatExportLabel(scale.name)}`);
      lines.push(`          "${scale.name}": {`);
      scale.tokens.forEach((token) => lines.push(`            ${token.stop}: "${token.hex}",`));
      lines.push("          },");
    });
    lines.push("        },");
  });
  lines.push("      }", "    }", "  }", "};");
  return lines.join("\n");
}

async function copyText(value, event) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const previous = exportText.value;
    exportText.value = value;
    exportText.select();
    document.execCommand("copy");
    exportText.value = previous;
  }
  copyStatus.textContent = `Copied ${value}`;
  showCopiedBurst(event);
  window.setTimeout(() => {
    copyStatus.textContent = "Ready to copy";
  }, 1400);
}

function showCopiedBurst(event) {
  if (!event) return;
  const burst = document.createElement("span");
  burst.className = "copied-burst";
  burst.textContent = "Copied!";
  const burstId = nextGeneratedId("copied-burst");
  const selector = `[data-burst-id="${burstId}"]`;
  burst.dataset.burstId = burstId;
  setDynamicRule(selector, `left: ${event.clientX}px; top: ${event.clientY}px;`);
  document.body.append(burst);
  burst.addEventListener("animationend", () => {
    burst.remove();
    removeGeneratedRule(selector);
  }, { once: true });
}

function getCopyValue(target, type) {
  if (!target) return "";
  if (type === "token") return target.token;
  if (type === "hex") return target.hex;
  if (type === "var") return `var(--${target.token})`;
  if (type === "scss-var") return `$${target.token}`;
  if (type === "scss-property") return `$${target.token}: ${target.hex};`;
  return `--${target.token}: ${target.hex};`;
}

function openCopyMenu(target, anchor) {
  activeCopyTarget = target;
  activeCopyAnchor = anchor;
  const rect = anchor.getBoundingClientRect();
  copyMenu.hidden = false;
  const menuLeft = Math.min(Math.max(rect.left, 8), window.innerWidth - 190);
  const pointerLeft = Math.max(18, Math.min(rect.left + rect.width / 2 - menuLeft, 160));
  setDynamicRule("#copyMenu", `left: ${menuLeft}px; top: ${rect.bottom - 6}px; --pointer-left: ${pointerLeft}px;`);
  copyMenu.querySelector("button")?.focus();
}

function closeCopyMenu({ restoreFocus = false } = {}) {
  copyMenu.hidden = true;
  activeCopyTarget = null;
  if (restoreFocus) activeCopyAnchor?.focus();
  activeCopyAnchor = null;
}

function renderToneStrip(spectrumData) {
  toneStrip.innerHTML = "";
  spectrumData.filter((scale) => !scale.tokens.some((token) => token.name.startsWith("grey-"))).forEach((scale) => {
    const token = scale.tokens.find((item) => item.stop === 300) || scale.tokens[Math.floor(scale.tokens.length / 2)];
    const segment = document.createElement("button");
    segment.type = "button";
    const toneId = nextGeneratedId("tone");
    segment.className = "tone-strip-segment";
    segment.dataset.toneId = toneId;
    setDynamicRule(`[data-tone-id="${toneId}"]`, `--tone-color: ${token.hex};`);
    segment.setAttribute("aria-label", `Copy ${token.hex} for ${token.name}`);
    segment.addEventListener("click", (event) => copyText(token.hex, event));
    toneStrip.append(segment);
  });
}

function renderRoles(roleData) {
  roleStrip.innerHTML = "";
  roleData.forEach((role) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    const roleId = nextGeneratedId("role");
    swatch.className = "role-swatch";
    swatch.dataset.roleId = roleId;
    setDynamicRule(`[data-role-id="${roleId}"]`, `--role-color: ${role.hex}; --role-ink: ${getReadableInk(role.hex)};`);
    swatch.setAttribute("aria-label", `${formatExportLabel(role.name)} ${role.hex}. Open copy options`);
    swatch.innerHTML = `<span aria-hidden="true"></span><strong>${role.name}</strong><small>${role.hex}</small>`;
    swatch.addEventListener("click", (event) => {
      event.stopPropagation();
      openCopyMenu({ token: role.name, hex: role.hex }, swatch);
    });
    roleStrip.append(swatch);
  });
}

function renderSpectrum(spectrumData) {
  spectrumGrid.innerHTML = "";
  setDynamicRule("#spectrumGrid", `--column-count: ${depthStops[state.depth].length};`);

  spectrumData.forEach((scale) => {
    const row = document.createElement("article");
    row.className = "scale-row";

    const swatches = document.createElement("div");
    const listId = nextGeneratedId("scale-list");
    swatches.className = "swatch-list";
    swatches.dataset.listId = listId;
    setDynamicRule(`[data-list-id="${listId}"]`, `--scale-column-count: ${scale.tokens.length};`);

    scale.tokens.forEach((token) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      const swatchId = nextGeneratedId("swatch");
      swatch.className = "swatch";
      swatch.dataset.swatchId = swatchId;
      setDynamicRule(`[data-swatch-id="${swatchId}"]`, `--swatch-color: ${token.hex}; --swatch-ink: ${getReadableInk(token.hex)};`);
      swatch.setAttribute("aria-label", `${token.hex}. Open copy options for ${token.name}`);
      swatch.innerHTML = `<span>${token.hex}</span>`;
      swatch.addEventListener("click", (event) => {
        event.stopPropagation();
        openCopyMenu({ token: token.name, hex: token.hex }, swatch);
      });
      swatches.append(swatch);
    });

    row.append(swatches);
    spectrumGrid.append(row);
  });
}

function renderSavedPrimaries() {
  savedPrimarySwatches.innerHTML = "";
  state.savedPrimaries.forEach((hex) => {
    const item = document.createElement("span");
    const savedId = nextGeneratedId("saved-primary");
    item.className = "saved-primary-item";
    item.dataset.savedPrimaryId = savedId;
    setDynamicRule(`[data-saved-primary-id="${savedId}"]`, `--saved-primary-color: ${hex}; --saved-primary-ink: ${getReadableInk(hex)};`);

    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "saved-primary-swatch";
    swatch.setAttribute("aria-label", `Use saved primary color ${hex}`);
    swatch.addEventListener("click", () => setPrimaryColor(hex));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "saved-primary-remove";
    remove.textContent = "x";
    remove.setAttribute("aria-label", `Remove saved primary color ${hex}`);
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      state.savedPrimaries = state.savedPrimaries.filter((savedHex) => savedHex !== hex);
      render();
    });

    item.append(swatch, remove);
    savedPrimarySwatches.append(item);
  });
}

function getExportFileMeta(format) {
  const meta = {
    css: { filename: "spectrum-tokens.css", type: "text/css" },
    js: { filename: "spectrum-tokens.js", type: "text/javascript" },
    figma: { filename: "spectrum-tokens.figma.json", type: "application/json" },
    json: { filename: "spectrum-tokens.tokens.json", type: "application/json" },
    scss: { filename: "_palette.scss", type: "text/x-scss" },
    tailwind: { filename: "tailwind.palette.config.js", type: "text/javascript" }
  };
  return meta[format] || { filename: "spectrum-tokens.txt", type: "text/plain" };
}

function downloadExport() {
  const { filename, type } = getExportFileMeta(state.format);
  const blob = new Blob([exportText.value], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  copyStatus.textContent = `Downloaded ${filename}`;
  window.setTimeout(() => {
    copyStatus.textContent = "Ready to copy";
  }, 1800);
}

function renderExports(tokenSets) {
  const exports = {
    css: buildCss(tokenSets),
    js: buildJs(tokenSets),
    figma: buildFigma(tokenSets),
    json: buildJson(tokenSets),
    scss: buildScss(tokenSets),
    tailwind: buildTailwind(tokenSets)
  };
  const labels = {
    css: "Global CSS output",
    js: "JavaScript output",
    figma: "Figma tokens output",
    json: "Tokens JSON output",
    scss: "_palette.scss partial output",
    tailwind: "Tailwind config output"
  };
  exportLabel.textContent = labels[state.format];
  exportText.value = exports[state.format];
}

function applyThemeToPage() {
  document.documentElement.classList.toggle("dark", state.theme === "dark");
  document.documentElement.dataset.generatedPreview = state.theme;
  themeToggle.setAttribute("aria-pressed", String(state.theme === "dark"));
  themeToggleLabel.textContent = state.theme === "dark" ? "Dark" : "Light";
}

function updatePreview(roleData, spectrumData) {
  const roles = roleMap(roleData);
  const byName = Object.fromEntries(getFlatSpectrumTokens(spectrumData).map((token) => [token.name, token.hex]));
  const theme = themeTokens[state.theme];
  const previewPrimary = roles.primary || state.primary;

  setDynamicRule(
    "html[data-generated-preview]",
    [
      `--primary: ${previewPrimary}`,
      `--primary-soft: ${byName["purple-100"] || previewPrimary}`,
      `--primary-deep: ${byName["purple-600"] || previewPrimary}`,
      `--focus: ${previewPrimary}`,
      `--preview-bg: ${byName["purple-100"] || theme.surfaceRaised}`,
      `--preview-border: ${byName["purple-200"] || theme.border}`,
      `--preview-primary: ${previewPrimary}`,
      `--preview-on-primary: ${getReadableInk(previewPrimary)}`,
      `--preview-text: ${theme.text}`
    ].join("; ")
  );
}

function buildTokenSets() {
  const lightSpectrum = buildSpectrumData("light");
  const darkSpectrum = buildSpectrumData("dark");
  return {
    light: {
      roles: buildRoleData("light", lightSpectrum),
      spectrum: lightSpectrum
    },
    dark: {
      roles: buildRoleData("dark", darkSpectrum),
      spectrum: darkSpectrum
    }
  };
}

function render() {
  lightnessOutput.value = `${state.lightReach}%`;
  darknessOutput.value = `${state.darkReach}%`;
  picker.value = state.primary;
  hexInput.value = state.primary;
  hexStatus.textContent = "Valid hex color";
  hexStatus.classList.remove("error");
  applyThemeToPage();

  clearGeneratedElementRules();
  const tokenSets = buildTokenSets();
  const activeTokens = tokenSets[state.theme];
  const count = activeTokens.spectrum.reduce((total, scale) => total + scale.tokens.length, 0);
  tokenCount.textContent = `${count} ${state.theme} color tokens`;

  renderToneStrip(activeTokens.spectrum);
  renderRoles(activeTokens.roles);
  renderSpectrum(activeTokens.spectrum);
  renderSavedPrimaries();
  renderExports(tokenSets);
  updatePreview(activeTokens.roles, activeTokens.spectrum);
}

picker.addEventListener("input", (event) => {
  setPrimaryColor(event.target.value.toUpperCase());
});

hexInput.addEventListener("input", (event) => {
  const normalized = normalizeHex(event.target.value);
  if (!normalized) {
    hexStatus.textContent = "Enter a valid 3 or 6 digit hex value";
    hexStatus.classList.add("error");
    return;
  }
  setPrimaryColor(normalized);
});

addPrimaryButton.addEventListener("click", () => {
  if (!state.savedPrimaries.includes(state.primary)) {
    state.savedPrimaries = [...state.savedPrimaries, state.primary];
  }
  render();
});

lightnessRange.addEventListener("input", (event) => {
  state.lightReach = Number(event.target.value);
  render();
});

darknessRange.addEventListener("input", (event) => {
  state.darkReach = Number(event.target.value);
  render();
});

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  render();
});

document.querySelectorAll("input[name='depth']").forEach((input) => {
  input.addEventListener("change", (event) => {
    state.depth = Number(event.target.value);
    render();
  });
});

copyMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-copy]");
  if (!button) return;
  if (button.dataset.copy === "pantone") {
    openPantoneModal(activeCopyTarget?.hex || state.primary);
    closeCopyMenu();
    return;
  }
  copyText(getCopyValue(activeCopyTarget, button.dataset.copy), event);
  closeCopyMenu();
});

pantoneResults.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-primary-hex]");
  if (!button) return;
  setPrimaryColor(button.dataset.primaryHex);
  pantoneModal.close();
});

pantoneModal.addEventListener("click", (event) => {
  const rect = pantoneModal.getBoundingClientRect();
  const isOutside = event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom;
  if (isOutside) pantoneModal.close();
});

pantoneModal.addEventListener("close", () => setPantoneModalOpen(false));

document.addEventListener("click", (event) => {
  if (!copyMenu.hidden && !copyMenu.contains(event.target)) closeCopyMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCopyMenu({ restoreFocus: true });
});

copyMenu.addEventListener("keydown", (event) => {
  const items = [...copyMenu.querySelectorAll("button")];
  const currentIndex = items.indexOf(document.activeElement);
  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    event.preventDefault();
    items[(currentIndex + 1 + items.length) % items.length]?.focus();
  }
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    items[(currentIndex - 1 + items.length) % items.length]?.focus();
  }
});

window.addEventListener("scroll", closeCopyMenu, { passive: true, capture: true });
document.addEventListener("scroll", closeCopyMenu, { passive: true, capture: true });

function activateExportTab(button) {
  state.format = button.dataset.format;
  tabButtons.forEach((tab) => {
    const selected = tab === button;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  exportPanel.setAttribute("aria-labelledby", button.id);
  render();
}

tabButtons.forEach((button, index) => {
  button.tabIndex = button.getAttribute("aria-selected") === "true" ? 0 : -1;
  button.addEventListener("click", () => activateExportTab(button));
  button.addEventListener("keydown", (event) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const next = tabButtons[(index + offset + tabButtons.length) % tabButtons.length];
    next.focus();
    activateExportTab(next);
  });
});

downloadButton.addEventListener("click", downloadExport);
pantonePrimaryButton.addEventListener("click", () => openPantoneModal(state.primary));

document.querySelector("#controls").addEventListener("submit", (event) => event.preventDefault());

copyButton.addEventListener("click", async (event) => {
  try {
    await navigator.clipboard.writeText(exportText.value);
    copyStatus.textContent = "Copied";
  } catch {
    exportText.select();
    document.execCommand("copy");
    copyStatus.textContent = "Copied";
  }
  showCopiedBurst(event);
  window.setTimeout(() => {
    copyStatus.textContent = "Ready to copy";
  }, 1600);
});

render();
