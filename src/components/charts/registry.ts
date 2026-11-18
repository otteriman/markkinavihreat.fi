/**
 * Charts available to the "[kuvaaja: <id>]" marker, in program bodies (see
 * lib/programSections.ts) and blog posts (see lib/blogBody.ts) alike. Add new
 * charts here — a body referencing an id not listed here fails the build.
 *
 * Every chart component takes the page `locale`; `props` are the extra props
 * an entry passes, for components that render more than one chart.
 */
import type { Locale } from '../../lib/content'
import { DATASET_IDS } from '../../lib/charts/hallituskaudet'
import HallituskausiChart from './HallituskausiChart.astro'
import RuokaostostukiAlvChart from './RuokaostostukiAlvChart.astro'

// Each component's own Props are narrower; the entry's `props` supply the rest.
type ChartComponent = (props: { locale: Locale } & Record<string, unknown>) => unknown

export interface ChartEntry {
  component: ChartComponent
  props: Record<string, unknown>
}

const CHARTS: Record<string, ChartEntry> = {
  'ruokaostostuki-alv': { component: RuokaostostukiAlvChart as ChartComponent, props: {} },
  ...Object.fromEntries(
    DATASET_IDS.map((id) => [
      id,
      { component: HallituskausiChart as unknown as ChartComponent, props: { dataset: id } },
    ]),
  ),
}

export function chartFor(id: string, where: string): ChartEntry {
  const chart = CHARTS[id]
  if (!chart) throw new Error(`${where} references unknown chart id "${id}"`)
  return chart
}
