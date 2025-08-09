import { describe, it, expect } from "vitest";
import { makePalette, toCssVars } from "../src/index";

describe("oklch-palette", () => {
  it("makes a 12-step palette by default", () => {
    const pal = makePalette("#6753ff");
    expect(pal.light?.brand).toHaveLength(12);
    expect(pal.dark?.brand).toHaveLength(12);
  });
  it("emits css variables", () => {
    const pal = makePalette("#6753ff");
    const css = toCssVars(pal, { prefix: "brand" });
    expect(css).toContain("--brand-1");
    expect(css).toContain(":root");
    expect(css).toContain(".dark");
  });
});
