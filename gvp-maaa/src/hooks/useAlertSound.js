import { useEffect } from "react";
import { playNotificationSound } from "../utils/notificationSound";

export const useAlertSound = (alerts) => {
  useEffect(() => {
    if (!Array.isArray(alerts) || alerts.length === 0) {
      return;
    }

    const latestAlert = alerts[0];
    if (!latestAlert || latestAlert.id == null) {
      return;
    }

    const lastSeenId = localStorage.getItem("lastSeenAlertId");

    // First observed payload in this browser session history: baseline only.
    if (!lastSeenId) {
      localStorage.setItem("lastSeenAlertId", String(latestAlert.id));
      return;
    }

    if (String(latestAlert.id) !== lastSeenId) {
      playNotificationSound();
      localStorage.setItem("lastSeenAlertId", String(latestAlert.id));
    }
  }, [alerts]);
};
