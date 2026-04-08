import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Button, buttonVariants } from "@/components/ui/button";

interface MobileMenuProps {
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
  isAdmin?: boolean;
}

export function MobileMenu({ onClose, user, onLogout, isAdmin }: MobileMenuProps) {
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
        Contribuer
      </Link>
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
    </nav>
  );
}
