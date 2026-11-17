"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "../ActionForm";
import { LangFields } from "../LangFields";
import { uploadMedia } from "./actions";

const RATIOS = [
  { id: "original", name: "Zoals de foto is", ratio: 0 },
  { id: "4:3", name: "Liggend 4:3", ratio: 4 / 3 },
  { id: "16:9", name: "Breed 16:9", ratio: 16 / 9 },
  { id: "1:1", name: "Vierkant", ratio: 1 },
];
const MAX_SIDE = 2000;

/**
 * Pick a photo, crop it (shape plus position), and upload a resized WebP.
 * The cropping happens in the browser, so big phone photos stay small.
 */
export function Uploader() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ratio, setRatio] = useState("4:3");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function area(img: HTMLImageElement) {
    const r = RATIOS.find((o) => o.id === ratio)?.ratio || img.naturalWidth / img.naturalHeight;
    let w = img.naturalWidth;
    let h = w / r;
    if (h > img.naturalHeight) {
      h = img.naturalHeight;
      w = h * r;
    }
    return { sx: ((img.naturalWidth - w) * x) / 100, sy: ((img.naturalHeight - h) * y) / 100, w, h };
  }

  useEffect(() => {
    const c = canvas.current;
    if (!c || !image) return;
    const a = area(image);
    c.width = 480;
    c.height = Math.round((480 * a.h) / a.w);
    c.getContext("2d")?.drawImage(image, a.sx, a.sy, a.w, a.h, 0, 0, c.width, c.height);
  });

  async function crop(): Promise<{ file: Blob; width: number; height: number } | null> {
    if (!image) return null;
    const a = area(image);
    const scale = Math.min(1, MAX_SIDE / Math.max(a.w, a.h));
    const out = document.createElement("canvas");
    out.width = Math.round(a.w * scale);
    out.height = Math.round(a.h * scale);
    out.getContext("2d")?.drawImage(image, a.sx, a.sy, a.w, a.h, 0, 0, out.width, out.height);
    const file = await new Promise<Blob | null>((ok) => out.toBlob(ok, "image/webp", 0.85));
    return file ? { file, width: out.width, height: out.height } : null;
  }

  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const blob = await crop();
    if (!blob) return { error: "Kies eerst een foto." };
    form.set("file", blob.file, "foto.webp");
    form.set("width", String(blob.width));
    form.set("height", String(blob.height));
    const result = await uploadMedia(prev, form);
    if (result.ok) {
      setImage(null);
      if (fileInput.current) fileInput.current.value = "";
    }
    return result;
  }, {});

  return (
    <form action={action} className="admin-form">
      <div className="admin-field">
        <label htmlFor="photo">Foto kiezen</label>
        <input
          ref={fileInput}
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return setImage(null);
            const img = new Image();
            img.onload = () => setImage(img);
            img.src = URL.createObjectURL(f);
          }}
        />
      </div>

      {image && (
        <fieldset className="admin-lang">
          <legend>Bijsnijden</legend>
          <div className="admin-fields">
            <div className="admin-field">
              <label htmlFor="ratio">Vorm</label>
              <select id="ratio" value={ratio} onChange={(e) => setRatio(e.target.value)}>
                {RATIOS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="crop-x">Links ↔ rechts</label>
              <input id="crop-x" type="range" min={0} max={100} value={x} onChange={(e) => setX(Number(e.target.value))} />
            </div>
            <div className="admin-field">
              <label htmlFor="crop-y">Boven ↕ onder</label>
              <input id="crop-y" type="range" min={0} max={100} value={y} onChange={(e) => setY(Number(e.target.value))} />
            </div>
          </div>
          <canvas ref={canvas} className="admin-crop" aria-label="Voorbeeld van de bijgesneden foto" role="img" />
        </fieldset>
      )}

      <LangFields
        name="alt"
        label="Wat staat er op de foto? (alt-tekst)"
        maxLength={300}
        hint="Voor wie de foto niet kan zien, bijv. 'Twee kinderen voeren de kippen bij het hok'. Niet: 'foto1.jpg'."
      />
      <div>
        <button type="submit" className="btn btn-primary admin-btn-small" disabled={pending}>
          {pending ? "Bezig…" : "Uploaden"}
        </button>
      </div>
      <span aria-live="polite" className="admin-result">
        {state.ok && <span className="admin-ok">{state.ok}</span>}
        {state.error && <span className="admin-error">{state.error}</span>}
      </span>
    </form>
  );
}
