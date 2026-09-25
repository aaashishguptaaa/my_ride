'use client'
import { useSession } from 'next-auth/react'
import React from 'react'
import useGetMe from './hooks/useGetMe'

if (typeof window !== "undefined") {
  const origError = console.error;
  console.error = function (...args: unknown[]) {
    const msg = args.map((a) => (typeof a === "string" ? a : (a as { message?: string })?.message || "")).join(" ");
    if (msg.includes("bis_skin_checked")) {
      return;
    }
    origError.apply(console, args);
  };
}

function InitUser() {
  React.useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (
        (e.filename && e.filename.includes("chrome-extension://")) ||
        (e.message && e.message.includes("bis_skin_checked"))
      ) {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("error", handleError, true);
    return () => window.removeEventListener("error", handleError, true);
  }, []);

  const { status } = useSession()
  useGetMe(status == "authenticated")
  return null
}

export default InitUser
