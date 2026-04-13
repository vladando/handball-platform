// app/api/player/verification/route.ts
// Player submits passport + selfie for identity verification.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveVerificationDoc, deleteLocalFile } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PLAYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const player = await prisma.player.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, verificationStatus: true, passportUrl: true, selfieUrl: true },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Already verified — no need to resubmit
  if (player.verificationStatus === "VERIFIED") {
    return NextResponse.json({ error: "Account is already verified." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const passport = formData.get("passport");
  const selfie   = formData.get("selfie");

  if (!passport || !(passport instanceof File)) {
    return NextResponse.json({ error: "Passport photo is required." }, { status: 422 });
  }
  if (!selfie || !(selfie instanceof File)) {
    return NextResponse.json({ error: "Selfie photo is required." }, { status: 422 });
  }

  const userId = (session.user as any).id as string;

  // Save passport
  const passportResult = await saveVerificationDoc(userId, passport, "passport");
  if (passportResult.error) return NextResponse.json({ error: passportResult.error }, { status: 422 });

  // Save selfie
  const selfieResult = await saveVerificationDoc(userId, selfie, "selfie");
  if (selfieResult.error) {
    deleteLocalFile(passportResult.url!);
    return NextResponse.json({ error: selfieResult.error }, { status: 422 });
  }

  // Clean up old docs if resubmitting
  if (player.passportUrl) deleteLocalFile(player.passportUrl);
  if (player.selfieUrl)   deleteLocalFile(player.selfieUrl);

  await prisma.player.update({
    where: { id: player.id },
    data: {
      passportUrl: passportResult.url,
      selfieUrl:   selfieResult.url,
      verificationStatus: "PENDING",
      verificationNote: null, // clear previous rejection note
    },
  });

  return NextResponse.json({ ok: true, status: "PENDING" });
}
