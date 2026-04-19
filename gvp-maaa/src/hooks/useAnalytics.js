import { useEffect, useRef } from "react";
import { sendAnalyticsEvent } from "../utils/analyticsSession";

function normalizeMetadata(metadata = {}) {
  return {
    department: metadata.department ?? metadata.department_id ?? metadata.branch ?? null,
    year: metadata.year ?? null,
    section: metadata.section ?? null,
  };
}

export default function useAnalytics({ page, role, metadata = {}, enabled = true }) {
  const metadataRef = useRef(normalizeMetadata(metadata));

  useEffect(() => {
    metadataRef.current = normalizeMetadata(metadata);
  }, [metadata]);

  useEffect(() => {
    if (!enabled || !page) {
      return;
    }

    sendAnalyticsEvent({
      page,
      action: "visit",
      role,
      metadata: metadataRef.current,
    }).catch(() => {
      // Tracking must never interrupt user workflows.
    });
  }, [enabled, page, role]);
}

export function trackAnalyticsAction({ page, role, action = "click", metadata = {} }) {
  return sendAnalyticsEvent({ page, role, action, metadata }).catch(() => {
    // Tracking failures are intentionally non-blocking.
  });
}
