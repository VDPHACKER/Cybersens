/**
 * Service pour générer des effets sonores et une ambiance musicale "cyber"
 * utilisant l'API Web Audio pour une autonomie totale sans fichiers externes.
 */

class AudioService {
  private ctx: AudioContext | null = null;
  private bgGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private oscillators: OscillatorNode[] = [];

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.bgGain = this.ctx.createGain();
      this.bgGain.connect(this.ctx.destination);
      this.bgGain.gain.setValueAtTime(0.1, this.ctx.currentTime); // Volume par défaut bas
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Joue un clic discret (retour d'interface)
   */
  playClick() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  }

  /**
   * Joue un son de succès (Bip aigu ascendant)
   */
  playSuccess() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  }

  /**
   * Joue un son d'erreur (Bip grave descendant)
   */
  playError() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  }

  /**
   * Démarre ou arrête la musique d'ambiance générée par synthèse
   */
  toggleBackgroundMusic(play: boolean) {
    this.initContext();
    if (!this.ctx || !this.bgGain) return;

    if (play && !this.isPlaying) {
      this.isPlaying = true;

      // Création d'une nappe sonore "Cyber Ambient"
      const frequencies = [110, 164.81, 220, 329.63]; // A2, E3, A3, E4
      frequencies.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const lfo = this.ctx!.createOscillator();
        const lfoGain = this.ctx!.createGain();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

        // Légère modulation pour un son plus "vivant"
        lfo.frequency.setValueAtTime(0.2 + i * 0.1, this.ctx!.currentTime);
        lfoGain.gain.setValueAtTime(2, this.ctx!.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        osc.connect(this.bgGain!);
        osc.start();
        lfo.start();
        this.oscillators.push(osc, lfo);
      });
    } else if (!play && this.isPlaying) {
      this.isPlaying = false;
      this.oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch (e) {}
      });
      this.oscillators = [];
    }
  }

  /**
   * Ajuste le volume de la musique de fond (0 à 1)
   */
  setBackgroundVolume(volume: number) {
    this.initContext();
    if (this.bgGain && this.ctx) {
      this.bgGain.gain.setTargetAtTime(volume * 0.2, this.ctx.currentTime, 0.1);
    }
  }

  getIsMusicPlaying() {
    return this.isPlaying;
  }
}

export const audioService = new AudioService();
