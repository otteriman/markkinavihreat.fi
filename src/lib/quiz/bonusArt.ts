/**
 * Hand-drawn art for the quiz's bonus level ("Vihreiden villapaitapeli"):
 * Lauri, a generic tidy man with round glasses, in three moods, and a green
 * knitted sweater. Drawn as loose black lines with a slight, fixed wobble so
 * it looks hand drawn but renders the same every time.
 */

export type Mood = 'neutral' | 'laugh' | 'annoyed'

const INK = '#161A14'
const SKIN = '#FFFFFF'
const GREEN = '#7FB548'
const GREEN_DARK = '#356F2B'
const BLUSH = '#F2A49A'

type Pt = [number, number]

/** Deterministic jitter, so the wobble is the same on every render. */
function jitter(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296 - 0.5
  }
}

const r1 = (v: number) => Math.round(v * 10) / 10

/**
 * A smooth, slightly wobbly path through the points (Catmull-Rom curves).
 * `amount` is how far each point may wander, in viewBox units.
 */
export function wobble(points: Pt[], seed: string, closed = false, amount = 1.2): string {
  const j = jitter(seed)
  const p = points.map(([x, y]) => [x + j() * amount, y + j() * amount] as Pt)
  const at = (i: number) =>
    closed ? p[(i + p.length) % p.length] : p[Math.max(0, Math.min(p.length - 1, i))]
  const count = closed ? p.length : p.length - 1
  let d = `M${r1(p[0][0])} ${r1(p[0][1])}`
  for (let i = 0; i < count; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`
  }
  return closed ? `${d}Z` : d
}

const line = (d: string, width = 2.6, extra = '') =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
const shape = (d: string, fill: string, width = 2.6) =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`

/** Points around an ellipse, narrower towards the bottom for a jaw. */
function oval(cx: number, cy: number, rx: number, ry: number, n: number, jaw = 0): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    const lower = Math.max(0, Math.sin(a))
    return [cx + Math.cos(a) * rx * (1 - jaw * lower * lower), cy + Math.sin(a) * ry] as Pt
  })
}

function body(): string {
  // Shoulders and a plain collared shirt; the sweater, when on, covers it.
  const shoulders = wobble(
    [
      [14, 330],
      [22, 268],
      [40, 226],
      [74, 206],
      [104, 198],
    ],
    'shoulder-l',
  )
  const shouldersR = wobble(
    [
      [136, 198],
      [166, 206],
      [200, 226],
      [218, 268],
      [226, 330],
    ],
    'shoulder-r',
  )
  return [
    line(
      wobble(
        [
          [106, 172],
          [104, 186],
          [102, 199],
        ],
        'neck-l',
      ),
    ),
    line(
      wobble(
        [
          [134, 172],
          [136, 186],
          [138, 199],
        ],
        'neck-r',
      ),
    ),
    line(shoulders),
    line(shouldersR),
    // Collar and buttons
    line(
      wobble(
        [
          [104, 198],
          [112, 210],
          [120, 216],
        ],
        'collar-l',
      ),
    ),
    line(
      wobble(
        [
          [120, 216],
          [128, 210],
          [136, 198],
        ],
        'collar-r',
      ),
    ),
    line(
      wobble(
        [
          [120, 218],
          [120, 260],
          [121, 330],
        ],
        'placket',
      ),
      1.6,
    ),
    ...[238, 266, 294].map((y) => `<circle cx="123" cy="${y}" r="2" fill="${INK}"/>`),
  ].join('')
}

function head(): string {
  const face = wobble(oval(120, 116, 44, 54, 14, 0.28), 'face', true)
  const hair = wobble(
    [
      [76, 108],
      [78, 84],
      [92, 66],
      [114, 58],
      [138, 60],
      [158, 74],
      [166, 96],
      [164, 110],
      [158, 96],
      [146, 86],
      [126, 86],
      [106, 92],
      [90, 102],
      [80, 110],
    ],
    'hair',
    true,
    0.8,
  )
  return [
    // Ears behind the face
    shape(
      wobble(
        [
          [78, 110],
          [68, 112],
          [66, 126],
          [74, 136],
          [80, 134],
        ],
        'ear-l',
      ),
      SKIN,
    ),
    shape(
      wobble(
        [
          [162, 110],
          [172, 112],
          [174, 126],
          [166, 136],
          [160, 134],
        ],
        'ear-r',
      ),
      SKIN,
    ),
    shape(face, SKIN),
    // Tidy hair with a side parting
    shape(hair, '#E6DCCB'),
    line(
      wobble(
        [
          [128, 60],
          [122, 72],
          [110, 88],
        ],
        'part',
      ),
      1.8,
    ),
    line(
      wobble(
        [
          [144, 66],
          [146, 76],
          [140, 86],
        ],
        'strand',
      ),
      1.4,
    ),
    // Round glasses
    line(wobble(oval(102, 116, 13, 12, 8), 'lens-l', true, 0.6), 2.2),
    line(wobble(oval(138, 116, 13, 12, 8), 'lens-r', true, 0.6), 2.2),
    line(
      wobble(
        [
          [115, 114],
          [120, 110],
          [125, 114],
        ],
        'bridge',
      ),
      2,
    ),
    line(
      wobble(
        [
          [89, 113],
          [80, 111],
          [76, 112],
        ],
        'arm-l',
      ),
      2,
    ),
    line(
      wobble(
        [
          [151, 113],
          [160, 111],
          [164, 112],
        ],
        'arm-r',
      ),
      2,
    ),
    // Nose
    line(
      wobble(
        [
          [120, 122],
          [115, 134],
          [118, 139],
          [123, 138],
        ],
        'nose',
      ),
      2.2,
    ),
  ].join('')
}

function faces(): string {
  const neutral = [
    `<circle cx="102" cy="117" r="2.8" fill="${INK}"/>`,
    `<circle cx="138" cy="117" r="2.8" fill="${INK}"/>`,
    line(
      wobble(
        [
          [92, 99],
          [101, 96],
          [111, 97],
        ],
        'brow-l',
      ),
      2.2,
    ),
    line(
      wobble(
        [
          [129, 97],
          [139, 96],
          [148, 99],
        ],
        'brow-r',
      ),
      2.2,
    ),
    line(
      wobble(
        [
          [105, 150],
          [120, 158],
          [135, 150],
        ],
        'smile',
      ),
      2.4,
    ),
  ]
  const laugh = [
    // Eyes squeezed shut with laughter, blushing cheeks, mouth wide open
    `<ellipse cx="88" cy="138" rx="8" ry="5" fill="${BLUSH}" opacity="0.75"/>`,
    `<ellipse cx="152" cy="138" rx="8" ry="5" fill="${BLUSH}" opacity="0.75"/>`,
    line(
      wobble(
        [
          [96, 119],
          [102, 112],
          [108, 119],
        ],
        'laugh-eye-l',
      ),
      2.4,
    ),
    line(
      wobble(
        [
          [132, 119],
          [138, 112],
          [144, 119],
        ],
        'laugh-eye-r',
      ),
      2.4,
    ),
    line(
      wobble(
        [
          [92, 95],
          [101, 91],
          [111, 93],
        ],
        'laugh-brow-l',
      ),
      2.2,
    ),
    line(
      wobble(
        [
          [129, 93],
          [139, 91],
          [148, 95],
        ],
        'laugh-brow-r',
      ),
      2.2,
    ),
    shape(
      wobble(
        [
          [103, 147],
          [120, 149],
          [137, 147],
          [130, 162],
          [120, 166],
          [110, 162],
        ],
        'laugh-mouth',
        true,
        0.6,
      ),
      '#9B3B32',
      2.4,
    ),
  ]
  const annoyed = [
    // Only a little annoyed: heavy eyelids, brows lowered towards the nose,
    // and a flat mouth pulled to one side.
    `<circle cx="102" cy="119" r="2.6" fill="${INK}"/>`,
    `<circle cx="138" cy="119" r="2.6" fill="${INK}"/>`,
    line(
      wobble(
        [
          [93, 114],
          [102, 112.5],
          [111, 114],
        ],
        'lid-l',
      ),
      2.2,
    ),
    line(
      wobble(
        [
          [129, 114],
          [138, 112.5],
          [147, 114],
        ],
        'lid-r',
      ),
      2.2,
    ),
    line(
      wobble(
        [
          [92, 97],
          [101, 98],
          [111, 101],
        ],
        'annoyed-brow-l',
      ),
      2.4,
    ),
    line(
      wobble(
        [
          [129, 101],
          [139, 98],
          [148, 97],
        ],
        'annoyed-brow-r',
      ),
      2.4,
    ),
    line(
      wobble(
        [
          [110, 154],
          [121, 153],
          [131, 151],
        ],
        'annoyed-mouth',
      ),
      2.4,
    ),
  ]
  return [
    `<g data-face="neutral">${neutral.join('')}</g>`,
    `<g data-face="laugh">${laugh.join('')}</g>`,
    `<g data-face="annoyed">${annoyed.join('')}</g>`,
  ].join('')
}

/** The green knitted sweater, drawn to sit exactly over the shirt. */
export function sweaterSvg(): string {
  const outline = wobble(
    [
      [10, 334],
      [18, 266],
      [36, 224],
      [72, 202],
      [102, 194],
      [110, 204],
      [120, 208],
      [130, 204],
      [138, 194],
      [168, 202],
      [204, 224],
      [222, 266],
      [230, 334],
    ],
    'sweater',
    true,
    1,
  )
  const j = jitter('knit')
  // Knit stitches: small "v" marks in loose rows.
  const stitches: string[] = []
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 40 + col * 27 + (row % 2) * 13 + j() * 4
      const y = 232 + row * 17 + j() * 3
      const inside = Math.abs(x - 120) < 70 + (y - 220) * 0.5
      if (!inside || (Math.abs(x - 120) < 16 && y < 222)) continue
      stitches.push(`M${r1(x - 4)} ${r1(y - 3)}L${r1(x)} ${r1(y + 3)}L${r1(x + 4)} ${r1(y - 3)}`)
    }
  }
  return [
    shape(outline, GREEN, 2.8),
    // Ribbed neckband
    `<path d="${wobble(
      [
        [100, 196],
        [110, 207],
        [120, 211],
        [130, 207],
        [140, 196],
      ],
      'neckband',
    )}" fill="none" stroke="${GREEN_DARK}" stroke-width="7" stroke-linecap="round"/>`,
    line(
      wobble(
        [
          [100, 196],
          [110, 207],
          [120, 211],
          [130, 207],
          [140, 196],
        ],
        'neckband-line',
      ),
      2.2,
    ),
    // Sleeve seams
    line(
      wobble(
        [
          [50, 236],
          [56, 280],
          [58, 334],
        ],
        'seam-l',
      ),
      1.8,
    ),
    line(
      wobble(
        [
          [190, 236],
          [184, 280],
          [182, 334],
        ],
        'seam-r',
      ),
      1.8,
    ),
    `<path d="${stitches.join('')}" fill="none" stroke="${GREEN_DARK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join('')
}

/** The whole figure, or a close-up of the head. */
const VIEWBOX = { full: '0 0 240 330', closeup: '36 8 168 180' }

/**
 * Lauri as SVG markup. The mood is switched by setting data-mood on the <svg>
 * (CSS hides the other faces); the sweater sits in its own group so it can
 * slide in from the left.
 */
export function personSvg(
  label: string,
  mood: Mood = 'neutral',
  frame: keyof typeof VIEWBOX = 'full',
): string {
  return `<svg class="bonus-person" data-mood="${mood}" viewBox="${VIEWBOX[frame]}" role="img" aria-label="${label.replace(/"/g, '&quot;')}">
<g class="bonus-body">${body()}<g class="bonus-sweater">${sweaterSvg()}</g><g transform="translate(120 178) scale(1.25) translate(-120 -178)">${head()}${faces()}</g></g>
</svg>`
}
