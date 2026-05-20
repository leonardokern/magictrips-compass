#!/usr/bin/env node
/**
 * scripts/bump-version.mjs
 *
 * Sobe a versão semver do projeto Nexus em dois lugares:
 *   - lib/version.ts (APP_VERSION) — usado pela UI
 *   - package.json (version)
 *
 * Uso:
 *   node scripts/bump-version.mjs            # patch (default)
 *   node scripts/bump-version.mjs patch
 *   node scripts/bump-version.mjs minor
 *   node scripts/bump-version.mjs major
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

const PKG_PATH = join(ROOT, "package.json")
const VERSION_TS_PATH = join(ROOT, "lib", "version.ts")

const bumpType = (process.argv[2] ?? "patch").toLowerCase()
if (!["patch", "minor", "major"].includes(bumpType)) {
  console.error(`Tipo inválido: ${bumpType}. Use patch | minor | major.`)
  process.exit(1)
}

// 1. Lê versão atual do package.json
const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"))
const current = String(pkg.version ?? "0.0.0").trim()
const parts = current.split(".").map((n) => Number.parseInt(n, 10))
if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
  console.error(`Versão atual inválida em package.json: ${current}`)
  process.exit(1)
}

let [major, minor, patch] = parts
if (bumpType === "major") {
  major += 1
  minor = 0
  patch = 0
} else if (bumpType === "minor") {
  minor += 1
  patch = 0
} else {
  patch += 1
}
const next = `${major}.${minor}.${patch}`

// 2. Atualiza package.json
pkg.version = next
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n", "utf8")

// 3. Atualiza lib/version.ts (preserva o resto do arquivo)
const tsSrc = readFileSync(VERSION_TS_PATH, "utf8")
const tsNext = tsSrc.replace(
  /export const APP_VERSION = "[^"]*"/,
  `export const APP_VERSION = "${next}"`,
)
if (tsSrc === tsNext) {
  console.error(
    `Não encontrei a linha APP_VERSION em ${VERSION_TS_PATH}. Bump abortado.`,
  )
  process.exit(1)
}
writeFileSync(VERSION_TS_PATH, tsNext, "utf8")

console.log(`Nexus ${current} → ${next} (${bumpType})`)
