/**
 * Game mode on phones (touch screens): while a battle runs, the game fills
 * the screen. It uses the Fullscreen API where the browser allows it (not on
 * iPhone, which only lets videos go full screen); either way the game is laid
 * out over the whole page (.debate-fullscreen). Entering adds a history
 * entry, so the browser's back button leaves game mode and stays on the page;
 * leaving full screen any other way (Android's back, Esc) leaves it too.
 * The game also leaves it at the end screen, and enters it again on "Play
 * again". Call enter() from the click that starts the battle: browsers only
 * allow full screen in answer to the player's own action.
 */
export class GameMode {
  private active = false
  /** Our own history.back() is on its way; its popstate isn't the player's. */
  private ownBack = false

  constructor(private frame: HTMLElement) {
    window.addEventListener('popstate', () => {
      if (this.ownBack) {
        this.ownBack = false
        return
      }
      if (this.active) this.leave(false)
    })
    document.addEventListener('fullscreenchange', () => {
      if (this.active && document.fullscreenElement !== this.frame) this.exit()
    })
  }

  /** Phones and tablets: the main input is a touch screen. */
  static wanted(): boolean {
    return matchMedia('(pointer: coarse)').matches
  }

  enter(): void {
    if (this.active || !GameMode.wanted()) return
    this.active = true
    this.frame.classList.add('debate-fullscreen')
    history.pushState({ debateGameMode: true }, '')
    this.frame.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {})
  }

  /** Leaves game mode (the battle ended, or full screen was left another way). */
  exit(): void {
    if (this.active) this.leave(true)
  }

  private leave(popHistory: boolean) {
    this.active = false
    this.frame.classList.remove('debate-fullscreen')
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    // Drop the history entry game mode added, so back still leaves the page.
    if (popHistory && (history.state as { debateGameMode?: boolean } | null)?.debateGameMode) {
      this.ownBack = true
      history.back()
    }
  }
}
