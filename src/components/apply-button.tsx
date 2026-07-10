"use client";

export function ApplyButton({
  jobId,
  url,
  children,
  className,
}: {
  jobId: number;
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  const trackClick = () => {
    try {
      const visitorId = localStorage.getItem("jh_vid") || "anonymous";
      const payload = JSON.stringify({
        path: `/apply/${jobId}`,
        referrer: null,
        visitorId,
      });
      // sendBeacon survives the tab opening the external careers page
      navigator.sendBeacon?.(
        "/api/track",
        new Blob([payload], { type: "application/json" })
      );
    } catch {
      // localStorage blocked — skip tracking, never block the apply click
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackClick}
      className={className}
    >
      {children}
    </a>
  );
}
