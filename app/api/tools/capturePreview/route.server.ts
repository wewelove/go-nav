import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/server/auth";
import { saveUpload } from "@/lib/server/store";

const MAX_PREVIEW_SIZE = 8 * 1024 * 1024;
const REQUEST_TIMEOUT = 35_000;
const PREVIEW_MAX_WIDTH = 1280;
const PREVIEW_MAX_HEIGHT = 900;

function withTimeout(ms: number) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);
	return {
		signal: controller.signal,
		done: () => clearTimeout(timer),
	};
}

function normalizeTargetUrl(raw: string): string {
	const trimmed = raw.trim();
	const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	const parsed = new URL(candidate);
	if (!/^https?:$/i.test(parsed.protocol)) {
		throw new Error("仅支持 http / https 地址");
	}
	return parsed.toString();
}

function contentTypeToExt(type: string): string {
	const lower = type.toLowerCase();
	if (lower.includes("webp")) return ".webp";
	if (lower.includes("png")) return ".png";
	if (lower.includes("gif")) return ".gif";
	if (lower.includes("avif")) return ".avif";
	if (lower.includes("jpeg") || lower.includes("jpg")) return ".jpg";
	return ".jpg";
}

async function compressPreviewImage(
	bytes: Buffer,
	contentType: string,
): Promise<{ bytes: Buffer; ext: string }> {
	if (contentType.toLowerCase().includes("svg")) {
		return { bytes, ext: ".svg" };
	}
	try {
		const sharpMod = (await import("sharp")).default;
		const meta = await sharpMod(bytes, { failOn: "none" }).metadata();
		const width = meta.width ?? PREVIEW_MAX_WIDTH;
		const height = meta.height ?? PREVIEW_MAX_HEIGHT;

		const compressed = await sharpMod(bytes, { failOn: "none" })
			.rotate()
			.resize({
				width: Math.min(width, PREVIEW_MAX_WIDTH),
				height: Math.min(height, PREVIEW_MAX_HEIGHT),
				fit: "inside",
				withoutEnlargement: true,
			})
			.webp({ quality: 80, effort: 4 })
			.toBuffer();

		// 如果压缩结果不够划算，保留原图，避免无意义的转码损耗。
		if (compressed.length >= bytes.length * 0.95) {
			return { bytes, ext: contentTypeToExt(contentType) };
		}
		return { bytes: compressed, ext: ".webp" };
	} catch {
		return { bytes, ext: contentTypeToExt(contentType) };
	}
}

function buildScreenshotSources(targetUrl: string): string[] {
	const encoded = encodeURIComponent(targetUrl);
	return [
		`https://image.thum.io/get/width/1366/crop/860/noanimate/${targetUrl}`,
		`https://s.wordpress.com/mshots/v1/${encoded}?w=1366`,
	];
}

async function tryFetchImage(url: string) {
	const { signal, done } = withTimeout(REQUEST_TIMEOUT);
	try {
		const res = await fetch(url, {
			method: "GET",
			signal,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
			},
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);

		const contentType = res.headers.get("content-type") || "";
		if (!contentType.toLowerCase().startsWith("image/")) {
			throw new Error("返回结果不是图片");
		}

		const bytes = Buffer.from(await res.arrayBuffer());
		if (bytes.length === 0) throw new Error("截图内容为空");
		if (bytes.length > MAX_PREVIEW_SIZE) throw new Error("截图文件过大");

		return { bytes, contentType };
	} finally {
		done();
	}
}

/**
 * 自动获取网站首屏截图并保存到 uploads。
 * POST /api/tools/capturePreview
 * Body: { url: string }
 */
export async function POST(req: Request) {
	const store = await cookies();
	if (!verifySession(store.get(SESSION_COOKIE)?.value)) {
		return NextResponse.json({ error: "未登录" }, { status: 401 });
	}

	try {
		const body = (await req.json()) as { url?: string };
		if (!body?.url) {
			return NextResponse.json({ error: "缺少 url" }, { status: 400 });
		}

		const targetUrl = normalizeTargetUrl(body.url);
		const candidates = buildScreenshotSources(targetUrl);
		let lastError = "截图失败";

		for (const source of candidates) {
			try {
				const { bytes, contentType } = await tryFetchImage(source);
				const compressed = await compressPreviewImage(bytes, contentType);
				const host = new URL(targetUrl).hostname.replace(/[^a-z0-9.-]/gi, "-");
				if (compressed.bytes.length > MAX_PREVIEW_SIZE) {
					throw new Error("压缩后截图仍过大");
				}
				const url = saveUpload(
					`preview-${host}${compressed.ext}`,
					compressed.bytes,
				);
				return NextResponse.json({ url });
			} catch (e) {
				lastError = (e as Error).message || lastError;
			}
		}

		return NextResponse.json(
			{ error: `获取首屏截图失败：${lastError}` },
			{ status: 400 },
		);
	} catch (e) {
		return NextResponse.json({ error: (e as Error).message }, { status: 500 });
	}
}
