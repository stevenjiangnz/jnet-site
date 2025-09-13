"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

interface NavbarProps {
  user: { email?: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <nav className="navbar shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold navbar-title">
              JNet Solution
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {user ? (
              <>
                <span className="text-sm navbar-text">
                  Hello, {user.email}
                </span>
                <Link
                  href="/dashboard"
                  className="text-sm navbar-link"
                >
                  Dashboard
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-sm navbar-link"
                  >
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm navbar-link"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}