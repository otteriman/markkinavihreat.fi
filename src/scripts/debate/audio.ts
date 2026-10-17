/**
 * The debate game's chiptune sounds, made on the fly with the Web Audio API:
 * square waves and a little noise, like a Game Boy. No audio files.
 *
 * Off until the player turns sound on; the AudioContext is only created then,
 * from that click, so browsers' autoplay rules are never an issue. Nothing is
 * remembered between visits (the game saves nothing).
 */
export interface Sounds {
  /** A letter typed in a speech box. */
  blip(): void
  /** The cursor moved in an option grid. */
  move(): void
  /** An option was picked. */
  select(): void
  /** Someone lost KANNATUS; `backfire` when an attack turned on the attacker. */
  hit(backfire: boolean): void
  /** A special character's cut-in opens. */
  cutIn(): void
  /** A critical hit lands (on top of the hit sound). */
  critical(): void
  /** The enemy flees the stage. */
  win(): void
  /** The player lost. */
  lose(): void
}

const VOLUME = 0.06
/** Typing blips are spaced at least this far apart, so fast text doesn't buzz. */
const BLIP_GAP_S = 0.045

export class Chiptune implements Sounds {
  private ctx: AudioContext | null = null
  private out: GainNode | null = null
  private lastBlip = 0
  enabled = false

  /** Turns sound on or off. Call it from a click, so the browser allows audio. */
  setEnabled(on: boolean): void {
    this.enabled = on
    if (!on) {
      void this.ctx?.suspend()
      return
    }
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.out = this.ctx.createGain()
      this.out.gain.value = VOLUME
      this.out.connect(this.ctx.destination)
    }
    void this.ctx.resume()
  }

  private get now() {
    return this.ctx!.currentTime
  }

  /** A square-wave note, optionally sliding to another pitch. */
  private tone(freq: number, start: number, length: number, slideTo?: number, level = 1) {
    if (!this.enabled || !this.ctx || !this.out) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, start)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length)
    gain.gain.setValueAtTime(level, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + length)
    osc.connect(gain).connect(this.out)
    osc.start(start)
    osc.stop(start + length + 0.02)
  }

  /** A burst of white noise, for hits. */
  private noise(start: number, length: number, level = 1) {
    if (!this.enabled || !this.ctx || !this.out) return
    const frames = Math.ceil(this.ctx.sampleRate * length)
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1
    const source = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()
    source.buffer = buffer
    gain.gain.setValueAtTime(level, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + length)
    source.connect(gain).connect(this.out)
    source.start(start)
  }

  blip(): void {
    if (!this.enabled || !this.ctx) return
    if (this.now - this.lastBlip < BLIP_GAP_S) return
    this.lastBlip = this.now
    this.tone(1320, this.now, 0.025, undefined, 0.35)
  }

  move(): void {
    if (this.ctx) this.tone(880, this.now, 0.03, undefined, 0.5)
  }

  select(): void {
    if (!this.ctx) return
    this.tone(988, this.now, 0.05)
    this.tone(1319, this.now + 0.05, 0.08)
  }

  hit(backfire: boolean): void {
    if (!this.ctx) return
    const t = this.now
    if (backfire) {
      // A wobbling fall: the attack turns around.
      this.tone(660, t, 0.12, 330)
      this.tone(520, t + 0.12, 0.18, 180)
    } else {
      this.noise(t, 0.18, 0.8)
      this.tone(220, t, 0.2, 80, 0.7)
    }
  }

  cutIn(): void {
    if (!this.ctx) return
    const t = this.now
    // A quick rising sweep, then a two-note sting.
    this.tone(330, t, 0.16, 1320, 0.6)
    this.tone(784, t + 0.18, 0.08)
    this.tone(1047, t + 0.27, 0.16)
  }

  critical(): void {
    if (!this.ctx) return
    const t = this.now
    // A heavier, longer crunch under the hit, and a falling growl.
    this.noise(t, 0.35, 1)
    this.tone(150, t + 0.05, 0.35, 50, 0.9)
  }

  win(): void {
    if (!this.ctx) return
    const t = this.now
    ;[523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.11, i === 3 ? 0.35 : 0.1))
  }

  lose(): void {
    if (!this.ctx) return
    const t = this.now
    ;[392, 330, 262, 196].forEach((f, i) => this.tone(f, t + i * 0.16, i === 3 ? 0.45 : 0.14))
  }
}

/** For battles without sound (and tests): does nothing. */
export const silent: Sounds = {
  blip() {},
  move() {},
  select() {},
  hit() {},
  cutIn() {},
  critical() {},
  win() {},
  lose() {},
}
