const state = {
  primary: "#3B82F6",
  lightReach: 96,
  darkReach: 24,
  depth: 8,
  format: "css"
};

const scales = [
  { name: "primary", hueOffset: 0, saturationOffset: 0 },
  { name: "secondary", hueOffset: 36, saturationOffset: -4 },
  { name: "accent", hueOffset: -42, saturationOffset: 5 },
  { name: "info", hueOffset: 18, saturationOffset: -2 },
  { name: "success", hueOffset: 132, saturationOffset: -8 },
  { name: "warning", hueOffset: 184, saturationOffset: 1 },
  { name: "danger", hueOffset: -152, saturationOffset: 2 },
  { name: "grey", hueOffset: 0, saturationOffset: -78, neutral: true }
];

const depthStops = {
  7: [50, 100, 200, 300, 400, 500, 600],
  8: [50, 100, 200, 300, 400, 500, 600, 700],
  10: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
};

const picker = document.querySelector("#colorPicker");
const hexInput = document.querySelector("#hexInput");
const hexStatus = document.querySelector("#hexStatus");
const lightnessRange = document.querySelector("#lightnessRange");
const darknessRange = document.querySelector("#darknessRange");
const lightnessOutput = document.querySelector("#lightnessOutput");
const darknessOutput = document.querySelector("#darknessOutput");
const spectrumGrid = document.querySelector("#spectrumGrid");
const exportLabel = document.querySelector("#exportLabel");
const exportText = document.querySelector("#exportText");
const copyButton = document.querySelector("#copyButton");
const copyStatus = document.querySelector("#copyStatus");
const tokenCount = document.querySelector("#tokenCount");
const tabButtons = [...document.querySelectorAll(".tab-button")];

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

function getReadableInk(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#111827" : "#FFFFFF";
}

function mixLightness(index, total, lightReach, darkReach) {
  if (total === 1) return 50;
  const ratio = index / (total - 1);
  return lightReach + (darkReach - lightReach) * ratio;
}

function buildTokenData() {
  const primaryHsl = rgbToHsl(hexToRgb(state.primary));
  const stops = depthStops[state.depth];

  return scales.map((scale) => {
    const baseSaturation = scale.neutral
      ? clamp(primaryHsl.s * 0.08, 4, 14)
      : clamp(primaryHsl.s + scale.saturationOffset, 42, 94);
    const baseHue = (primaryHsl.h + scale.hueOffset + 360) % 360;
    const tokens = stops.map((stop, index) => {
      const lightness = mixLightness(index, stops.length, state.lightReach, state.darkReach);
      const saturation = scale.neutral
        ? clamp(baseSaturation - index * 0.22, 3, 14)
        : clamp(baseSaturation - Math.max(0, index - 4) * 2.4, 34, 94);
      const hex = rgbToHex(hslToRgb({ h: baseHue, s: saturation, l: lightness }));
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

function toCamelCase(tokenName) {
  return tokenName.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase());
}

function getFlatTokens(data) {
  return data.flatMap((scale) => scale.tokens.map((token) => ({ ...token, scale: scale.name })));
}

function buildCss(data) {
  const lines = [":root {", "  /* Primitive color tokens */"];
  data.forEach((scale) => {
    lines.push(`  /* ${scale.name} */`);
    scale.tokens.forEach((token) => lines.push(`  --${token.name}: ${token.hex};`));
  });
  lines.push("", "  /* Semantic aliases */");
  lines.push("  --color-primary: var(--primary-500);");
  lines.push("  --color-primary-hover: var(--primary-600);");
  lines.push("  --color-primary-subtle: var(--primary-100);");
  lines.push("  --color-secondary: var(--secondary-500);");
  lines.push("  --color-accent: var(--accent-500);");
  lines.push("  --color-info: var(--info-500);");
  lines.push("  --color-success: var(--success-500);");
  lines.push("  --color-warning: var(--warning-500);");
  lines.push("  --color-danger: var(--danger-500);");
  lines.push("  --color-background: var(--grey-50);");
  lines.push("  --color-surface: #ffffff;");
  lines.push("  --color-border: var(--grey-200);");
  lines.push("  --color-text: var(--grey-700);");
  lines.push("}");
  return lines.join("\n");
}

function buildJs(data) {
  const payload = {};
  data.forEach((scale) => {
    payload[scale.name] = {};
    scale.tokens.forEach((token) => {
      payload[scale.name][token.stop] = token.hex;
    });
  });
  return `export const colorTokens = ${JSON.stringify(payload, null, 2)};\n\nexport const semanticColors = {\n  primary: colorTokens.primary[500],\n  primaryHover: colorTokens.primary[600],\n  primarySubtle: colorTokens.primary[100],\n  secondary: colorTokens.secondary[500],\n  accent: colorTokens.accent[500],\n  info: colorTokens.info[500],\n  success: colorTokens.success[500],\n  warning: colorTokens.warning[500],\n  danger: colorTokens.danger[500],\n  background: colorTokens.grey[50],\n  border: colorTokens.grey[200],\n  text: colorTokens.grey[700]\n};`;
}

function buildFigma(data) {
  const figma = {
    color: {}
  };
  data.forEach((scale) => {
    figma.color[scale.name] = {};
    scale.tokens.forEach((token) => {
      figma.color[scale.name][token.stop] = {
        value: token.hex,
        type: "color"
      };
    });
  });
  return JSON.stringify(figma, null, 2);
}

function buildJson(data) {
  const tokens = {
    color: {}
  };
  data.forEach((scale) => {
    tokens.color[scale.name] = {};
    scale.tokens.forEach((token) => {
      tokens.color[scale.name][token.stop] = {
        value: token.hex,
        type: "color",
        name: token.name
      };
    });
  });
  tokens.color.semantic = {
    primary: { value: "{color.primary.500}", type: "color" },
    primaryHover: { value: "{color.primary.600}", type: "color" },
    surface: { value: "#ffffff", type: "color" },
    text: { value: "{color.grey.700}", type: "color" },
    border: { value: "{color.grey.200}", type: "color" }
  };
  return JSON.stringify(tokens, null, 2);
}

function buildTailwind(data) {
  const lines = ["export default {", "  theme: {", "    extend: {", "      colors: {"];
  data.forEach((scale) => {
    lines.push(`        ${scale.name}: {`);
    scale.tokens.forEach((token) => lines.push(`          ${token.stop}: "${token.hex}",`));
    lines.push("        },");
  });
  lines.push("      }", "    }", "  }", "};");
  return lines.join("\n");
}

function renderSpectrum(data) {
  spectrumGrid.innerHTML = "";
  spectrumGrid.style.setProperty("--column-count", depthStops[state.depth].length);

  data.forEach((scale) => {
    const row = document.createElement("article");
    row.className = "scale-row";

    const name = document.createElement("div");
    name.className = "scale-name";
    name.innerHTML = `<strong>${scale.name}</strong><span>${scale.tokens[0].name}...</span>`;

    const swatches = document.createElement("div");
    swatches.className = "swatch-list";

    scale.tokens.forEach((token) => {
      const swatch = document.createElement("div");
      swatch.className = "swatch";
      swatch.style.setProperty("--swatch-color", token.hex);
      swatch.style.setProperty("--swatch-ink", getReadableInk(token.hex));
      swatch.innerHTML = `<strong>${token.name}</strong><span>${token.hex}</span>`;
      swatches.append(swatch);
    });

    row.append(name, swatches);
    spectrumGrid.append(row);
  });
}

function renderExports(data) {
  const exports = {
    css: buildCss(data),
    js: buildJs(data),
    figma: buildFigma(data),
    json: buildJson(data),
    tailwind: buildTailwind(data)
  };
  const labels = {
    css: "Global CSS output",
    js: "JavaScript output",
    figma: "Figma tokens output",
    json: "Tokens JSON output",
    tailwind: "Tailwind config output"
  };
  exportLabel.textContent = labels[state.format];
  exportText.value = exports[state.format];
}

function updatePreview(data) {
  const root = document.documentElement;
  const byName = Object.fromEntries(getFlatTokens(data).map((token) => [token.name, token.hex]));
  root.style.setProperty("--primary", byName["primary-500"]);
  root.style.setProperty("--primary-soft", byName["primary-100"]);
  root.style.setProperty("--primary-deep", byName["primary-700"] || byName["primary-600"]);
  root.style.setProperty("--focus", byName["primary-500"]);
  root.style.setProperty("--preview-bg", byName["primary-50"]);
  root.style.setProperty("--preview-border", byName["primary-200"]);
  root.style.setProperty("--preview-primary", byName["primary-600"] || byName["primary-500"]);
  root.style.setProperty("--preview-on-primary", getReadableInk(byName["primary-600"] || byName["primary-500"]));
  root.style.setProperty("--preview-text", byName["grey-700"] || "#172033");
}

function render() {
  lightnessOutput.value = `${state.lightReach}%`;
  darknessOutput.value = `${state.darkReach}%`;
  picker.value = state.primary;
  hexInput.value = state.primary;
  hexStatus.textContent = "Valid hex color";
  hexStatus.classList.remove("error");

  const data = buildTokenData();
  const count = data.reduce((total, scale) => total + scale.tokens.length, 0);
  tokenCount.textContent = `${count} tokens`;

  renderSpectrum(data);
  renderExports(data);
  updatePreview(data);
}

picker.addEventListener("input", (event) => {
  state.primary = event.target.value.toUpperCase();
  render();
});

hexInput.addEventListener("input", (event) => {
  const normalized = normalizeHex(event.target.value);
  if (!normalized) {
    hexStatus.textContent = "Enter a valid 3 or 6 digit hex value";
    hexStatus.classList.add("error");
    return;
  }
  state.primary = normalized;
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

document.querySelectorAll("input[name='depth']").forEach((input) => {
  input.addEventListener("change", (event) => {
    state.depth = Number(event.target.value);
    render();
  });
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.format = button.dataset.format;
    tabButtons.forEach((tab) => tab.setAttribute("aria-selected", String(tab === button)));
    render();
  });
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(exportText.value);
    copyStatus.textContent = "Copied";
  } catch {
    exportText.select();
    document.execCommand("copy");
    copyStatus.textContent = "Copied";
  }
  window.setTimeout(() => {
    copyStatus.textContent = "Ready to copy";
  }, 1600);
});

render();
