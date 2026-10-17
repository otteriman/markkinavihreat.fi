# Debate game content ("Vihreä väittely")

Everything the game says and every number it uses lives in this folder. You can change, add or remove attacks without touching code. After any change, run:

```sh
npm run debate:report    # overview + content check (tiers, longest texts, open translations)
npm run debate:balance   # how the change affects win rates
```

Both also run in CI (`npm run validate:translations`, `npm run test`).

## Files

```
config.json                       difficulty presets, guardrails, content rules
ui.json                           narration and UI texts ("{enemy} käytti {attack}!" …)
enemies/<enemy>/
  enemy.json                      name, intro texts, defeat line, sprite
  enemy-attacks/<id>.json         one enemy attack and the player's 4 replies to it
  player-attacks/<id>.json        one player attack and the enemy's 4 comebacks to it
specials/<id>.json                a special character who can step in for a critical hit
```

Every text is written in all three languages: `{ "fi": "…", "sv": "…", "en": "…" }`. Finnish is the source. A text still marked `"TODO"` shows the Finnish text instead. `"needsReview": ["sv", "en"]`, either at the top of a file or on a single text, marks drafts that a person still has to check.

## Common edits

- **Change a line:** edit the text in its file.
- **Add an enemy attack:** copy a file in `enemy-attacks/` under a new name and edit it. `name` is the attack on its own, shown on the enemy's box ("Hyökkäys: Velkapaniikki"); `announce` is the form that fits the narration ("Konservatiivi käytti VELKAPANIIKKIA!"). Each attack needs exactly 1 `strong`, 1 `medium` and 2 `weak` replies. Each round he uses one of the attacks in this folder at random, and none repeats until he has used them all, so adding more is fine.
- **Add a player attack:** copy a file in `player-attacks/` and edit it. Each attack needs 4 enemy comebacks, and at least one of them must be `strong`. `order` sets its place in the 2×3 grid. If there are more than 6 player attacks, each battle shows a random 6.
- **Remove an attack:** delete its file. The enemy needs at least one attack and the player at least 6.
- **Make an attack stronger or weaker:** change the `quality` of the enemy's comebacks. An attack's tier (Vahva / Hyvä / Heikko) is never written down; `debate:report` works it out from the comebacks.
- **Add an enemy:** add a folder under `enemies/` with the same three parts. Everything he says is his own, including `defeat`, the line shown when he is knocked out and slides off the stage ("Konservatiivi hävisi väittelyn, ja pakeni Twitteriin!").

## Special characters and critical hits

A special character is someone outside the debate who can step in mid-battle, say something and make a hit **critical**: it does extra damage. The first one is the Pääkirjoitustoimittaja (`specials/paakirjoitustoimittaja.json`). When he steps in, a band opens over the middle of the stage and he slides in. The narration says he steps forward, his line goes in the top box under his name, and he leaves. Then the usual effect text is shown, followed by "Kriittinen osuma!". The hit lands with extra damage and the stage shakes.

A critical hit can happen on any reply (in `enemy-attacks/`) or enemy comeback (in `player-attacks/`) that has a `critical` field, and only when that answer's hit does damage. As shipped, it always happens then (the difficulty's `critical.chance` is 1). For example, on the reply "Veronkorotus":

```json
"critical": {
  "by": "paakirjoitustoimittaja",
  "say": { "fi": "Veronkorotukset tappaisivat Suomen kilpailukyvyn…", "sv": "…", "en": "…" }
}
```

- `by`: the special character's file name in `specials/`, without `.json`.
- `say`: what he says. It's a line, so at most 120 characters (his line goes in the enemy's box, which holds three lines).
- `chance`: optional, the odds that he steps in, from 0 to 1. Leave it out to use the difficulty's `critical.chance`.

An answer can also have several triggers, as a list: `"critical": [{ "by": …, "say": … }, { "by": …, "say": … }]`. Then one of them, picked at random, steps in; each can be a different character, or the same one with different lines.

The extra damage goes to whoever that hit was going to hurt. On a weak or medium reply, that's the player; on an enemy's weak or medium comeback, it's the enemy. So put the trigger where the character's line fits the side he is backing.

**Add a special character:** copy `specials/paakirjoitustoimittaja.json` under a new name and edit `name` (the label over his line), `appear` (the narration as he steps in) and `sprite`. Add his sprite to `src/lib/debate/sprites.ts` (48 × 50, shown twice that size in the cut-in). Then use his file name in `by` on any reply or comeback. To see him in action, open the debate lab (`/debate-lab/`, development and previews only): under _Special characters_, each link starts a battle in which he steps in on the first reply.

Quality means how good the _defender's_ answer is: `strong` blocks the hit completely, `medium` blocks half of it and `weak` lets the whole hit through (with the shipped numbers, 0, 15 or 30 points).

Labels can be at most 17 characters, and lines at most 120. The limits are set in `config.json` under `rules` and will be fine-tuned once the font is chosen.

## Difficulty

`config.json` → `"difficulty"` names the preset the game ships with (`easy`, `normal` or `hard`). Each preset sets:

| Setting                                  | Meaning                                                                                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `maxRounds`                              | Safety net only: the battle runs until someone's KANNATUS is 0, and if this many rounds pass first it's decided on points           |
| `player.counter`, `enemy.counter`        | Share of that side's full hit it takes when its own attack meets a perfect (`strong`) defense: the attack backfires. 0 turns it off |
| `player.kannatus`, `enemy.kannatus`      | Starting KANNATUS for each side                                                                                                     |
| `player.baseDamage`, `enemy.baseDamage`  | A full hit taken by that side                                                                                                       |
| `player.damage`, `enemy.damage`          | Share of the hit that lands, by quality of that side's answer (0–2)                                                                 |
| `enemyDefenseWeights`                    | Odds of the enemy picking a strong / medium / weak comeback (1/1/1 = even)                                                          |
| `tieMargin`                              | On points (after `maxRounds`), a difference up to this counts as a tie                                                              |
| `critical.chance`                        | Odds (0–1) that a special character steps in on an answer with a `critical` trigger that sets no `chance` of its own (1: always)    |
| `critical.extraMin`, `critical.extraMax` | A critical hit's extra damage: a whole number in this range, every value equally likely. Leave `critical` out and they never happen |

`config.json` → `presentation.announceEnemyAttack` decides whether each enemy attack is narrated ("Konservatiivi käytti VELKAPANIIKKIA!") before his line. It's `false` for now, because the label on his box ("Hyökkäys: Velkapaniikki") already names the attack; set it to `true` to bring the narration back. Each attack's `announce` text stays in its file either way.

How a battle runs: each round the enemy attacks and you reply, then you attack and he defends. A `strong` answer blocks the hit and, with `counter` above 0, turns it back on the attacker; `medium` blocks half; `weak` lets the whole hit through. There is no fixed number of rounds: the first side out of KANNATUS loses. The shipped numbers aim for about four rounds; `npm run debate:balance` shows the average length.

A preset can start from another one with `"extends": "normal"` and list only what it changes. `spec` is a frozen copy of the original spec's numbers that the tests use; don't edit it.

To try a change without editing anything:

```sh
npm run debate:balance -- --difficulty hard
npm run debate:balance -- --set player.damage.medium=0.4 --set enemyDefenseWeights.strong=1.5
```

`guardrails` sets the limits each preset must stay within, for example "perfect play wins at least 95 %". The tests fail if a content or difficulty change breaks one. If the change was deliberate, adjust the guardrail too.
