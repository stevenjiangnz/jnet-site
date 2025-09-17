"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileMenuProps {
  user: { email?: string } | null;
}

export function MobileMenu({ user }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { href: "/price", label: "Price" },
    { href: "/symbols", label: "Symbols" },
    { href: "/screen", label: "Screen" },
    { href: "/analysis", label: "Analysis" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md navbar-link"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white dark:bg-gray-900 shadow-lg z-50">
          <nav className="px-4 py-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`block py-2 px-3 rounded text-base ${
                  pathname === item.href
                    ? "text-indigo-600 dark:text-indigo-400 bg-gray-100 dark:bg-gray-800"
                    : "navbar-link hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block py-2 px-3 rounded text-base navbar-link hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Dashboard
                </Link>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <div className="px-3 py-2 text-sm navbar-text">{user.email}</div>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}