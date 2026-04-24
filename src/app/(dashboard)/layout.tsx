"use client";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-200",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
