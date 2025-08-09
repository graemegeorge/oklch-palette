import type { Palette } from "../index.js";

export function tailwindPreset(pal: Palette, opts: { prefix?: string } = {}) {
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

export default tailwindPreset;
