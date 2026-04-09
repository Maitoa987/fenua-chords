"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="Thème" disabled />;
  }

  function cycle() {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  }

  const icon =
    theme === "dark" ? <Moon className="w-4 h-4" /> :
    theme === "light" ? <Sun className="w-4 h-4" /> :
    <Monitor className="w-4 h-4" />;

  const label =
    theme === "dark" ? "Mode sombre" :
    theme === "light" ? "Mode clair" :
    "Thème système";

  return (
    <Button variant="ghost" size="icon" className="w-9 h-9" onClick={cycle} aria-label={label} title={label}>
      {icon}
    </Button>
  );
}
