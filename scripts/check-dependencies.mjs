import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(
  process.argv[2] || fileURLToPath(new URL("../", import.meta.url)),
);
const missing = new Set();
try {
  const manifest = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  );
  const lock = JSON.parse(
    readFileSync(resolve(root, "package-lock.json"), "utf8"),
  );
  const requireFromProject = createRequire(resolve(root, "package.json"));
  for (const name of Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  })) {
    try {
      const installedRoot = resolve(root, "node_modules", name);
      const installed = JSON.parse(
        readFileSync(resolve(installedRoot, "package.json"), "utf8"),
      );
      const locked = lock.packages?.[`node_modules/${name}`];
      if (!locked || installed.version !== locked.version) {
        missing.add(name);
        continue;
      }
      // Vite can use the ESM entry even when a CommonJS entry still exists.
      for (const field of ["main", "module", "types", "typings"]) {
        if (
          typeof installed[field] === "string" &&
          !existsSync(resolve(installedRoot, installed[field]))
        )
          missing.add(name);
      }
      if (installed.bin) {
        for (const entry of Object.values(
          typeof installed.bin === "string"
            ? { bin: installed.bin }
            : installed.bin,
        ))
          if (!existsSync(resolve(installedRoot, entry))) missing.add(name);
      }
      if (!name.startsWith("@types/") && !name.startsWith("@fontsource/"))
        requireFromProject.resolve(name);
    } catch {
      missing.add(name);
    }
  }
  for (const font of [
    "@fontsource/manrope/latin-400.css",
    "@fontsource/manrope/latin-600.css",
    "@fontsource/manrope/latin-700.css",
    "@fontsource/manrope/latin-800.css",
    "@fontsource/dm-sans/latin-400.css",
    "@fontsource/dm-sans/latin-500.css",
    "@fontsource/dm-sans/latin-600.css",
    "@fontsource/dm-sans/latin-700.css",
  ]) {
    try {
      requireFromProject.resolve(font);
    } catch {
      missing.add(font.split("/").slice(0, 2).join("/"));
    }
  }
  if (missing.size) {
    console.error(
      `Missing, incomplete or outdated dependencies: ${[...missing].join(", ")}`,
    );
    console.error(
      "Run npm.cmd ci --include=dev from the project folder, then try again.",
    );
    process.exitCode = 1;
  } else console.log("Dependency check passed.");
} catch (error) {
  console.error(`Cannot verify project dependencies: ${error.message}`);
  process.exitCode = 1;
}
