#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function readModulesConfig() {
  const cfgPath = path.resolve('modules.json')
  const raw = fs.readFileSync(cfgPath, 'utf-8')
  return JSON.parse(raw)
}

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf-8')
  const matches = [...content.matchAll(/from\s+['\"]([^'\"]+)['\"]/g)]
  return matches.map((m) => m[1])
}

function isAllowed(importPath, patterns) {
  return patterns.some((p) => new RegExp(p).test(importPath))
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) files.push(...walk(full))
    else if (e.isFile() && full.endsWith('.tsx')) files.push(full)
  }
  return files
}

function main() {
  const cfg = readModulesConfig()
  const appDir = path.resolve('app')
  const pages = ['upload', 'generator', 'insights']
  let violations = 0

  for (const page of pages) {
    const pageDir = path.join(appDir, page)
    if (!fs.existsSync(pageDir)) continue
    const files = walk(pageDir)
    for (const f of files) {
      const imports = scanFile(f)
      imports.forEach((imp) => {
        if (!isAllowed(imp, cfg[page].allowedImports)) {
          console.error(`[scope-check] ${page}: import não permitido em ${path.relative('.', f)} -> ${imp}`)
          violations++
        }
      })
    }
  }

  if (violations > 0) {
    console.error(`[scope-check] Falhou com ${violations} violações.`)
    process.exit(1)
  }
  console.log('[scope-check] OK, sem violações.')
}

main()