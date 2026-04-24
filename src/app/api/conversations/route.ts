import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/conversations - List all conversations
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(conversations);
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, messages } = await request.json();

    const conversation = await prisma.conversation.create({
      data: {
        title: title || "New Conversation",
        userId: session.user.id,
        messages: {
          create: (messages || []).map(
            (msg: { role: string; content: string; ads?: unknown }) => ({
              role: msg.role,
              content: msg.content,
              adsGenerated: msg.ads ? JSON.stringify(msg.ads) : null,
            })
          ),
        },
      },
      include: { messages: true },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
