"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

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
  const lastTracked = useRef<string>("");

  useEffect(() => {
    // Don't track admin pages or duplicate rapid fires
    if (pathname.startsWith("/admin")) return;
    if (pathname === lastTracked.current) return;
    lastTracked.current = pathname;

    try {
      const visitorId = getVisitorId();
      const payload = JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        visitorId,
      });

      // Use sendBeacon for non-blocking fire-and-forget
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/track",
          new Blob([payload], { type: "application/json" })
        );
      } else {
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // localStorage might be blocked
    }
  }, [pathname]);

  return null;
}
