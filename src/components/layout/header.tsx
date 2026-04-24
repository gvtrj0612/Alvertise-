"use client";

import { useUIStore } from "@/store/ui-store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, Moon, Sun, Bell } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function Header() {
  const { toggleSidebar, sidebarCollapsed, theme, setTheme } = useUIStore();
  const { data: session } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop collapse toggle */}
      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-md p-1.5 hover:bg-accent transition-colors"
          >
            <Avatar
              fallback={session?.user?.name || "U"}
              src={session?.user?.image || undefined}
              size="sm"
            />
            <span className="hidden md:block text-sm font-medium">
              {session?.user?.name || "User"}
            </span>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-md border bg-card shadow-lg">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-destructive"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
