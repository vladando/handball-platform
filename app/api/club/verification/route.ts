import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveVerificationDoc, deleteLocalFile } from "@/lib/storage";
import { sendClubDocsSubmittedEmail, sendAdminClubDocsEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLUB")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const club = await prisma.club.findUnique({
    where: { userId: (session.user as any).id },
    select: {
      id: true,
      verificationStatus: true,
      officialDocUrl: true,
      authorizationDocUrl: true,
      representativePassportUrl: true,
    },
  });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  if (club.verificationStatus === "VERIFIED")
    return NextResponse.json({ error: "Club is already verified." }, { status: 400 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const officialDoc   = formData.get("officialDoc");
  const authDoc       = formData.get("authorizationDoc");
  const passport      = formData.get("representativePassport");

  if (!officialDoc || !(officialDoc instanceof File))
    return NextResponse.json({ error: "Official club document is required." }, { status: 422 });
  if (!authDoc || !(authDoc instanceof File))
    return NextResponse.json({ error: "Authorization document is required." }, { status: 422 });
  if (!passport || !(passport instanceof File))
    return NextResponse.json({ error: "Representative passport is required." }, { status: 422 });

  const userId = (session.user as any).id as string;

  const officialResult = await saveVerificationDoc(userId, officialDoc, "club-official");
  if (officialResult.error) return NextResponse.json({ error: officialResult.error }, { status: 422 });

  const authResult = await saveVerificationDoc(userId, authDoc, "club-auth");
  if (authResult.error) {
    deleteLocalFile(officialResult.url!);
    return NextResponse.json({ error: authResult.error }, { status: 422 });
  }

  const passportResult = await saveVerificationDoc(userId, passport, "club-passport");
  if (passportResult.error) {
    deleteLocalFile(officialResult.url!);
    deleteLocalFile(authResult.url!);
    return NextResponse.json({ error: passportResult.error }, { status: 422 });
  }

  // Clean up old docs if resubmitting
  if (club.officialDocUrl)             deleteLocalFile(club.officialDocUrl);
  if (club.authorizationDocUrl)        deleteLocalFile(club.authorizationDocUrl);
  if (club.representativePassportUrl)  deleteLocalFile(club.representativePassportUrl);

  const updatedClub = await prisma.club.update({
    where: { id: club.id },
    data: {
      officialDocUrl:            officialResult.url,
      authorizationDocUrl:       authResult.url,
      representativePassportUrl: passportResult.url,
      verificationStatus:        "PENDING",
      verificationNote:          null,
    },
    include: { user: { select: { email: true } } },
  });

  // Send emails (non-blocking)
  const clubEmail = updatedClub.user?.email;
  if (clubEmail) {
    sendClubDocsSubmittedEmail(clubEmail, updatedClub.name).catch(err =>
      console.error("[club/verification] docs submitted email failed:", err)
    );
    sendAdminClubDocsEmail(updatedClub.name, clubEmail).catch(err =>
      console.error("[club/verification] admin notification failed:", err)
    );
  }

  return NextResponse.json({ ok: true, status: "PENDING" });
}
