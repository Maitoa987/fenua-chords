"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { User, LogOut, Settings, FileText, Shield, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  username: string;
  isAdmin: boolean;
  onLogout: () => void;
}

export function UserMenu({ username, isAdmin, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu utilisateur"
        className="flex items-center gap-2"
      >
        <User className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-medium">
          {username || "Mon compte"}
        </span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 z-50 bg-card border border-border shadow-lg rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold truncate">{username || "Mon compte"}</p>
          </div>

          <div className="py-1">
            <Link
              href="/profil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              Mon profil
            </Link>
            <Link
              href="/mes-contributions"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              Mes contributions
            </Link>
            <Link
              href="/playlists"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <ListMusic className="w-4 h-4 text-muted-foreground" />
              Ma playlist
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Shield className="w-4 h-4 text-muted-foreground" />
                Administration
              </Link>
            )}
          </div>

          <div className="border-t border-border py-1">
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Deconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
