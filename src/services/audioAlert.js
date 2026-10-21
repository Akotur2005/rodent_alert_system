// Audio Alarm Service for Rodent Intrusion Detection
class AudioAlertService {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.activeOscillators = [];
    this.isAlarmRunning = false;
    this.volume = 0.85;
    this.audioElement = null;
  }

  initContext() {
    // Initialize Web Audio Context
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Pre-load audio element
    if (!this.audioElement) {
      try {
        this.audioElement = new Audio('/siren.wav');
        this.audioElement.volume = this.volume;
      } catch (e) {
        console.warn('Failed to preload siren.wav:', e);
      }
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted && this.isAlarmRunning) {
      this.stopAlarm();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  // Play a loud emergency alarm siren
  triggerRodentAlarm(durationSeconds = 3.0) {
    if (this.isMuted) return;

    this.isAlarmRunning = true;
    this.initContext();

    // 1. Play real siren WAV audio file (Highest reliability)
    try {
      if (!this.audioElement) {
        this.audioElement = new Audio('/siren.wav');
      }
      this.audioElement.volume = this.volume;
      this.audioElement.currentTime = 0;
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('HTML5 Audio autoplay restricted, using Web Audio synthesizer:', err);
        });
      }
    } catch (e) {
      console.warn('Audio element error:', e);
    }

    // 2. Play Web Audio API Dual-Tone Oscillator Siren (Synthesizer backup)
    try {
      if (this.ctx) {
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';

        const wobbleRounds = Math.floor(durationSeconds * 3);
        for (let i = 0; i < wobbleRounds; i++) {
          const t = now + (i * 0.33);
          osc1.frequency.setValueAtTime(800, t);
          osc1.frequency.linearRampToValueAtTime(1300, t + 0.16);
          osc1.frequency.linearRampToValueAtTime(800, t + 0.33);

          osc2.frequency.setValueAtTime(805, t);
          osc2.frequency.linearRampToValueAtTime(1305, t + 0.16);
          osc2.frequency.linearRampToValueAtTime(805, t + 0.33);
        }

        gain.gain.setValueAtTime(this.volume * 0.6, now);
        gain.gain.setValueAtTime(this.volume * 0.6, now + durationSeconds - 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + durationSeconds);
        osc2.stop(now + durationSeconds);

        this.activeOscillators = [osc1, osc2];
      }
    } catch (e) {
      console.warn('Web Audio synth error:', e);
    }

    setTimeout(() => {
      this.isAlarmRunning = false;
      this.activeOscillators = [];
    }, durationSeconds * 1000);
  }

  stopAlarm() {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      }
      this.activeOscillators.forEach((osc) => {
        try { osc.stop(); } catch (_) {}
      });
      this.activeOscillators = [];
      this.isAlarmRunning = false;
    } catch (e) {
      console.warn('Error stopping alarm:', e);
    }
  }
}

export const audioAlert = new AudioAlertService();
