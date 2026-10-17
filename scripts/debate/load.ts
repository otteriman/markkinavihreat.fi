import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { assembleEnemies, assembleSpecials } from '../../src/lib/debate/loader'
import type { DebateConfig, UiStrings } from '../../src/lib/debate/types'

/**
 * Loads the debate content from disk for Node scripts, where Vite's
 * import.meta.glob (used by src/lib/debate/data.ts) isn't available. Feeds the
 * same assembleEnemies, so scripts see exactly what the site sees.
 */
export const DEBATE_DIR = join(process.cwd(), 'src/data/debate')

const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch (error) {
    throw new Error(`src/data/debate/${relative(DEBATE_DIR, path)}: ${(error as Error).message}`)
  }
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : entry.endsWith('.json') ? [full] : []
  })
}

export function loadDebate() {
  const files = Object.fromEntries(
    walk(join(DEBATE_DIR, 'enemies')).map((path) => [relative(DEBATE_DIR, path), readJson(path)]),
  )
  const config = readJson(join(DEBATE_DIR, 'config.json')) as DebateConfig
  const ui = readJson(join(DEBATE_DIR, 'ui.json')) as UiStrings
  const specialsDir = join(DEBATE_DIR, 'specials')
  const specialFiles = Object.fromEntries(
    (existsSync(specialsDir) ? readdirSync(specialsDir) : [])
      .filter((entry) => entry.endsWith('.json'))
      .map((entry) => [`specials/${entry}`, readJson(join(specialsDir, entry))]),
  )
  const { enemies, problems } = assembleEnemies(files)
  const { specials, problems: specialProblems } = assembleSpecials(specialFiles)
  return {
    config,
    ui,
    enemies,
    specials,
    problems: [...problems, ...specialProblems],
    files: { ...files, ...specialFiles, 'ui.json': ui },
  }
}
