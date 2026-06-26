"use server";

import { createClient } from "@/app/lib/supabase/server";

import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",

    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    },
  });

  if (error) {
    return {
      error: formatAuthError(error.message),
    };
  }

  redirect(data.url);
}

export async function signUpWithEmail(formData) {
  const supabase = await createClient();

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") || "");

  const fullName = String(formData.get("fullName") || "").trim();

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    return {
      error: "An account with this email already exists. Try signing in instead.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,

    options: {
      data: {
        full_name: fullName,
      },

      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    },
  });

  if (error) {
    return {
      error: formatAuthError(error.message),
    };
  }

  const userAlreadyExists =
    data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;

  if (userAlreadyExists) {
    return {
      error: "An account with this email already exists. Try signing in instead.",
    };
  }

  return {
    success: data?.session
      ? "Account created. Redirecting to your dashboard."
      : "Account created. Please check your email to verify your account.",
    redirectTo: data?.session ? "/dashboard" : null,
  };
}

export async function signInWithEmail(formData) {
  const supabase = await createClient();

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") || "");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: formatAuthError(error.message),
    };
  }

  revalidatePath("/", "layout");

  redirect("/dashboard");
}

export async function sendResetPasswordEmail(formData) {
  const supabase = await createClient();

  const email = formData.get("email");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/update-password`,
  });

  if (error) {
    return {
      error: formatAuthError(error.message),
    };
  }

  return {
    success: true,
  };
}

export async function updatePassword(formData) {
  const supabase = await createClient();

  const password = formData.get("password");
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      error: formatAuthError(error.message),
    };
  }

  return {
    success: true,
  };
}

export async function signOutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");

  redirect("/");
}

function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Za-z]/.test(value)) {
    return "Password must include at least one letter.";
  }
  if (!/\d/.test(value)) {
    return "Password must include at least one number.";
  }
  return "";
}

function formatAuthError(message = "") {
  const error = String(message).toLowerCase();

  if (error.includes("invalid login credentials")) {
    return "The email or password you entered is incorrect.";
  }
  if (error.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (
    error.includes("user already registered") ||
    error.includes("already registered") ||
    error.includes("already exists")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (error.includes("password should be")) {
    return "Password must be at least 8 characters long and include a letter and a number.";
  }
  if (error.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return "Something went wrong. Please try again.";
}
