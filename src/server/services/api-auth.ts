import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/services/auth";

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  return { user, response: null };
}
