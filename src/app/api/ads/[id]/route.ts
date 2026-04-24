import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.ad.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }

  await prisma.ad.delete({ where: { id } });

  return NextResponse.json({ success: true });
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

  const existing = await prisma.ad.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }

  try {
    const data = await request.json();
    const ad = await prisma.ad.update({
      where: { id },
      data: {
        ...(data.headline !== undefined && { headline: data.headline }),
        ...(data.primaryText !== undefined && { primaryText: data.primaryText }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.callToAction !== undefined && { callToAction: data.callToAction }),
        ...(data.platform !== undefined && { platform: data.platform }),
        ...(data.hashtags !== undefined && {
          hashtags: JSON.stringify(data.hashtags),
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.favorited !== undefined && { favorited: data.favorited }),
        ...(data.published !== undefined && { published: data.published }),
        ...(data.campaignId !== undefined && { campaignId: data.campaignId }),
      },
    });

    return NextResponse.json({ ...ad, hashtags: JSON.parse(ad.hashtags) });
  } catch (error) {
    console.error("Update ad error:", error);
    return NextResponse.json(
      { error: "Failed to update ad" },
      { status: 500 }
    );
  }
}
