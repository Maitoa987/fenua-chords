import Link from "next/link";
import type { User } from "@supabase/supabase-js";

interface MobileMenuProps {
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

export function MobileMenu({ onClose, user, onLogout }: MobileMenuProps) {
  return (
    <nav className="md:hidden border-t border-primary/10 bg-surface p-4 space-y-3">
      <Link href="/artistes" onClick={onClose} className="block py-2 text-text-muted hover:text-primary transition-colors duration-200">
        Artistes
      </Link>
      <Link href="/chansons" onClick={onClose} className="block py-2 text-text-muted hover:text-primary transition-colors duration-200">
        Chansons
      </Link>
      <Link href="/contribuer" onClick={onClose} className="block py-2 bg-cta text-white text-center rounded-lg font-semibold cursor-pointer">
        Contribuer
      </Link>
      {user ? (
        <button
          onClick={() => { onClose(); onLogout(); }}
          className="block w-full py-2 text-left text-text-muted hover:text-primary transition-colors duration-200 cursor-pointer"
        >
          Deconnexion
        </button>
      ) : (
        <Link href="/connexion" onClick={onClose} className="block py-2 text-text-muted hover:text-primary transition-colors duration-200">
          Connexion
        </Link>
      )}
    </nav>
  );
}
