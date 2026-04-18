"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logPageView } from "@/lib/analytics";

// Tracks page views on every route change
export default function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    logPageView(pathname);
  }, [pathname]);

  return null;
}
