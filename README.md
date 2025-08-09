# oklch-palette

> Generate 12-step **OKLCH** palettes from a seed color. Export CSS variables and a Tailwind preset with accessible scales.

OKLCH is perceptually uniform, so equal steps look even. This package creates predictable scales for **light** and **dark** themes and emits CSS vars (and a Tailwind preset) you can drop in.

---

## Install

```bash
npm i oklch-palette
# (optional) Tailwind preset: peer dep tailwindcss >= 3.4
```

---

## Usage (library)

```ts
import { makePalette, toCssVars } from "oklch-palette";

const pal = makePalette("#6753ff"); // defaults: steps=12, both themes, srgb
console.log(pal.light.brand[9]); // -> "oklch(54.2% 0.14 274)"
console.log(pal.dark.brand[9]); // -> "oklch(63.0% 0.11 274)"

// CSS string (root + dark)
const css = toCssVars(pal, { prefix: "brand" });
// write to a file or inject
```

### Usage (Tailwind preset)

```js
// tailwind.config.js (or .ts)
import { tailwindPreset } from "oklch-palette/tailwind";
import { makePalette } from "oklch-palette";

const brand = makePalette("#6753ff");

export default {
  presets: [tailwindPreset(brand, { prefix: "brand" })],
};
```

Now you can use utilities like:

```html
<button class="bg-brand-9 hover:bg-brand-10 text-brand-1">Buy</button>
```

---

## API

```ts
type Mode = "light" | "dark" | "both";
type Gamut = "srgb" | "p3";

interface Options {
  steps?: number; // default 12
  mode?: Mode; // default 'both'
  gamut?: Gamut; // default 'srgb' (outputs oklch() always; P3 only affects fallback strategy)
  boostLowChroma?: boolean; // default true, slightly increase C for grayish seeds
}

export function makePalette(
  seed: string,
  opts?: Options
): {
  light?: { brand: string[] }; // index 0..11
  dark?: { brand: string[] };
  meta: { hue: number };
};

export function toCssVars(
  pal: ReturnType<typeof makePalette>,
  opts?: {
    prefix?: string; // default 'brand'
    selector?: string; // default ':root'
    darkSelector?: string; // default '.dark'
  }
): string;

export function tailwindPreset(
  pal: ReturnType<typeof makePalette>,
  opts?: {
    prefix?: string; // default 'brand'
  }
): any;
```

---

## How it works (short)

- Converts the seed color to **OKLCH(L, C, H)**.
- Keeps **H** almost fixed.
- Creates **12 steps** by mapping **L** along a smooth curve:
  - light: ~99 → ~25
  - dark: ~14 → ~93
- Adapts **C** (chroma) to avoid neon in highlights and dull midtones:
  - boosts very low-chroma seeds slightly
  - trims C near the extremes
- Clamps into sRGB range for safety (still emits `oklch()` strings).

---

## Example app

```bash
npm run dev  # opens http://localhost:5175
```

Pick a seed color and see both themes + Tailwind utilities.

---

## License

MIT
