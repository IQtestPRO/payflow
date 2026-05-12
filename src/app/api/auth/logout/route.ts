import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/services/auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true, redirectTo: "/login" });
}
