import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    include: { ads: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  try {
    const data = await request.json();
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.platform !== undefined && { platform: data.platform }),
        ...(data.budget !== undefined && { budget: data.budget }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Update campaign error:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await prisma.campaign.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
