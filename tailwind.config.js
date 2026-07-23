/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"], // برای پشتیبانی از next-themes ضروریه
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        card: "var(--color-card)",
        border: "var(--color-border)",
        brand: "var(--color-brand)",
        "brand-2": "var(--color-brand-2)",
        primary: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
          960: "#f59e0b",
          970: "#f97316",
          980: "#14b8a6",
          990: "#ec4899",
        },

        /* ☀️ Light Mode Palette */
        light: {
          bg: "#F9FAFB", // پس‌زمینه کلی
          surface: "#FFFFFF", // سطح یا کارت‌ها
          text: "#111827", // متن اصلی
          muted: "#6B7280", // متن دوم
          border: "#E5E7EB", // خطوط جداکننده
          accent: "#3B82F6", // دکمه‌ها یا لینک‌ها
        },

        /* 🌙 Dark Mode Palette */
        dark: {
          bg: "#0F172A", // پس‌زمینه کلی
          surface: "#1E293B", // سطح کارت‌ها
          text: "#F1F5F9", // متن اصلی
          muted: "#94A3B8", // متن دوم
          emerald: "#10b981",
          border: "#334155", // خطوط جداکننده
          accent: "#6366F1", // دکمه‌ها یا لینک‌ها
        },

        assistant: {
          primary: "#3B3CFF",
          primaryHover: "#3030E0",
          accent: "#7B5CFF",
          surfaceDark: "#13141b",
        },

        campaign: {
          primary: "#3B3CFF",
          primaryLight: "#5B5CFF",
          accent: "#7B5CFF",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
