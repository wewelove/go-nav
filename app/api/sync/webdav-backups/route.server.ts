import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/server/api-auth";
import { deleteWebDavBackup, listWebDavBackups } from "@/lib/server/data-sync";

export async function GET() {
	if (!(await requireAdminAuth())) {
		return NextResponse.json({ error: "未登录" }, { status: 401 });
	}
	try {
		return NextResponse.json({ items: await listWebDavBackups() });
	} catch (e) {
		return NextResponse.json({ error: (e as Error).message }, { status: 400 });
	}
}

export async function DELETE(req: Request) {
	if (!(await requireAdminAuth())) {
		return NextResponse.json({ error: "未登录" }, { status: 401 });
	}
	let body: { path?: unknown };
	try {
		body = (await req.json()) as { path?: unknown };
	} catch {
		return NextResponse.json({ error: "invalid body" }, { status: 400 });
	}
	if (typeof body.path !== "string" || !body.path.trim()) {
		return NextResponse.json({ error: "path 参数无效" }, { status: 400 });
	}
	try {
		await deleteWebDavBackup(body.path);
		return NextResponse.json({ ok: true });
	} catch (e) {
		return NextResponse.json({ error: (e as Error).message }, { status: 400 });
	}
}
