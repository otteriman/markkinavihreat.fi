import configJson from '../../data/debate/config.json'
import uiJson from '../../data/debate/ui.json'
import { assembleEnemies } from './loader'
import type { DebateConfig, UiStrings } from './types'

// The site's view of the debate content. Files are found with import.meta.glob,
// so adding or removing an attack is only a matter of adding or removing its
// file. The JSON is cast rather than parsed so no validator ships in the client
// bundle; validate.ts checks it in the tests and `npm run validate:translations`.
const files = import.meta.glob('../../data/debate/enemies/**/*.json', {
  eager: true,
  import: 'default',
})

export const config = configJson as unknown as DebateConfig
export const ui = uiJson as unknown as UiStrings

const assembled = assembleEnemies(files)
export const enemies = assembled.enemies
export const loadProblems = assembled.problems
