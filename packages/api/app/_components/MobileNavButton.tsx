"use client";

import Link from "next/link";
import { useState } from "react";

export function MobileNavButton({ href }: { href: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center rounded-md p-2 text-white transition-colors hover:bg-white/10"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-16 border-b border-white/10 bg-navy-900/95 backdrop-blur-sm">
          <div className="flex flex-col gap-3 px-6 py-4">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-navy-200 transition-colors hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              MantleScan
            </a>
            <Link
              href="/dashboard"
              className="rounded-lg bg-gold-500 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-gold-600"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
