class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  private constructor() {
    // Initialize audio context on first user interaction
    document.addEventListener('click', () => {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
    }, { once: true });
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public toggleSound(enabled: boolean) {
    this.enabled = enabled;
  }

  private createOscillator(frequency: number, duration: number): OscillatorNode {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.1; // Lower volume
    
    // Smooth fade out
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );
    
    return oscillator;
  }

  public async playMessageSound() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const oscillator = this.createOscillator(800, 0.1); // Higher pitch, shorter duration
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (error) {
      console.error('Error playing message sound:', error);
    }
  }

  public async playMentionSound() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      // Play two tones for mention
      const osc1 = this.createOscillator(880, 0.15); // First tone
      const osc2 = this.createOscillator(1100, 0.15); // Second tone
      
      osc1.start();
      osc2.start(this.audioContext.currentTime + 0.1); // Slight delay
      
      osc1.stop(this.audioContext.currentTime + 0.15);
      osc2.stop(this.audioContext.currentTime + 0.25);
    } catch (error) {
      console.error('Error playing mention sound:', error);
    }
  }
}

export const soundManager = SoundManager.getInstance(); 