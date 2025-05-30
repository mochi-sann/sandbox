import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";
export default defineConfig({
  // Whether to use css reset
  preflight: true,

  presets: [    createPreset({ accentColor: neutral, grayColor: neutral, radius: 'sm' }),],
  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}", "./pages/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {},
  },

  // The output directory for your css system
  outdir: "styled-system",
});
