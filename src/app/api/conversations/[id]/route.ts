import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/conversations/:id - Get a conversation with all messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  // Parse ads from messages
  const messagesWithAds = conversation.messages.map((msg) => ({
    ...msg,
    ads: msg.adsGenerated ? JSON.parse(msg.adsGenerated) : undefined,
  }));

  return NextResponse.json({ ...conversation, messages: messagesWithAds });
}

// PATCH /api/conversations/:id - Add a message to a conversation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  try {
    const { message, title } = await request.json();

    // Update title if provided
    if (title) {
      await prisma.conversation.update({
        where: { id },
        data: { title },
      });
    }

    // Add message if provided
    if (message) {
      await prisma.message.create({
        data: {
          role: message.role,
          content: message.content,
          adsGenerated: message.ads ? JSON.stringify(message.ads) : null,
          conversationId: id,
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update conversation error:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/:id - Delete a conversation
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  await prisma.conversation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
