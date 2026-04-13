import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await requireAuth(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: error.status || 401 });
  }

  const { id } = await params;

  try {
    // 验证所有权并更新 last_viewed_at
    const result = await db.query(
      "UPDATE notes SET last_viewed_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Note not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API/view] Error updating last_viewed_at for note ${id}:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
