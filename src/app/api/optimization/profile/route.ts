import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildOptimizationSignals } from "@/lib/optimization-learning";

// GET /api/optimization/profile - Return learned optimization defaults for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const signals = await buildOptimizationSignals(session.user.id);
    return NextResponse.json(signals);
  } catch (error) {
    console.error("Optimization profile error:", error);
    return NextResponse.json(
      { error: "Failed to build optimization profile" },
      { status: 500 }
    );
  }
}
