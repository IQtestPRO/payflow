import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "PayFlow",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
    time: new Date().toISOString()
  });
}
