import useAsset from "ultra/hooks/use-asset.js";
import { lazy, Suspense } from "react";
// Twind Provider
import { TwindProvider } from "./twind/TwindProvider.tsx";
import { Route, Routes } from "react-router-dom";

// Twind
import { tw } from "twind";
import { DefaultLayout } from "./components/Layout/DefaultLayout.tsx";
import HomePage from "./pages/Home.tsx";

export default function App() {
  console.log("Hello world!");
  return (
    <TwindProvider>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <title>Ultra</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />
          <link rel="shortcut icon" href={useAsset("/favicon.ico")} />
          <link rel="stylesheet" href={useAsset("/style.css")} />
        </head>
        <body>
          <main>
            <h1 className={tw`text-8xl font-mono margin mb-8`}>
              <span></span>__<span></span>
            </h1>
            <p>
              ようこそ！！！！{" "}
              <strong>Ultra</strong>. This is a barebones starter for your web
              app.
            </p>
            <p>
              Take{" "}
              <a
                href="https://ultrajs.dev/docs"
                target="_blank"
              >
                this
              </a>
              , you may need it where you are going. It will show you how to
              customise your routing, data fetching, and styling with popular
              libraries.
            </p>
          </main>

          <Suspense fallback={<div>Page is Loading...</div>}>
            <Routes>
              <Route path="/" element={<DefaultLayout />}>
                <Route index element={<HomePage />} />
              </Route>
            </Routes>
          </Suspense>
        </body>
      </html>
    </TwindProvider>
  );
}
