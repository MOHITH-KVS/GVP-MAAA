export const getAttendanceStatus = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "good";
  if (numeric < 75) return "critical";
  if (numeric < 85) return "warning";
  return "good";
};

export const getMarksStatus = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "good";
  if (numeric < 40) return "critical";
  if (numeric < 70) return "warning";
  return "good";
};

export const getAssignmentStatus = (count) => {
  const numeric = Number(count);
  if (Number.isNaN(numeric)) return "good";
  if (numeric > 3) return "critical";
  if (numeric > 0) return "warning";
  return "good";
};

export const getRiskStatus = (count) => {
  const numeric = Number(count);
  if (Number.isNaN(numeric)) return "good";
  if (numeric > 3) return "critical";
  if (numeric > 0) return "warning";
  return "good";
};

export const statusStyles = {
  good: {
    text: "text-green-600",
    bg: "bg-green-100",
    label: "Good",
  },
  warning: {
    text: "text-yellow-600",
    bg: "bg-yellow-100",
    label: "Needs Attention",
  },
  critical: {
    text: "text-red-600",
    bg: "bg-red-100",
    label: "Critical",
  },
};
