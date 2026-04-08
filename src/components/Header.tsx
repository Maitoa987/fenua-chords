"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Music, User, LogOut } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const navLinks = [
  { href: "/artistes", label: "Artistes" },
  { href: "/chansons", label: "Chansons" },
];

export function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-heading text-xl text-primary">
          <Music className="w-6 h-6" />
          Fenua Chords
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contribuer"
            className={buttonVariants({ variant: "default", className: "bg-accent hover:bg-accent/90 text-white" })}
          >
            Contribuer
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <Link
              href="/connexion"
              className={buttonVariants({ variant: "ghost" })}
            >
              Connexion
            </Link>
          )}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {menuOpen && (
        <MobileMenu
          onClose={() => setMenuOpen(false)}
          user={user}
          onLogout={handleLogout}
        />
      )}
    </header>
  );
}
