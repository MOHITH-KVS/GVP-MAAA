import { useEffect } from "react";
import { playNotificationSound } from "../utils/notificationSound";
import { getLastSeenTime, setLastSeenTime } from "../utils/alertStorage";

export const useAlertSound = (alerts) => {
  useEffect(() => {
    if (!Array.isArray(alerts) || alerts.length === 0) {
      return;
    }

    const sortedAlerts = [...alerts]
      .filter((alert) => alert && alert.created_at)
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

    const latestAlert = sortedAlerts[0];
    if (!latestAlert || !latestAlert.created_at) {
      return;
    }

    const lastSeenTime = getLastSeenTime();

    if (!lastSeenTime) {
      setLastSeenTime(latestAlert.created_at);
      return;
    }

    const lastSeenDate = new Date(lastSeenTime);
    const hasNewAlert = sortedAlerts.some((alert) => {
      const alertDate = new Date(alert.created_at);
      return !Number.isNaN(alertDate.getTime()) && !Number.isNaN(lastSeenDate.getTime()) && alertDate > lastSeenDate;
    });

    if (hasNewAlert) {
      playNotificationSound();
      setLastSeenTime(latestAlert.created_at);
    }
  }, [alerts]);
};
