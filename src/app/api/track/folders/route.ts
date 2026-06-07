import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .selectFrom("tracked_wallet_folders")
    .selectAll()
    .where("user_id", "=", session.userId)
    .orderBy("sort_order", "asc")
    .orderBy("created_at", "asc")
    .execute();

  return NextResponse.json({
    folders: rows.map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
      createdAt: row.created_at.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Folder name required" }, { status: 400 });
  }

  const db = getDb();
  const maxOrder = await db
    .selectFrom("tracked_wallet_folders")
    .select((eb) => eb.fn.max("sort_order").as("max"))
    .where("user_id", "=", session.userId)
    .executeTakeFirst();

  const row = await db
    .insertInto("tracked_wallet_folders")
    .values({
      user_id: session.userId,
      name: name.slice(0, 80),
      sort_order: Number(maxOrder?.max ?? 0) + 1,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return NextResponse.json({
    folder: {
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
      createdAt: row.created_at.toISOString(),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: number; name?: string };
  if (!body.id) {
    return NextResponse.json({ error: "Folder id required" }, { status: 400 });
  }

  const db = getDb();
  const updates: { name?: string } = {};
  if (body.name?.trim()) updates.name = body.name.trim().slice(0, 80);

  const row = await db
    .updateTable("tracked_wallet_folders")
    .set(updates)
    .where("id", "=", body.id)
    .where("user_id", "=", session.userId)
    .returningAll()
    .executeTakeFirst();

  if (!row) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  return NextResponse.json({
    folder: {
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
      createdAt: row.created_at.toISOString(),
    },
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Folder id required" }, { status: 400 });
  }

  const db = getDb();
  await db
    .updateTable("tracked_wallets")
    .set({ folder_id: null })
    .where("user_id", "=", session.userId)
    .where("folder_id", "=", id)
    .execute();

  await db
    .deleteFrom("tracked_wallet_folders")
    .where("id", "=", id)
    .where("user_id", "=", session.userId)
    .execute();

  return NextResponse.json({ ok: true });
}
