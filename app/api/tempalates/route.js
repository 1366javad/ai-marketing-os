import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "all";

    const supabase = await createClient();

    let query = supabase.from("templates").select("*").eq("is_public", true);

    if (category !== "all" && category !== "All Categories") {
      query = query.eq("category", category);
    }

    const { data, error } = await query.order("used_count", {
      ascending: false,
    });

    if (error) throw error;

    let items = data || [];

    if (search) {
      const q = search.toLowerCase();

      items = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q),
      );
    }

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("templates")
      .insert({
        title: body.title,
        description: body.description,
        category: body.category,
        tone: body.tone,
        prompt: body.prompt,
        icon: body.icon || "FileText",
        used_count: 0,
        is_public: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      template: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
