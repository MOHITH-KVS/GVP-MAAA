export const getLastSeenTime = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("lastSeenAlertTime");
};

export const setLastSeenTime = (time) => {
  if (typeof window === "undefined" || !time) {
    return;
  }

  localStorage.setItem("lastSeenAlertTime", String(time));
};