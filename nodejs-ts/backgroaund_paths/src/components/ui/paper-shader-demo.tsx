"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Activity, Check, Copy, Gauge, Layers3 } from "lucide-react";
import { EnergyRing, ShaderPlane } from "@/components/ui/background-paper-shaders";
import { type ActiveShaderEffect, useShaderDemoStore } from "@/stores/shader-demo-store";

const effectOptions: { value: ActiveShaderEffect; label: string }[] = [
  { value: "mesh", label: "Mesh" },
  { value: "dots", label: "Dots" },
  { value: "combined", label: "Combined" },
];

const images = [
  {
    src: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
    alt: "Colorful neon lights in dark environment",
  },
  {
    src: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80",
    alt: "Star field over a dark sky",
  },
];

function ShaderScene({
  activeEffect,
  intensity,
  speed,
}: {
  activeEffect: ActiveShaderEffect;
  intensity: number;
  speed: number;
}) {
  const ringCount = Math.max(3, Math.round(3 + intensity * 2));
  const isMeshEnabled = activeEffect === "mesh" || activeEffect === "combined";
  const isDotEnabled = activeEffect === "dots" || activeEffect === "combined";

  return (
    <>
      {isMeshEnabled && (
        <ShaderPlane
          position={[0, 0, -0.2]}
          color1="#ff5722"
          color2="#ffffff"
          intensity={intensity}
          speed={speed}
        />
      )}

      {isDotEnabled &&
        Array.from({ length: ringCount }, (_, index) => (
          <EnergyRing
            key={`ring-${index}`}
            radius={0.45 + index * 0.15}
            position={[0, 0, -0.1 - index * 0.015]}
            speed={speed * (1 + index * 0.08)}
            color={index % 2 === 0 ? "#ff5722" : "#ffffff"}
          />
        ))}
    </>
  );
}

export default function PaperShaderDemo() {
  const [copied, setCopied] = useState(false);
  const {
    intensity,
    speed,
    activeEffect,
    isInteracting,
    setIntensity,
    setSpeed,
    setIsInteracting,
    setActiveEffect,
    reset,
  } = useShaderDemoStore();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText("pnpm i three @react-three/fiber zustand");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <section className="relative mx-auto mt-8 w-full overflow-hidden rounded-2xl border border-white/20 bg-black text-white shadow-2xl min-h-[60vh] md:h-screen">
      <Canvas className="absolute inset-0 h-full w-full" camera={{ position: [0, 0, 3.2], fov: 45 }}>
        <ambientLight intensity={0.55} />
        <pointLight position={[2, 2, 2]} intensity={1} />
        <pointLight position={[-2, -1, 2]} intensity={0.35} color="#ff5722" />
        <ShaderScene activeEffect={activeEffect} intensity={intensity} speed={speed} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/3 top-1/4 h-32 w-32 rounded-full bg-gray-800/5 blur-3xl animate-pulse"
          style={{ animationDuration: `${3 / speed}s` }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 h-24 w-24 rounded-full bg-white/10 blur-2xl animate-pulse"
          style={{ animationDuration: `${2 / speed}s`, animationDelay: "1s" }}
        />
        <div
          className="absolute right-1/3 top-1/2 h-20 w-20 rounded-full bg-gray-900/30 blur-xl animate-pulse"
          style={{ animationDuration: `${4 / speed}s`, animationDelay: "0.5s" }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-8">
        <div className="pointer-events-auto flex items-center justify-between gap-4 rounded-xl border border-white/15 bg-black/60 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-300" aria-hidden />
            <span className="text-sm font-medium">Paper Shader Demo</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-1 text-xs transition hover:bg-white/10"
            title="Copy install command"
            aria-label="Copy install command"
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy install"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <div className="pointer-events-auto rounded-xl border border-white/15 bg-black/60 p-4 backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-xs text-white/70">
              <Layers3 className="h-4 w-4" aria-hidden />
              Effect
            </div>
            <div className="flex flex-wrap gap-2">
              {effectOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveEffect(option.value)}
                  className={`rounded-md px-3 py-1.5 text-xs transition ${
                    activeEffect === option.value
                      ? "bg-orange-400 text-black"
                      : "border border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pointer-events-auto rounded-xl border border-white/15 bg-black/60 p-4 backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-xs text-white/70">
              <Gauge className="h-4 w-4" aria-hidden />
              Intensity {intensity.toFixed(1)}
            </div>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.1}
              value={intensity}
              onChange={(event) => setIntensity(Number(event.currentTarget.value))}
              onPointerDown={() => setIsInteracting(true)}
              onPointerUp={() => setIsInteracting(false)}
              className="w-40 accent-orange-400"
              aria-label="Intensity"
            />
          </div>

          <div className="pointer-events-auto rounded-xl border border-white/15 bg-black/60 p-4 backdrop-blur">
            <div className="mb-2 text-xs text-white/70">Speed {speed.toFixed(1)}</div>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.1}
              value={speed}
              onChange={(event) => setSpeed(Number(event.currentTarget.value))}
              onPointerDown={() => setIsInteracting(true)}
              onPointerUp={() => setIsInteracting(false)}
              className="w-40 accent-orange-400"
              aria-label="Speed"
            />
            <div className="mt-3 flex items-center justify-between text-xs text-white/70">
              <span>{isInteracting ? "Adjusting..." : "Idle"}</span>
              <button
                onClick={reset}
                className="rounded border border-white/20 px-2 py-0.5 text-white transition hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto hidden justify-end gap-3 md:flex">
          {images.map((image) => (
            <figure key={image.src} className="w-44 overflow-hidden rounded-lg border border-white/20 bg-black/50">
              <img src={image.src} alt={image.alt} loading="lazy" className="h-20 w-full object-cover" />
              <figcaption className="px-2 py-1 text-left text-[10px] text-white/60">Unsplash stock image</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
