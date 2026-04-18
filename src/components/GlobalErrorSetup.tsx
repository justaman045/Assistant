"use client";

import { useEffect } from "react";
import { registerGlobalErrorHandlers } from "./ErrorBoundary";

export default function GlobalErrorSetup() {
  useEffect(() => {
    registerGlobalErrorHandlers();
  }, []);

  return null;
}
