"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { UserMenu } from "./UserMenu";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase.from("profiles").select("role, username").eq("id", user.id).single()
          .then(({ data }) => {
            if (data?.role === "admin") setIsAdmin(true)
            if (data?.username) setUsername(data.username)
          })
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) { setIsAdmin(false); setUsername(""); }
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
        <Link href="/">
          <Image src="/logo-text.png" alt="Fenua Chords" width={140} height={40} className="h-10 w-auto" />
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
            <UserMenu username={username} isAdmin={isAdmin} onLogout={handleLogout} />
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
          isAdmin={isAdmin}
          username={username}
        />
      )}
    </header>
  );
}
