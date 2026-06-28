import { NextResponse, type NextRequest } from "next/server";
import { generateLeaveApplicationPdf } from "@/lib/hr/leave-pdf";
import type { LeaveApplication, LeaveApproval } from "@/lib/hr/leave-types";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await generateAndStoreLeavePdf(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.redirect(result.signedUrl);
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await generateAndStoreLeavePdf(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ pdf_url: result.pdfUrl, signedUrl: result.signedUrl });
}

async function generateAndStoreLeavePdf(id: string): Promise<
  | { pdfUrl: string; signedUrl: string }
  | { error: string; status: number }
> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Sign in is required to generate leave PDFs.", status: 401 };

    const { data: application, error: applicationError } = await supabase
      .from("leave_applications")
      .select("*")
      .eq("id", id)
      .single();
    if (applicationError || !application) return { error: applicationError?.message ?? "Leave application was not found.", status: 404 };

    const { data: approval, error: approvalError } = await supabase
      .from("leave_approvals")
      .select("*")
      .eq("leave_application_id", id)
      .maybeSingle();
    if (approvalError) return { error: approvalError.message, status: 400 };

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("join_date")
      .eq("id", (application as LeaveApplication).employee_id)
      .maybeSingle();
    if (employeeError) return { error: employeeError.message, status: 400 };

    const pdf = await generateLeaveApplicationPdf({
      application: application as LeaveApplication,
      approval: (approval ?? null) as LeaveApproval | null,
      employee: employee ?? null
    });

    const requestNo = sanitizeFilename((application as LeaveApplication).request_no);
    const objectPath = `hr/leave-applications/${id}/${requestNo}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(objectPath, pdf, {
        contentType: "application/pdf",
        upsert: true
      });
    if (uploadError) return { error: `PDF generated but could not be stored: ${uploadError.message}`, status: 400 };

    const [{ error: appUpdateError }, approvalUpdate] = await Promise.all([
      supabase.from("leave_applications").update({ pdf_url: objectPath }).eq("id", id),
      approval
        ? supabase.from("leave_approvals").update({ pdf_url: objectPath }).eq("leave_application_id", id)
        : Promise.resolve({ error: null })
    ]);
    if (appUpdateError) return { error: appUpdateError.message, status: 400 };
    if (approvalUpdate.error) return { error: approvalUpdate.error.message, status: 400 };

    const { data: signed, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUrl(objectPath, 600);
    if (signedError || !signed?.signedUrl) return { error: signedError?.message ?? "Unable to open generated PDF.", status: 400 };

    return { pdfUrl: objectPath, signedUrl: signed.signedUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate leave application PDF.", status: 500 };
  }
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "leave-application";
}
