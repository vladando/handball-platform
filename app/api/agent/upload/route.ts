import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveVerificationDoc } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "AGENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = formData.get("file");
  if (!file || !(file instanceof File))
    return NextResponse.json({ error: "File is required." }, { status: 422 });

  const userId = (session.user as any).id as string;
  const result = await saveVerificationDoc(userId, file, "agent-doc");
  if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });

  return NextResponse.json({ url: result.url });
}
