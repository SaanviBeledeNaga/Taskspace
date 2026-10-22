export type SoundKind = 'completion' | 'reminder' | 'deadline';

// Generated locally with Web Audio: no sound downloads or background-video audio.
const patterns: Record<SoundKind, { notes: number[]; step: number; length: number }> = {
  completion: { notes: [523.25, 659.25, 783.99, 1046.5], step: 0.12, length: 0.32 },
  reminder: { notes: [587.33, 783.99], step: 0.2, length: 0.19 },
  deadline: { notes: [660, 880, 660], step: 0.23, length: 0.2 },
};

export class TaskSounds {
  private context: AudioContext | null = null;
  private enabled = false;
  private volume = 0.8;
  private generation = 0;
  private voices = new Map<OscillatorNode, { gain: GainNode; kind: SoundKind }>();

  constructor(private createContext: () => AudioContext = () => new AudioContext()) {}

  async enable(): Promise<boolean> {
    const generation = ++this.generation;
    if (!this.context || this.context.state === 'closed') this.context = this.createContext();
    const context = this.context;
    await context.resume();
    // Ignore a late resume after muting, unmounting, or another enable request.
    if (generation !== this.generation || this.context !== context) return false;
    this.enabled = context.state === 'running';
    return this.enabled;
  }

  setVolume(value: number) {
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    // A volume change also affects notes already playing.
    this.stop();
  }

  mute() {
    ++this.generation;
    this.enabled = false;
    this.stop();
  }

  play(kind: SoundKind): boolean {
    const context = this.context;
    if (!this.enabled || !context || context.state !== 'running' || this.volume <= 0) return false;
    // Completion replaces any currently audible alert with a distinct success sound.
    if (kind === 'completion') this.stop();
    const pattern = patterns[kind];
    try {
      pattern.notes.forEach((frequency, index) => {
        const at = context.currentTime + index * pattern.step;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        this.voices.set(oscillator, { gain, kind });
        oscillator.type = kind === 'deadline' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(this.volume * (kind === 'deadline' ? 0.45 : 0.2), at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + pattern.length);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
          this.voices.delete(oscillator);
        };
        oscillator.start(at);
        oscillator.stop(at + pattern.length + 0.02);
      });
      return true;
    } catch {
      this.stop(kind);
      return false;
    }
  }

  async playFromGesture(kind: SoundKind): Promise<boolean> {
    const context = this.context;
    if (!this.enabled || !context || this.volume <= 0) return false;
    const generation = this.generation;
    try {
      if (context.state === 'suspended') await context.resume();
      if (generation !== this.generation || this.context !== context) return false;
      return this.play(kind);
    } catch {
      return false;
    }
  }

  stop(kind?: SoundKind) {
    for (const [oscillator, voice] of this.voices) {
      if (kind && voice.kind !== kind) continue;
      try { oscillator.stop(); } catch { /* Already ended. */ }
      oscillator.disconnect();
      voice.gain.disconnect();
      this.voices.delete(oscillator);
    }
  }

  destroy() {
    this.mute();
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }
}

// No automatic expiry: dismissal, completion, mute, or unmount owns cleanup.
export function loopDeadlineAlarm(sounds: Pick<TaskSounds, 'play' | 'stop'>) {
  const ring = () => sounds.play('deadline');
  ring();
  const interval = setInterval(ring, 1600);
  return () => {
    clearInterval(interval);
    sounds.stop('deadline');
  };
}
