import { useTheme } from "@/features/theme/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  try {
    const { theme, toggleTheme } = useTheme();

    return (
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 dark:from-gray-700 dark:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg border border-gray-300 dark:border-gray-600"
        aria-label="Toggle theme"
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? (
          <Moon className="w-5 h-5 text-gray-700" />
        ) : (
          <Sun className="w-5 h-5 text-yellow-400" />
        )}
      </button>
    );
  } catch (error) {
    // Fallback if theme context is not available
    console.error("ThemeToggle error:", error);
    return (
      <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-xs text-red-700 dark:text-red-300">
        Theme Error
      </div>
    );
  }
}
