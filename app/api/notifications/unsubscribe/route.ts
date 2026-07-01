import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/notifications/unsubscribe
 * Menghapus subscription push notification dari Supabase
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint tidak ditemukan" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await (supabase
      .from("push_subscriptions") as any)
      .delete()
      .eq("endpoint", endpoint);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[Unsubscribe] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus subscription" },
      { status: 500 }
    );
  }
}
