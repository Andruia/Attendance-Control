"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { syncManager } from "@/lib/offline/syncManager";

const employeeLinks = [
  { href: "/clock", label: "Clock" },
  { href: "/history", label: "History" },
];

const supervisorLinks = [
  { href: "/clock", label: "Clock" },
  { href: "/history", label: "History" },
  { href: "/team", label: "Team" },
];

const adminLinks = [
  { href: "/clock", label: "Clock" },
  { href: "/history", label: "History" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
  { href: "/users", label: "Users" },
  { href: "/reports", label: "Reports" },
];

export function NavBar() {
  const pathname = usePathname();
  const { role, name, logout } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const update = async () => setPendingCount(await syncManager.getPendingCount());
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  const links =
    role === "admin" ? adminLinks : role === "supervisor" ? supervisorLinks : employeeLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <Link href="/" className="mr-6 flex items-center space-x-2 font-semibold">
          Attendance
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge variant="warning">{pendingCount} pending</Badge>
          )}

          <span className="text-sm text-muted-foreground">{name}</span>

          <Button onClick={logout} variant="ghost" size="sm">
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
