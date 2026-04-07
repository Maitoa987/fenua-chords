import Link from "next/link";

interface MobileMenuProps {
  onClose: () => void;
}

export function MobileMenu({ onClose }: MobileMenuProps) {
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
      <Link href="/connexion" onClick={onClose} className="block py-2 text-text-muted hover:text-primary transition-colors duration-200">
        Connexion
      </Link>
    </nav>
  );
}
