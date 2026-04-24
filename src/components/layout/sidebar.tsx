"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import {
  LayoutDashboard,
  Sparkles,
  FolderOpen,
  Image,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  X,
} from "lucide-react";
import type { NavItem } from "@/types";

const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Generate Ad", href: "/dashboard/generate", icon: Sparkles, badge: "AI" },
  { title: "Campaigns", href: "/dashboard/campaigns", icon: FolderOpen },
  { title: "Ads", href: "/dashboard/ads", icon: Image },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

const bottomNav: NavItem[] = [
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
  { title: "Help", href: "/dashboard/help", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, toggleCollapse, closeSidebar } =
    useUIStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
          sidebarCollapsed ? "w-16" : "w-64",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold">A</span>
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-bold text-sidebar-foreground">
                Alvertise
              </span>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={closeSidebar}
            className="lg:hidden text-sidebar-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Collapse button on desktop */}
          <button
            onClick={toggleCollapse}
            className={cn(
              "hidden lg:flex h-6 w-6 items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors",
              sidebarCollapsed && "hidden"
            )}
          >
            <ChevronLeft className="h-4 w-4 text-sidebar-foreground" />
          </button>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              collapsed={sidebarCollapsed}
              onClick={closeSidebar}
            />
          ))}
        </nav>

        {/* Bottom navigation */}
        <nav className="border-t border-sidebar-border p-3 space-y-1">
          {bottomNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              collapsed={sidebarCollapsed}
              onClick={closeSidebar}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.title : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
