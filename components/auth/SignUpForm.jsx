"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

import { signInWithGoogle, signUpWithEmail } from "@/app/actions/auth";

import {
  Sparkles,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import ThemeToggle from "../layout/ThemeToggle";

function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isPending || googlePending) return;

    const formData = new FormData(e.currentTarget);

    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password mismatch",
        description: "Password and Confirm Password must match.",
      });

      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        variant: "destructive",
        title: "Password is too weak",
        description: passwordError,
      });

      return;
    }

    startTransition(async () => {
      const result = await signUpWithEmail(formData);

      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: result.error,
        });

        return;
      }

      toast({
        variant: "success",
        title: "Account created",
        description: result?.success || "Account created successfully.",
      });

      if (result?.redirectTo) {
        router.replace(result.redirectTo);
      }
    });
  };

  return (
    <div
      className={`
            relative w-full max-w-lg rounded-2xl border p-8 shadow-2xl z-10
            bg-white border-slate-200/60 shadow-slate-200/60
            dark:bg-gray-900 dark:border-gray-800 dark:shadow-gray-950/50
          `}
    >
      {/* Header / Branding */}
      <div className="flex flex-col items-center mb-7">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
          <Sparkles className="w-7 h-7 text-white" />
          <div className="top-4 absolute right-10 ">
            <ThemeToggle />
          </div>
        </div>
        <h1 className="text-xl font-bold text-center text-slate-900 dark:text-white">
          Create your
        </h1>
        <p className="text-lg font-semibold bg-gradient-to-r from-[#3B3CFF] to-[#FF6B6B] bg-clip-text text-transparent text-center">
          AI Content Studio account
        </p>
      </div>

      {/* Google Sign Up */}
      <form action={signInWithGoogle}>
        <button
          type="submit"
          disabled={googlePending || isPending}
          onClick={() => setGooglePending(true)}
          className={`
              w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border font-medium text-sm
              transition-all duration-200 mb-5 bg-white border-slate-200 text-slate-700
              hover:bg-slate-50 shadow-sm
              dark:bg-gray-800 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-gray-700
              disabled:cursor-not-allowed disabled:opacity-70
            `}
        >
          {googlePending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {googlePending ? "Redirecting..." : "Sign up with Google"}
        </button>
      </form>
      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-slate-200 dark:bg-gray-700" />
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
          or create with email
        </span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-gray-700" />
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              name="fullName"
              placeholder="Jane Smith"
              required
              disabled={isPending || googlePending}
              className={`
                    w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200
                    bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400
                    focus:border-[#3B3CFF]/50 focus:bg-white focus:ring-2 focus:ring-[#3B3CFF]/10
                    dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
                    dark:focus:border-indigo-400/50 dark:focus:ring-indigo-500/20
                  `}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              disabled={isPending || googlePending}
              className={`
                    w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200
                    bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400
                    focus:border-[#3B3CFF]/50 focus:bg-white focus:ring-2 focus:ring-[#3B3CFF]/10
                    dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
                    dark:focus:border-indigo-400/50 dark:focus:ring-indigo-500/20
                  `}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="********"
              required
              disabled={isPending || googlePending}
              className={`
                    w-full pl-10 pr-11 py-3 rounded-xl border text-sm outline-none transition-all duration-200
                    bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400
                    focus:border-[#3B3CFF]/50 focus:bg-white focus:ring-2 focus:ring-[#3B3CFF]/10
                    dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
                    dark:focus:border-indigo-400/50 dark:focus:ring-indigo-500/20
                  `}
            />
            <button
              type="button"
              disabled={isPending || googlePending}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="********"
              required
              disabled={isPending || googlePending}
              className={`
                    w-full pl-10 pr-11 py-3 rounded-xl border text-sm outline-none transition-all duration-200
                    bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400
                    focus:border-[#3B3CFF]/50 focus:bg-white focus:ring-2 focus:ring-[#3B3CFF]/10
                    dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
                    dark:focus:border-indigo-400/50 dark:focus:ring-indigo-500/20
                  `}
            />
            <button
              type="button"
              disabled={isPending || googlePending}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending || googlePending}
          className={`
                group w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#5B5CFF]
                text-white font-semibold text-sm mt-1
                hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200
                flex items-center justify-center gap-2
                dark:from-indigo-600 dark:to-indigo-500
              `}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          )}
          {isPending ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm mt-5 text-slate-400 dark:text-slate-500">
        Already have an account?
        <Link
          href="/signin"
          className="text-[#3B3CFF] hover:text-[#5B5CFF] font-medium transition-colors dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs mt-6 text-slate-300 dark:text-slate-600">
        © 2026 AI Content Studio
      </p>
    </div>
  );
}

function validatePassword(password) {
  if (password.length < 8) {
    return "Use at least 8 characters.";
  }

  if (!/[A-Za-z]/.test(password)) {
    return "Use at least one letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Use at least one number.";
  }

  return null;
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default SignUpForm;
