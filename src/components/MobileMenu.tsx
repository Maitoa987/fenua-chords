import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";

interface MobileMenuProps {
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
  isAdmin?: boolean;
  username?: string;
}

export function MobileMenu({ onClose, user, onLogout, isAdmin, username }: MobileMenuProps) {
  return (
    <nav className="md:hidden border-t border-border bg-card p-4 space-y-3">
      <Link
        href="/artistes"
        onClick={onClose}
        className={buttonVariants({ variant: "ghost", className: "w-full justify-start" })}
      >
        Artistes
      </Link>
      <Link
        href="/chansons"
        onClick={onClose}
        className={buttonVariants({ variant: "ghost", className: "w-full justify-start" })}
      >
        Chansons
      </Link>
      <Link
        href="/contribuer"
        onClick={onClose}
        className={buttonVariants({ variant: "default", className: "w-full bg-accent hover:bg-accent/90 text-white" })}
      >
        Ajouter un chant
      </Link>
      {user && (
        <>
          {username && <p className="font-medium text-sm py-2 px-3">{username}</p>}
          <Link
            href="/profil"
            onClick={onClose}
            className={buttonVariants({ variant: "ghost", className: "w-full justify-start" })}
          >
            Mon profil
          </Link>
          <Link
            href="/mes-contributions"
            onClick={onClose}
            className={buttonVariants({ variant: "ghost", className: "w-full justify-start" })}
          >
            Mes contributions
          </Link>
          <Link
            href="/playlists"
            onClick={onClose}
            className={buttonVariants({ variant: "ghost", className: "w-full justify-start" })}
          >
            Ma playlist
          </Link>
        </>
      )}
      {isAdmin && (
        <Link
          href="/admin"
          onClick={onClose}
          className={buttonVariants({ variant: "ghost", className: "w-full justify-start" })}
        >
          Admin
        </Link>
      )}
      {user ? (
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => { onClose(); onLogout(); }}
        >
          Deconnexion
        </Button>
      ) : (
        <Link
          href="/connexion"
          onClick={onClose}
          className={buttonVariants({ variant: "ghost", className: "w-full justify-start" })}
        >
          Connexion
        </Link>
      )}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <ThemeToggle />
        <span className="text-sm text-muted-foreground">Thème</span>
      </div>
    </nav>
  );
}
