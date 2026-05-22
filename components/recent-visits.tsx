"use client";

import { Button } from "@heroui/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayoutConfig } from "@/types";
import { useRecentVisits } from "@/hooks/use-recent-visits";
import { useSiteLinkMode } from "@/lib/client/site-link";
import { SiteCard } from "./site-card";

function parseCssSizeToPx(value: string, fallback = 16) {
	const n = parseFloat(value);
	if (Number.isNaN(n)) return fallback;
	if (/rem$/.test(value)) return n * 16;
	return n;
}

const MAX_ROWS_CAP = 5;
const GRID_GAP = 12;

const ROW_BREAKPOINTS: { min: number; rows: number }[] = [
	{ min: 1400, rows: 1 },
	{ min: 1000, rows: 2 },
	{ min: 700, rows: 3 },
	{ min: 450, rows: 4 },
	{ min: 0, rows: 5 },
];

function getMaxRows(width: number): number {
	for (const bp of ROW_BREAKPOINTS) {
		if (width >= bp.min) return bp.rows;
	}
	return MAX_ROWS_CAP;
}

export const RecentVisits = memo(function RecentVisits({
	maxItems = 20,
	cardMinWidth = "160px",
	cardHeight = "64px",
	cardGridPadding = "8px",
	sectionGap = "16px",
	delay = 150,
	disableEntranceAnimation = false,
	layout,
}: {
	maxItems?: number;
	cardMinWidth?: string;
	cardHeight?: string;
	cardGridPadding?: string;
	sectionGap?: string;
	delay?: number;
	disableEntranceAnimation?: boolean;
	layout?: Required<LayoutConfig>;
}) {
	const { visits, clearVisits, mounted } = useRecentVisits();
	const siteLinkMode = useSiteLinkMode();
	const innerRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const displayCountRafRef = useRef(0);
	const heightRafRef = useRef(0);
	const lastGridWidthRef = useRef(0);
	const [height, setHeight] = useState("0px");
	const [visible, setVisible] = useState(disableEntranceAnimation);
	const [displayCount, setDisplayCount] = useState(0);

	const hasData = visits.length > 0;
	const displayVisits = useMemo(
		() => visits.slice(0, maxItems),
		[visits, maxItems],
	);
	const totalItems = displayVisits.length;
	const gapPx = parseCssSizeToPx(sectionGap);
	const isPreviewStyle = layout?.cardStyle === "preview";
	const effectiveCardMinWidth = cardMinWidth;
	const effectiveCardHeight = isPreviewStyle ? `calc(${cardHeight} * 2)` : cardHeight;
	const minCardWidthPx = parseCssSizeToPx(cardMinWidth);

	const scheduleHeightUpdate = useCallback(() => {
		if (disableEntranceAnimation) return;
		if (heightRafRef.current) cancelAnimationFrame(heightRafRef.current);
		heightRafRef.current = requestAnimationFrame(() => {
			heightRafRef.current = 0;
			const el = innerRef.current;
			if (!el) return;
			const next = `${el.scrollHeight + gapPx}px`;
			setHeight((prev) => (prev === next ? prev : next));
		});
	}, [disableEntranceAnimation, gapPx]);

	useEffect(() => {
		if (disableEntranceAnimation) {
			setVisible(true);
			return;
		}
		const timer = setTimeout(() => setVisible(true), delay);
		return () => clearTimeout(timer);
	}, [delay, disableEntranceAnimation]);

	useEffect(() => {
		if (!mounted || !visible) return;
		const el = gridRef.current;
		if (!el || totalItems === 0) {
			setDisplayCount((prev) => (prev === 0 ? prev : 0));
			return;
		}

		const update = (width: number, force = false) => {
			if (width === 0) return;
			if (!force && Math.round(width) === lastGridWidthRef.current) return;
			lastGridWidthRef.current = Math.round(width);

			const cols = Math.max(
				1,
				Math.floor((width + GRID_GAP) / (minCardWidthPx + GRID_GAP)),
			);
			const rows = Math.ceil(totalItems / cols);

			const maxRows = getMaxRows(width);
			const capped = rows > maxRows ? cols * maxRows : totalItems;

			setDisplayCount((prev) => (prev === capped ? prev : capped));
		};

		update(el.clientWidth, true);
		const observer = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width ?? el.clientWidth;
			if (displayCountRafRef.current) {
				cancelAnimationFrame(displayCountRafRef.current);
			}
			displayCountRafRef.current = requestAnimationFrame(() => {
				displayCountRafRef.current = 0;
				update(width);
			});
		});
		observer.observe(el);
		return () => {
			observer.disconnect();
			if (displayCountRafRef.current) {
				cancelAnimationFrame(displayCountRafRef.current);
				displayCountRafRef.current = 0;
			}
		};
	}, [mounted, visible, totalItems, minCardWidthPx]);

	useEffect(() => {
		if (!mounted || !visible || disableEntranceAnimation) return;
		const el = innerRef.current;
		if (!el) return;

		scheduleHeightUpdate();
		const observer = new ResizeObserver(scheduleHeightUpdate);
		observer.observe(el);
		return () => {
			observer.disconnect();
			if (heightRafRef.current) {
				cancelAnimationFrame(heightRafRef.current);
				heightRafRef.current = 0;
			}
		};
	}, [disableEntranceAnimation, mounted, scheduleHeightUpdate, visible]);

	useEffect(() => {
		if (!mounted || !visible || disableEntranceAnimation) return;
		scheduleHeightUpdate();
	}, [
		disableEntranceAnimation,
		displayCount,
		mounted,
		scheduleHeightUpdate,
		visible,
		visits.length,
	]);

	const visibleVisits = useMemo(
		() =>
			displayCount > 0
				? displayVisits.slice(0, displayCount)
				: displayVisits,
		[displayCount, displayVisits],
	);

	if (!mounted || !hasData) return null;

	return (
		<div
			className="transition-all duration-300 ease-out"
			style={{
				height: disableEntranceAnimation ? "auto" : height,
				opacity: visible ? 1 : 0,
				transition: disableEntranceAnimation
					? "none"
					: visible
					? "opacity 300ms ease-out, height 300ms ease-out"
					: "none",
			}}
		>
			<div ref={innerRef}>
				<section className="mb-4">
					<div className="mb-3 flex items-center justify-between px-3">
						<h2 className="font-semibold text-nowrap text-xl">最近访问</h2>
						<Button
							variant="tertiary"
							size="sm"
							className="text-xs text-muted"
							onPress={clearVisits}
						>
							清空
						</Button>
					</div>
					<div style={{ padding: `8px ${cardGridPadding}` }}>
						<div
							ref={gridRef}
							className="grid gap-3"
							style={{
								gridTemplateColumns: `repeat(auto-fill, minmax(${effectiveCardMinWidth}, 1fr))`,
								gridAutoRows: effectiveCardHeight,
							}}
						>
							{visibleVisits.map((v) => (
								<SiteCard
									key={`${v.url}::${v.title}`}
									site={v}
									trackVisit={false}
									layout={layout}
									siteLinkMode={siteLinkMode}
								/>
							))}
						</div>
					</div>
				</section>
			</div>
		</div>
	);
});
