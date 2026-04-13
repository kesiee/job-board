"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function getVisitorId(): string {
  const key = "jh_vid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't track admin pages
    if (pathname.startsWith("/admin")) return;

    try {
      const visitorId = getVisitorId();
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          referrer: document.referrer || null,
          visitorId,
        }),
      }).catch(() => {});
    } catch {
      // localStorage might be blocked
    }
  }, [pathname]);

  return null;
}
