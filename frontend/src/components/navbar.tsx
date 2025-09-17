"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

interface NavbarProps {
  user: { email?: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  
  const menuItems = [
    { href: "/price", label: "Price" },
    { href: "/symbols", label: "Symbols" },
    { href: "/screen", label: "Screen" },
    { href: "/analysis", label: "Analysis" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="navbar shadow-sm">
      <div className="w-full px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <Link 
            href="/" 
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <Logo className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-semibold navbar-title">
              JNet Solutions
            </h1>
          </Link>

          {/* Center menu items */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-base font-medium transition-colors ${
                  pathname === item.href
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "navbar-link hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <MobileMenu user={user} />
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm navbar-text">
                    {user.email}
                  </span>
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
      </div>
    </nav>
  );
}