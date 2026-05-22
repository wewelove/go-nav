"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayoutConfig, NavCategory } from "@/types";
import { IconView } from "./icon-view";
import { SiteGrid } from "./site-card";

export const CategorySection = memo(function CategorySection({
	category,
	cardMinWidth = "160px",
	cardHeight = "64px",
	cardGridPadding = "8px",
	showCategoryTitle = true,
	showCategoryDescription = true,
	layout,
	isChild = false,
}: {
	category: NavCategory;
	cardMinWidth?: string;
	cardHeight?: string;
	cardGridPadding?: string;
	showCategoryTitle?: boolean;
	showCategoryDescription?: boolean;
	layout?: Required<LayoutConfig>;
	isChild?: boolean;
}) {
	const hasMultipleChildren = category.children && category.children.length > 1;
	const hasAnyChildren = category.children && category.children.length > 0;
	const useTabs = layout?.showSubcategoryTabs !== false;

	const shouldHideContent =
		!useTabs &&
		hasAnyChildren &&
		!(category.sites && category.sites.length > 0);

	return (
		<section
			id={category.id}
			data-category-id={category.id}
			className="category-anchor scroll-mt-20"
		>
			{showCategoryTitle && (
				<div
					className={`px-3 flex items-center gap-2 ${isChild ? "text-sm" : "*:text-xl"} ${shouldHideContent ? "" : "mb-3"}`}
				>
					<IconView
						icon={category.icon}
						size={isChild ? 16 : 20}
						className="align-text-bottom"
					/>
					<h2
						className={`font-semibold text-nowrap ${isChild ? "text-lg" : ""}`}
					>
						{category.name}
					</h2>
					{showCategoryDescription && category.description ? (
						<span className="text-sm! font-medium text-muted truncate">
							{category.description}
						</span>
					) : null}
				</div>
			)}

			{hasMultipleChildren && useTabs ? (
				<SubcategoryTabs
					category={category}
					cardMinWidth={cardMinWidth}
					cardHeight={cardHeight}
					cardGridPadding={cardGridPadding}
					showCategoryTitle={showCategoryTitle}
					showCategoryDescription={showCategoryDescription}
					layout={layout}
				/>
			) : !shouldHideContent ? (
				<CategoryContent
					category={category}
					cardMinWidth={cardMinWidth}
					cardHeight={cardHeight}
					cardGridPadding={cardGridPadding}
					showCategoryTitle={showCategoryTitle}
					showCategoryDescription={showCategoryDescription}
					layout={layout}
				/>
			) : null}
		</section>
	);
});

function CategoryContent({
	category,
	cardMinWidth,
	cardHeight,
	cardGridPadding,
	showCategoryTitle,
	showCategoryDescription,
	layout,
}: {
	category: NavCategory;
	cardMinWidth: string;
	cardHeight: string;
	cardGridPadding: string;
	showCategoryTitle: boolean;
	showCategoryDescription: boolean;
	layout?: Required<LayoutConfig>;
}) {
	if (category.children && category.children.length === 1) {
		return (
			<SubcategoryContent
				category={category.children[0]}
				cardMinWidth={cardMinWidth}
				cardHeight={cardHeight}
				cardGridPadding={cardGridPadding}
				showCategoryTitle={showCategoryTitle}
				showCategoryDescription={showCategoryDescription}
				layout={layout}
			/>
		);
	}

	if (category.sites && category.sites.length > 0) {
		return (
			<SiteGrid
				sites={category.sites}
				cardMinWidth={cardMinWidth}
				cardHeight={cardHeight}
				cardGridPadding={cardGridPadding}
				layout={layout}
			/>
		);
	}

	return <EmptyHint />;
}

function SubcategoryTabs({
	category,
	cardMinWidth,
	cardHeight,
	cardGridPadding,
	showCategoryTitle,
	showCategoryDescription,
	layout,
}: {
	category: NavCategory;
	cardMinWidth: string;
	cardHeight: string;
	cardGridPadding: string;
	showCategoryTitle: boolean;
	showCategoryDescription: boolean;
	layout?: Required<LayoutConfig>;
}) {
	const tabs = useMemo(() => category.children ?? [], [category.children]);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const firstTabId = tabs[0]?.id ?? "";
	const [selectedTabId, setSelectedTabId] = useState(firstTabId);

	useEffect(() => {
		if (!firstTabId) return;
		setSelectedTabId((current) =>
			tabs.some((tab) => tab.id === current) ? current : firstTabId,
		);
	}, [firstTabId, tabs]);

	const selectedIndex = useMemo(() => {
		const index = tabs.findIndex((tab) => tab.id === selectedTabId);
		return index >= 0 ? index : 0;
	}, [selectedTabId, tabs]);
	const activeTab = tabs[selectedIndex] ?? tabs[0];

	const focusTab = useCallback((index: number) => {
		requestAnimationFrame(() => {
			tabButtonRefs.current[index]?.focus();
		});
	}, []);

	const handleTabKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (tabs.length === 0) return;

			let nextIndex = selectedIndex;
			if (event.key === "ArrowRight") {
				nextIndex = (selectedIndex + 1) % tabs.length;
			} else if (event.key === "ArrowLeft") {
				nextIndex = (selectedIndex - 1 + tabs.length) % tabs.length;
			} else if (event.key === "Home") {
				nextIndex = 0;
			} else if (event.key === "End") {
				nextIndex = tabs.length - 1;
			} else {
				return;
			}

			event.preventDefault();
			const nextTab = tabs[nextIndex];
			if (!nextTab) return;
			setSelectedTabId(nextTab.id);
			focusTab(nextIndex);
		},
		[focusTab, selectedIndex, tabs],
	);

	useEffect(() => {
		const el = scrollerRef.current;
		if (!el) return;

		const onWheel = (event: WheelEvent) => {
			if (el.scrollWidth <= el.clientWidth) return;

			const hasHorizontalDelta =
				Math.abs(event.deltaX) > Math.abs(event.deltaY);
			const maxScrollLeft = el.scrollWidth - el.clientWidth;

			if (event.shiftKey) {
				const delta = hasHorizontalDelta ? event.deltaX : event.deltaY;
				event.preventDefault();
				el.scrollLeft = Math.max(
					0,
					Math.min(maxScrollLeft, el.scrollLeft + delta),
				);
				return;
			}

			if (!hasHorizontalDelta) return;

			const nextScrollLeft = el.scrollLeft + event.deltaX;
			const canScrollHorizontally =
				(event.deltaX < 0 && el.scrollLeft > 0) ||
				(event.deltaX > 0 && el.scrollLeft < maxScrollLeft);

			if (!canScrollHorizontally) return;
			event.preventDefault();
			el.scrollLeft = Math.max(0, Math.min(maxScrollLeft, nextScrollLeft));
		};

		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, []);

	const panelId = activeTab
		? `${category.id}-${activeTab.id}-panel`
		: undefined;
	const selectedTabButtonId = activeTab
		? `${category.id}-${activeTab.id}-tab`
		: undefined;

	return (
		<div className="w-full">
			<div
				ref={scrollerRef}
				className="w-full overflow-x-auto px-2 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
			>
				<div
					role="tablist"
					aria-label={`${category.name}的子分类`}
					className="inline-flex min-w-max items-center gap-1 rounded-2xl bg-black/4 p-1 dark:bg-white/8"
					onKeyDown={handleTabKeyDown}
				>
					{tabs.map((tab, index) => {
						const selected = index === selectedIndex;
						const tabButtonId = `${category.id}-${tab.id}-tab`;
						const tabPanelId = `${category.id}-${tab.id}-panel`;

						return (
							<button
								key={tab.id}
								ref={(node) => {
									tabButtonRefs.current[index] = node;
								}}
								type="button"
								id={tabButtonId}
								role="tab"
								aria-selected={selected}
								aria-controls={tabPanelId}
								tabIndex={selected ? 0 : -1}
								className={`inline-flex h-8 shrink-0 cursor-pointer items-center rounded-xl px-3 text-sm font-medium text-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
									selected
										? "bg-(--primary-foreground) text-zinc-950 shadow-sm dark:text-zinc-100"
										: "text-muted [@media(hover:hover)]:hover:bg-black/5 [@media(hover:hover)]:hover:text-zinc-900 dark:[@media(hover:hover)]:hover:bg-white/8 dark:[@media(hover:hover)]:hover:text-zinc-100"
								}`}
								onClick={() => {
									setSelectedTabId(tab.id);
								}}
							>
								{tab.icon ? (
									<span className="mr-1 inline-flex items-center" aria-hidden>
										<IconView icon={tab.icon} size={14} />
									</span>
								) : null}
								{tab.name}
							</button>
						);
					})}
				</div>
			</div>

			{activeTab ? (
				<div
					id={panelId}
					role="tabpanel"
					aria-labelledby={selectedTabButtonId}
					className="p-0"
					tabIndex={0}
				>
					<ActiveTabPanel
						tab={activeTab}
						cardMinWidth={cardMinWidth}
						cardHeight={cardHeight}
						cardGridPadding={cardGridPadding}
						showCategoryTitle={showCategoryTitle}
						showCategoryDescription={showCategoryDescription}
						layout={layout}
					/>
				</div>
			) : null}
		</div>
	);
}

const ActiveTabPanel = memo(
	function ActiveTabPanel({
		tab,
		cardMinWidth,
		cardHeight,
		cardGridPadding,
		showCategoryTitle,
		showCategoryDescription,
		layout,
	}: {
		tab: NavCategory;
		cardMinWidth: string;
		cardHeight: string;
		cardGridPadding: string;
		showCategoryTitle: boolean;
		showCategoryDescription: boolean;
		layout?: Required<LayoutConfig>;
	}) {
		return (
			<SubcategoryContent
				category={tab}
				cardMinWidth={cardMinWidth}
				cardHeight={cardHeight}
				cardGridPadding={cardGridPadding}
				showCategoryTitle={showCategoryTitle}
				showCategoryDescription={showCategoryDescription}
				layout={layout}
			/>
		);
	},
	(prev, next) =>
		prev.tab === next.tab &&
		prev.cardMinWidth === next.cardMinWidth &&
		prev.cardHeight === next.cardHeight &&
		prev.cardGridPadding === next.cardGridPadding &&
		prev.showCategoryTitle === next.showCategoryTitle &&
		prev.showCategoryDescription === next.showCategoryDescription &&
		prev.layout === next.layout,
);

function SubcategoryContent({
	category,
	cardMinWidth,
	cardHeight,
	cardGridPadding,
	showCategoryTitle,
	showCategoryDescription,
	layout,
}: {
	category: NavCategory;
	cardMinWidth: string;
	cardHeight: string;
	cardGridPadding: string;
	showCategoryTitle: boolean;
	showCategoryDescription: boolean;
	layout?: Required<LayoutConfig>;
}) {
	return (
		<div id={category.id}>
			{category.sites && category.sites.length > 0 ? (
				<SiteGrid
					sites={category.sites}
					cardMinWidth={cardMinWidth}
					cardHeight={cardHeight}
					cardGridPadding={cardGridPadding}
					layout={layout}
				/>
			) : null}

			{category.children?.map((child) => (
				<div key={child.id} id={child.id} className="category-anchor space-y-3">
					{showCategoryTitle && (
						<h3 className="text-sm font-semibold">
							{child.icon ? (
								<span className="mr-1 inline-flex items-center" aria-hidden>
									<IconView icon={child.icon} size={16} />
								</span>
							) : null}
							{child.name}
							{showCategoryDescription && child.description ? (
								<span className="ml-2 text-sm font-normal text-muted">
									{child.description}
								</span>
							) : null}
						</h3>
					)}
					{child.sites && child.sites.length > 0 ? (
						<SiteGrid
							sites={child.sites}
							cardMinWidth={cardMinWidth}
							cardHeight={cardHeight}
							cardGridPadding={cardGridPadding}
							layout={layout}
						/>
					) : null}
				</div>
			))}
		</div>
	);
}

function EmptyHint() {
	return (
		<div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted">
			暂无内容
		</div>
	);
}
