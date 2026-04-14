import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await requireAuth(request);
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    return NextResponse.json({ error: err.message || "Unauthorized" }, { status: err.status || 401 });
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
  } catch (error: unknown) {
    console.error(`[API/view] Error updating last_viewed_at for note ${id}:`, error);
    return handleError(error);
  }
}
