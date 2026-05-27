const state = {
  primary: "#3B82F6",
  lightReach: 96,
  darkReach: 24,
  depth: 8,
  format: "css"
};

const roleScales = [
  { name: "primary", hueOffset: 0, saturationOffset: 0 },
  { name: "secondary", hueOffset: 36, saturationOffset: -4 },
  { name: "accent", hueOffset: -42, saturationOffset: 5 },
  { name: "info", hueOffset: 18, saturationOffset: -2 }
];

const spectrumScales = [
  { name: "yellow", hue: 60 },
  { name: "orange", hue: 32 },
  { name: "red", hue: 0 },
  { name: "magenta", hue: 300 },
  { name: "blue-violet", hue: 258 },
  { name: "indigo", hue: 230 },
  { name: "cyan", hue: 190 },
  { name: "green", hue: 128 }
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
const roleStrip = document.querySelector("#roleStrip");
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

function buildRoleData() {
  const primaryHsl = rgbToHsl(hexToRgb(state.primary));
  return roleScales.map((role) => {
    const hue = (primaryHsl.h + role.hueOffset + 360) % 360;
    const saturation = clamp(primaryHsl.s + role.saturationOffset, 42, 94);
    const lightness = clamp(primaryHsl.l, state.darkReach, state.lightReach);
    const hex = rgbToHex(hslToRgb({ h: hue, s: saturation, l: lightness }));
    return {
      name: role.name,
      hex
    };
  });
}

function buildSpectrumData() {
  const primaryHsl = rgbToHsl(hexToRgb(state.primary));
  const stops = depthStops[state.depth];
  const baseSaturation = clamp(primaryHsl.s, 42, 94);

  return spectrumScales.map((scale) => {
    const tokens = stops.map((stop, index) => {
      const lightness = mixLightness(index, stops.length, state.lightReach, state.darkReach);
      const saturation = clamp(baseSaturation - Math.max(0, index - 4) * 2.4, 34, 94);
      const hex = rgbToHex(hslToRgb({ h: scale.hue, s: saturation, l: lightness }));
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

function roleReference(roleData, name, fallback) {
  return roleData.some((role) => role.name === name) ? `var(--${name})` : fallback;
}

function buildCss(roleData, spectrumData) {
  const lines = [":root {", "  /* Role color tokens */"];
  roleData.forEach((role) => lines.push(`  --${role.name}: ${role.hex};`));
  lines.push("", "  /* Primitive color tokens */");
  spectrumData.forEach((scale) => {
    lines.push(`  /* ${scale.name} */`);
    scale.tokens.forEach((token) => lines.push(`  --${token.name}: ${token.hex};`));
  });
  lines.push("", "  /* Semantic aliases */");
  lines.push(`  --color-primary: ${roleReference(roleData, "primary", state.primary)};`);
  lines.push(`  --color-primary-hover: ${roleReference(roleData, "primary", state.primary)};`);
  lines.push(`  --color-secondary: ${roleReference(roleData, "secondary", "var(--cyan-500)")};`);
  lines.push(`  --color-accent: ${roleReference(roleData, "accent", "var(--magenta-500)")};`);
  lines.push(`  --color-info: ${roleReference(roleData, "info", "var(--blue-violet-500)")};`);
  spectrumData.forEach((scale) => lines.push(`  --color-${scale.name}: var(--${scale.name}-500);`));
  lines.push("  --color-background: #f8fafc;");
  lines.push("  --color-surface: #ffffff;");
  lines.push("  --color-border: #d8e0ea;");
  lines.push("  --color-text: #344153;");
  lines.push("}");
  return lines.join("\n");
}

function buildJs(roleData, spectrumData) {
  const colors = {};
  spectrumData.forEach((scale) => {
    colors[scale.name] = {};
    scale.tokens.forEach((token) => {
      colors[scale.name][token.stop] = token.hex;
    });
  });
  const roles = Object.fromEntries(roleData.map((role) => [role.name, role.hex]));
  return `export const roleColors = ${JSON.stringify(roles, null, 2)};\n\nexport const colorTokens = ${JSON.stringify(colors, null, 2)};\n\nexport const semanticColors = {\n  primary: roleColors.primary,\n  primaryHover: roleColors.primary,\n  secondary: roleColors.secondary,\n  accent: roleColors.accent,\n  info: roleColors.info,\n  background: \"#f8fafc\",\n  border: \"#d8e0ea\",\n  text: \"#344153\"\n};`;
}

function buildFigma(roleData, spectrumData) {
  const figma = {
    color: {
      role: {},
      spectrum: {}
    }
  };
  roleData.forEach((role) => {
    figma.color.role[role.name] = {
      value: role.hex,
      type: "color"
    };
  });
  spectrumData.forEach((scale) => {
    figma.color.spectrum[scale.name] = {};
    scale.tokens.forEach((token) => {
      figma.color.spectrum[scale.name][token.stop] = {
        value: token.hex,
        type: "color"
      };
    });
  });
  return JSON.stringify(figma, null, 2);
}

function buildJson(roleData, spectrumData) {
  const tokens = {
    color: {
      role: {},
      spectrum: {},
      semantic: {}
    }
  };
  roleData.forEach((role) => {
    tokens.color.role[role.name] = {
      value: role.hex,
      type: "color",
      name: role.name
    };
  });
  spectrumData.forEach((scale) => {
    tokens.color.spectrum[scale.name] = {};
    scale.tokens.forEach((token) => {
      tokens.color.spectrum[scale.name][token.stop] = {
        value: token.hex,
        type: "color",
        name: token.name
      };
    });
  });
  tokens.color.semantic = {
    primary: { value: "{color.role.primary}", type: "color" },
    secondary: { value: "{color.role.secondary}", type: "color" },
    accent: { value: "{color.role.accent}", type: "color" },
    info: { value: "{color.role.info}", type: "color" },
    surface: { value: "#ffffff", type: "color" },
    text: { value: "#344153", type: "color" },
    border: { value: "#d8e0ea", type: "color" }
  };
  return JSON.stringify(tokens, null, 2);
}

function buildTailwind(roleData, spectrumData) {
  const lines = ["export default {", "  theme: {", "    extend: {", "      colors: {"];
  roleData.forEach((role) => lines.push(`        "${role.name}": "${role.hex}",`));
  spectrumData.forEach((scale) => {
    lines.push(`        "${scale.name}": {`);
    scale.tokens.forEach((token) => lines.push(`          ${token.stop}: "${token.hex}",`));
    lines.push("        },");
  });
  lines.push("      }", "    }", "  }", "};");
  return lines.join("\n");
}

function renderRoles(roleData) {
  roleStrip.innerHTML = "";
  roleData.forEach((role) => {
    const swatch = document.createElement("div");
    swatch.className = "role-swatch";
    swatch.style.setProperty("--role-color", role.hex);
    swatch.style.setProperty("--role-ink", getReadableInk(role.hex));
    swatch.innerHTML = `<span aria-hidden="true"></span><strong>${role.name}</strong><small>${role.hex}</small>`;
    roleStrip.append(swatch);
  });
}

function renderSpectrum(spectrumData) {
  spectrumGrid.innerHTML = "";
  spectrumGrid.style.setProperty("--column-count", depthStops[state.depth].length);

  spectrumData.forEach((scale) => {
    const row = document.createElement("article");
    row.className = "scale-row";

    const name = document.createElement("div");
    name.className = "scale-name";
    name.innerHTML = `<strong>${scale.name}</strong><span>${scale.tokens[0].name}...</span>`;

    const swatches = document.createElement("div");
    swatches.className = "swatch-list";
    swatches.style.setProperty("--scale-column-count", scale.tokens.length);

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

function renderExports(roleData, spectrumData) {
  const exports = {
    css: buildCss(roleData, spectrumData),
    js: buildJs(roleData, spectrumData),
    figma: buildFigma(roleData, spectrumData),
    json: buildJson(roleData, spectrumData),
    tailwind: buildTailwind(roleData, spectrumData)
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

function updatePreview(roleData, spectrumData) {
  const root = document.documentElement;
  const roles = Object.fromEntries(roleData.map((role) => [role.name, role.hex]));
  const byName = Object.fromEntries(getFlatSpectrumTokens(spectrumData).map((token) => [token.name, token.hex]));
  const previewPrimary = roles.primary || state.primary;

  root.style.setProperty("--primary", previewPrimary);
  root.style.setProperty("--primary-soft", byName["blue-violet-100"] || previewPrimary);
  root.style.setProperty("--primary-deep", byName["blue-violet-600"] || previewPrimary);
  root.style.setProperty("--focus", previewPrimary);
  root.style.setProperty("--preview-bg", byName["blue-violet-100"] || previewPrimary);
  root.style.setProperty("--preview-border", byName["blue-violet-200"] || previewPrimary);
  root.style.setProperty("--preview-primary", previewPrimary);
  root.style.setProperty("--preview-on-primary", getReadableInk(previewPrimary));
  root.style.setProperty("--preview-text", "#172033");
}

function render() {
  lightnessOutput.value = `${state.lightReach}%`;
  darknessOutput.value = `${state.darkReach}%`;
  picker.value = state.primary;
  hexInput.value = state.primary;
  hexStatus.textContent = "Valid hex color";
  hexStatus.classList.remove("error");

  const roleData = buildRoleData();
  const spectrumData = buildSpectrumData();
  const count = spectrumData.reduce((total, scale) => total + scale.tokens.length, 0);
  tokenCount.textContent = `${count} color tokens`;

  renderRoles(roleData);
  renderSpectrum(spectrumData);
  renderExports(roleData, spectrumData);
  updatePreview(roleData, spectrumData);
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
