import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let sound: Audio.Sound | null = null;
let isInitialized = false;

export async function initializeAudio() {
  try {
    if (Platform.OS !== 'web') {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      isInitialized = true;
    }
  } catch (error) {
    console.error('Error initializing audio:', error);
  }
}

function generateBoltSoundBase64(): string {
  const sampleRate = 44100;
  const duration = 0.55;
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (t < 0.22) {
      const freq1 = 880 + (1320 - 880) * (t / 0.22);
      const env1 = t < 0.005 ? t / 0.005 : Math.exp(-8 * (t - 0.005));
      sample = env1 * 0.85 * (
        0.6 * Math.sin(2 * Math.PI * freq1 * t) +
        0.25 * Math.sin(2 * Math.PI * freq1 * 2 * t) +
        0.15 * Math.sin(2 * Math.PI * freq1 * 3 * t)
      );
    } else if (t >= 0.27 && t < 0.55) {
      const t2 = t - 0.27;
      const freq2 = 1320 + (1760 - 1320) * (t2 / 0.28);
      const env2 = t2 < 0.005 ? t2 / 0.005 : Math.exp(-9 * (t2 - 0.005));
      sample = env2 * 0.9 * (
        0.55 * Math.sin(2 * Math.PI * freq2 * t2) +
        0.3 * Math.sin(2 * Math.PI * freq2 * 2 * t2) +
        0.15 * Math.sin(2 * Math.PI * freq2 * 3 * t2)
      );
    }

    const pcm = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    view.setInt16(44 + i * 2, pcm, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let cachedSoundBase64: string | null = null;

function getSoundBase64(): string {
  if (!cachedSoundBase64) {
    cachedSoundBase64 = generateBoltSoundBase64();
  }
  return cachedSoundBase64;
}

async function playSingleBoltSound() {
  if (sound) {
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {}
    sound = null;
  }

  const base64 = getSoundBase64();
  const { sound: newSound } = await Audio.Sound.createAsync(
    { uri: `data:audio/wav;base64,${base64}` },
    { shouldPlay: false, volume: 1.0 }
  );

  sound = newSound;
  await sound.playAsync();

  return new Promise<void>((resolve) => {
    sound?.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound?.unloadAsync().catch(() => {});
        sound = null;
        resolve();
      }
    });
    setTimeout(resolve, 700);
  });
}

async function triggerHaptics() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await new Promise(r => setTimeout(r, 120));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(r => setTimeout(r, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
}

function playWebSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq: number, startTime: number, dur: number, gainPeak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.linearRampToValueAtTime(freq * 1.5, startTime + dur * 0.6);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, startTime);
      osc2.frequency.linearRampToValueAtTime(freq * 3, startTime + dur * 0.6);
      gain2.gain.setValueAtTime(0, startTime);
      gain2.gain.linearRampToValueAtTime(gainPeak * 0.35, startTime + 0.008);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.start(startTime);
      osc.stop(startTime + dur);
      osc2.start(startTime);
      osc2.stop(startTime + dur);
    };

    playTone(880, ctx.currentTime, 0.22, 0.85);
    playTone(1320, ctx.currentTime + 0.27, 0.28, 0.9);
  } catch (err) {
    console.error('Web audio error:', err);
  }
}

export async function playNotificationSound() {
  try {
    if (!isInitialized && Platform.OS !== 'web') {
      await initializeAudio();
    }

    if (Platform.OS === 'web') {
      playWebSound();
      return;
    }

    triggerHaptics();
    await playSingleBoltSound();
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

export async function cleanupSound() {
  try {
    if (sound) {
      await sound.stopAsync().catch(() => {});
      await sound.unloadAsync().catch(() => {});
      sound = null;
    }
  } catch (error) {
    console.error('Error cleaning up sound:', error);
  }
}
