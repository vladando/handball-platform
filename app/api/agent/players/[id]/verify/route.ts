// app/api/agent/players/[id]/verify/route.ts
// Agent submits player identity doc + signed contract for admin verification.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveVerificationDoc, deleteLocalFile } from "@/lib/storage";
import { sendAdminPlayerVerificationEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: playerId } = await params;

  // Verify the agent owns this player
  const agent = await prisma.agent.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const player = await prisma.player.findFirst({
    where: { id: playerId, agentId: agent.id },
    select: {
      id: true,
      verificationStatus: true,
      passportUrl: true,
      contractUrl: true,
      firstName: true,
      lastName: true,
      user: { select: { email: true } },
    },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  if (player.verificationStatus === "VERIFIED") {
    return NextResponse.json({ error: "Player is already verified." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const document = formData.get("document");
  const contract = formData.get("contract");

  if (!document || !(document instanceof File)) {
    return NextResponse.json({ error: "Player identity document is required." }, { status: 422 });
  }
  if (!contract || !(contract instanceof File)) {
    return NextResponse.json({ error: "Signed contract is required." }, { status: 422 });
  }

  // Save identity document (reuse passport slot)
  const docResult = await saveVerificationDoc(player.id, document, "passport");
  if (docResult.error) return NextResponse.json({ error: docResult.error }, { status: 422 });

  // Save signed contract (new contractUrl field)
  const contractResult = await saveVerificationDoc(player.id, contract, "contract");
  if (contractResult.error) {
    deleteLocalFile(docResult.url!);
    return NextResponse.json({ error: contractResult.error }, { status: 422 });
  }

  // Clean up old files if resubmitting
  if (player.passportUrl) deleteLocalFile(player.passportUrl);
  if (player.contractUrl) deleteLocalFile(player.contractUrl);

  await prisma.player.update({
    where: { id: player.id },
    data: {
      passportUrl: docResult.url,
      contractUrl: contractResult.url,
      selfieUrl: null, // agent verification doesn't use selfie
      verificationStatus: "PENDING",
      verificationNote: null,
    },
  });

  // Notify admin
  const playerName = [player.firstName, player.lastName].filter(Boolean).join(" ") || "Player";
  const playerEmail = player.user?.email ?? "";
  try {
    await sendAdminPlayerVerificationEmail(playerName, playerEmail);
  } catch {
    // Don't fail the request if email fails
  }

  return NextResponse.json({ ok: true, status: "PENDING" });
}
