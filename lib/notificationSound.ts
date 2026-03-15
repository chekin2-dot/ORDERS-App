import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let sound: Audio.Sound | null = null;

export async function initializeAudio() {
  try {
    if (Platform.OS !== 'web') {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    }
  } catch (error) {
    console.error('Error initializing audio:', error);
  }
}

async function playSingleSound() {
  if (sound) {
    await sound.unloadAsync();
    sound = null;
  }

  const { sound: newSound } = await Audio.Sound.createAsync(
    { uri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBT2V1vLKeTIFHG/A7+GWRQ0QWK/n6qNYFwlCm9/xuHAeBDqP0fG7dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97yuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97zuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97xuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97zuHAeCjiS0fG6dCgDIHC87+mWRg0PVq/l6J5aGQlBm97zuHAeCTiS0fG6dCgDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm97zuHAaCTiS0fG6dCcDIHC87+mWRw0PVq7m6J5aGAlBm9wA=' },
    { shouldPlay: false }
  );

  sound = newSound;
  await sound.setVolumeAsync(1.0);
  await sound.playAsync();

  return new Promise<void>((resolve) => {
    sound?.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound?.unloadAsync();
        sound = null;
        resolve();
      }
    });
  });
}

export async function playNotificationSound() {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (Platform.OS === 'web') {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      for (let i = 0; i < 2; i++) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime + (i * 0.6));
        oscillator.stop(audioContext.currentTime + 0.5 + (i * 0.6));

        if (i === 1) {
          setTimeout(() => {
            oscillator.disconnect();
            gainNode.disconnect();
          }, 1300);
        }
      }

      return;
    }

    await playSingleSound();

    await new Promise(resolve => setTimeout(resolve, 300));

    await playSingleSound();
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

export async function cleanupSound() {
  try {
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }
  } catch (error) {
    console.error('Error cleaning up sound:', error);
  }
}
