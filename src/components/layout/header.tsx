"use client";

import { usePathname } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const pageTitles: Record<string, string> = {
  "/dashboard": "Prospecting",
  "/dashboard/analytics": "Analytics",
  "/dashboard/chains": "Chains",
  "/dashboard/import": "Import Data",
  "/dashboard/review": "Review Queue",
};

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 bg-background">
      <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileMenuToggle}
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          <h1 className="font-heading text-lg font-semibold truncate">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            user@company.com
          </span>
          <Button variant="ghost" size="icon-sm">
            <LogOut className="size-4" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </div>
      <Separator />
    </header>
  );
}
