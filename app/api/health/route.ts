import { NextResponse } from "next/server";

export function GET() { return NextResponse.json({ status: "ok", service: "medtech-erp", time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
