import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { makePalette, toCssVars } from "oklch-palette";

function Swatches({ css }: { css: string }) {
  const style = useMemo(() => css, [css]);
  return <style dangerouslySetInnerHTML={{ __html: style }} />;
}

function Row({ title, varPrefix }: { title: string; varPrefix: string }) {
  return (
    <div className="row">
      <div className="dim">{title}</div>
      <div className="grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="sw"
            style={{ background: `var(--${varPrefix}-${i + 1})` }}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [seed, setSeed] = useState("#6753ff");
  const pal = useMemo(() => makePalette(seed), [seed]);
  const css = useMemo(() => toCssVars(pal, { prefix: "brand" }), [pal]);

  return (
    <div>
      <div className="controls">
        <input value={seed} onChange={(e) => setSeed(e.target.value)} />
        <button
          onClick={() =>
            setSeed(
              "#" +
                Math.floor(Math.random() * 16777215)
                  .toString(16)
                  .padStart(6, "0")
            )
          }
        >
          Random
        </button>
        <button onClick={() => document.body.classList.toggle("dark")}>
          Toggle .dark
        </button>
      </div>
      <Swatches css={css} />
      <Row title="Brand (light)" varPrefix="brand" />
      <div className="dim">Toggle .dark to see dark vars</div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
