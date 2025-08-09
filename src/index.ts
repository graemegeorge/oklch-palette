/**
 * Minimal OKLab/OKLCH <-> sRGB utilities and palette generator.
 * References: Björn Ottosson (OKLab).
 */

export type Mode = "light" | "dark" | "both";
export type Gamut = "srgb" | "p3";

export interface Options {
  steps?: number;
  mode?: Mode; // 'both' by default
  gamut?: Gamut; // currently informative; we always output oklch() strings
  boostLowChroma?: boolean; // default true
}

type PaletteSide = { brand: string[] };
export interface Palette {
  light?: PaletteSide;
  dark?: PaletteSide;
  meta: { hue: number };
}

export function makePalette(seed: string, opts: Options = {}): Palette {
  const steps = Math.max(2, Math.min(opts.steps ?? 12, 24));
  const mode: Mode = opts.mode ?? "both";
  const boost = opts.boostLowChroma ?? true;

  const { L, C, H } = hexToOklch(seed);
  const hue = H;

  // lightness ramps (12-step defaults), shaped with mild s-curve
  const lightL = sampleCurve(steps, 0.99, 0.25);
  const darkL = sampleCurve(steps, 0.14, 0.93);

  // chroma shaping: target around seed.C, damp near extremes
  const targetC = adjustSeedChroma(C, boost);

  const mk = (Ls: number[]) =>
    Ls.map((l, i) => {
      const edge = i === 0 || i === Ls.length - 1;
      const c = clamp(targetC * (edge ? 0.6 : 1.0), 0, 0.37); // ok-ish bounds for srgb
      const rgb = oklchToSrgb({ L: l, C: c, H: hue });
      // ensure in gamut by reducing C if needed
      let cc = c;
      let tries = 0;
      while (!inSRGB(rgb) && cc > 0 && tries < 6) {
        cc *= 0.85;
        Object.assign(rgb, oklchToSrgb({ L: l, C: cc, H: hue }));
        tries++;
      }
      const okl = { L: l, C: cc, H: hue };
      return oklchString(okl);
    });

  const pal: Palette = { meta: { hue } };
  if (mode === "light" || mode === "both") pal.light = { brand: mk(lightL) };
  if (mode === "dark" || mode === "both") pal.dark = { brand: mk(darkL) };
  return pal;
}

export function toCssVars(
  pal: Palette,
  opts: { prefix?: string; selector?: string; darkSelector?: string } = {}
): string {
  const prefix = opts.prefix ?? "brand";
  const sel = opts.selector ?? ":root";
  const darkSel = opts.darkSelector ?? ".dark";
  const lines: string[] = [];

  if (pal.light) {
    lines.push(`${sel} {`);
    pal.light.brand.forEach((v, i) =>
      lines.push(`  --${prefix}-${i + 1}: ${v};`)
    );
    lines.push(`}`);
  }
  if (pal.dark) {
    lines.push(`${darkSel} {`);
    pal.dark.brand.forEach((v, i) =>
      lines.push(`  --${prefix}-${i + 1}: ${v};`)
    );
    lines.push(`}`);
  }
  return lines.join("\n");
}

/* ---------------- Tailwind preset helpers ---------------- */

export function tailwindPreset(
  pal: Palette,
  opts: { prefix?: string } = {}
): any {
  const prefix = opts.prefix ?? "brand";
  const baseLight: Record<string, string> = {};
  const baseDark: Record<string, string> = {};
  const scale: Record<string, string> = {};
  const steps = (pal.light ?? pal.dark)!.brand.length;

  for (let i = 1; i <= steps; i++) {
    scale[String(i)] = `var(--${prefix}-${i})`;
  }
  if (pal.light) {
    for (let i = 1; i <= steps; i++)
      baseLight[`--${prefix}-${i}`] = pal.light.brand[i - 1];
  }
  if (pal.dark) {
    for (let i = 1; i <= steps; i++)
      baseDark[`--${prefix}-${i}`] = pal.dark.brand[i - 1];
  }

  return {
    theme: {
      extend: {
        colors: {
          [prefix]: scale,
        },
      },
    },
    plugins: [
      function ({ addBase }: any) {
        if (pal.light) addBase({ ":root": baseLight });
        if (pal.dark) addBase({ ".dark": baseDark });
      },
    ],
  };
}

/* ---------------- Color utilities ---------------- */

function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const { r, g, b } = hexToRgb(hex);
  const { L, a, b: bb } = srgbToOklab({ r, g, b });
  const { C, H } = abToCH(a, bb);
  return { L, C, H };
}

function oklchString(o: { L: number; C: number; H: number }): string {
  const Lpct = (o.L * 100).toFixed(1);
  const Cval = o.C.toFixed(3);
  const Hval = o.H.toFixed(1);
  return `oklch(${Lpct}% ${Cval} ${Hval})`;
}

function adjustSeedChroma(C: number, boostLow: boolean): number {
  // Modest boost for low chroma seeds (grays)
  if (boostLow && C < 0.03) return 0.06;
  if (C > 0.2) return 0.18;
  return C;
}

function sampleCurve(n: number, start: number, end: number): number[] {
  // Smoothstep-ish curve for perceptual distribution
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const s = t * t * (3 - 2 * t); // smoothstep
    arr.push(lerp(start, end, s));
  }
  return arr;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}

/* ---- OKLab/OKLCH <-> sRGB ---- */

function abToCH(a: number, b: number): { C: number; H: number } {
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { C, H };
}

function CHToab(C: number, H: number): { a: number; b: number } {
  const rad = (H * Math.PI) / 180;
  return { a: C * Math.cos(rad), b: C * Math.sin(rad) };
}

function oklabToLinearSRGB(L: number, a: number, b: number) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b2 = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return { r, g, b: b2 };
}

function linearToSrgbChannel(x: number) {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

function srgbToLinearChannel(x: number) {
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function linearSRGBToOklab(r: number, g: number, b: number) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return { L, a, b: b2 };
}

function oklchToSrgb(o: { L: number; C: number; H: number }) {
  const { a, b } = CHToab(o.C, o.H);
  const lin = oklabToLinearSRGB(o.L, a, b);
  return {
    r: linearToSrgbChannel(lin.r),
    g: linearToSrgbChannel(lin.g),
    b: linearToSrgbChannel(lin.b),
  };
}

function srgbToOklab(rgb: { r: number; g: number; b: number }) {
  const r = srgbToLinearChannel(rgb.r);
  const g = srgbToLinearChannel(rgb.g);
  const b = srgbToLinearChannel(rgb.b);
  return linearSRGBToOklab(r, g, b);
}

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{3,8})$/i.exec(hex.trim());
  if (!m) throw new Error("Invalid hex");
  let s = m[1];
  if (s.length === 3)
    s = s
      .split("")
      .map((c) => c + c)
      .join("");
  if (s.length === 6) s += "ff";
  const num = BigInt("0x" + s);
  const r = Number((num >> 24n) & 255n) / 255;
  const g = Number((num >> 16n) & 255n) / 255;
  const b = Number((num >> 8n) & 255n) / 255;
  return { r, g, b };
}

function inSRGB(rgb: { r: number; g: number; b: number }) {
  return (
    rgb.r >= 0 &&
    rgb.r <= 1 &&
    rgb.g >= 0 &&
    rgb.g <= 1 &&
    rgb.b >= 0 &&
    rgb.b <= 1
  );
}
