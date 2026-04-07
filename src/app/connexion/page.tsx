"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "magic-link";

export default function ConnexionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
      }
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Vérifie ta boite mail pour confirmer ton compte.");
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Lien de connexion envoyé ! Vérifie ta boite mail.");
      }
    }

    setLoading(false);
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 rounded-lg border border-primary/20 bg-surface focus:border-primary text-base outline-none transition-colors duration-200";

  const primaryBtn =
    "w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 cursor-pointer";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl border border-primary/10 p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl text-primary mb-2">
              {mode === "login" && "Connexion"}
              {mode === "signup" && "Créer un compte"}
              {mode === "magic-link" && "Lien magique"}
            </h1>
            <p className="text-text-muted text-sm">
              {mode === "login" && "Accède à ta bibliothèque d'accords"}
              {mode === "signup" && "Rejoins la communauté Fenua Chords"}
              {mode === "magic-link" && "Connexion sans mot de passe"}
            </p>
          </div>

          {/* Mode switcher */}
          <div className="flex gap-1 bg-background rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                mode === "login" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-primary"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                mode === "signup" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-primary"
              }`}
            >
              Inscription
            </button>
            <button
              type="button"
              onClick={() => { setMode("magic-link"); setError(null); setSuccess(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                mode === "magic-link" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-primary"
              }`}
            >
              Lien magique
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            {/* Password (not in magic-link mode) */}
            {mode !== "magic-link" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* Success */}
            {success && (
              <p className="text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg">
                {success}
              </p>
            )}

            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading
                ? "Chargement..."
                : mode === "login"
                ? "Se connecter"
                : mode === "signup"
                ? "Créer mon compte"
                : "Envoyer le lien"}
            </button>
          </form>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors duration-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
