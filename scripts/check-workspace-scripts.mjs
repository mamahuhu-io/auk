import fs from "node:fs"
import path from "node:path"

const rootDir = process.cwd()
const rootPackagePath = path.join(rootDir, "package.json")
const packagesDir = path.join(rootDir, "packages")

const recursiveRunPattern = /(?:^|&&|\|\|)\s*pnpm\s+-r(?:\s+--[^\s]+)*\s+([^\s&|]+)/g

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function getWorkspacePackages() {
  if (!fs.existsSync(packagesDir)) {
    return []
  }

  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const packagePath = path.join(packagesDir, entry.name, "package.json")
      if (!fs.existsSync(packagePath)) return null

      const pkg = readJSON(packagePath)
      return {
        dir: entry.name,
        name: pkg.name || entry.name,
        scripts: Object.keys(pkg.scripts || {}),
      }
    })
    .filter(Boolean)
}

function collectRecursiveScriptTargets(rootScripts) {
  const targets = new Set()

  for (const command of Object.values(rootScripts || {})) {
    if (typeof command !== "string") continue

    recursiveRunPattern.lastIndex = 0
    let match
    while ((match = recursiveRunPattern.exec(command)) !== null) {
      const target = match[1]
      // Skip pnpm options accidentally captured.
      if (target && !target.startsWith("-")) {
        targets.add(target)
      }
    }
  }

  return [...targets]
}

function main() {
  const rootPkg = readJSON(rootPackagePath)
  const workspacePackages = getWorkspacePackages()
  const targets = collectRecursiveScriptTargets(rootPkg.scripts)

  if (targets.length === 0) {
    console.log("No recursive pnpm scripts found in root package.json.")
    process.exit(0)
  }

  let hasError = false
  const lines = []

  for (const target of targets) {
    const matched = workspacePackages.filter((pkg) => pkg.scripts.includes(target))

    if (matched.length === 0) {
      hasError = true
      lines.push(`- ${target}: no workspace package defines this script`)
    } else {
      lines.push(`- ${target}: ${matched.length} package(s)`)
    }
  }

  console.log("Workspace recursive script coverage:")
  for (const line of lines) console.log(line)

  if (hasError) {
    console.error("\nFound invalid recursive script targets. Please fix root package scripts.")
    process.exit(1)
  }
}

main()
