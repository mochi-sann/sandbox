const esbuild = require("esbuild")

const watch = process.argv.includes("--watch")
const isProduction = process.env.NODE_ENV === "production"

const buildOptions = {
  entryPoints: ["app/javascript/application.tsx"],
  bundle: true,
  outdir: "app/assets/builds",
  publicPath: "/assets",
  sourcemap: !isProduction,
  minify: isProduction,
  target: "es2017",
  loader: {
    ".ts": "ts",
    ".tsx": "tsx"
  }
}

async function run() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions)
    await ctx.watch()
    console.log("Watching for changes...")
  } else {
    await esbuild.build(buildOptions)
  }
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
