let audio;
let lastPlayedAt = 0;

const MIN_PLAY_GAP_MS = 1500;

export const playNotificationSound = () => {
  try {
    if (typeof window === "undefined") {
      return;
    }

    const now = Date.now();
    if (now - lastPlayedAt < MIN_PLAY_GAP_MS) {
      return;
    }

    if (!audio) {
      audio = new Audio("/sounds/notification.mp3");
      audio.preload = "auto";
    }

    audio.currentTime = 0;
    const playAttempt = audio.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch((err) => {
        console.error("Sound play failed", err);
      });
    }

    lastPlayedAt = now;
  } catch (err) {
    console.error("Sound play failed", err);
  }
};