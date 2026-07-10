import React from "react";

const defaultHasContent = (value) => {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(defaultHasContent);
  if (!value || typeof value !== "object") return Boolean(value);
  return true;
};

const defaultStringifyItem = (item) => {
  if (typeof item === "string") return item.trim();
  if (item == null) return "";
  if (typeof item !== "object") return String(item).trim();
  return Object.values(item).flat().map(defaultStringifyItem).filter(Boolean).join(" - ");
};

export const ReportState = React.forwardRef(function ReportState(
  {
    icon: Icon,
    iconClassName = "",
    iconClass = "",
    title,
    description,
    danger = false,
    className = "flex h-[520px] flex-col items-center justify-center px-8 py-16 text-center",
    iconWrapClassName,
    titleClassName = "mt-4 text-base font-semibold text-slate-900 dark:text-white",
    descriptionClassName = "mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-white/50",
  },
  ref,
) {
  const wrapperClassName =
    iconWrapClassName ||
    (danger
      ? "rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-400/20 dark:bg-rose-400/10"
      : "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]");

  return (
    <div ref={ref} className={className}>
      <div className={wrapperClassName}>
        <Icon className={`h-7 w-7 ${iconClassName || iconClass}`} />
      </div>
      <h3 className={titleClassName}>{title}</h3>
      <p className={descriptionClassName}>{description}</p>
    </div>
  );
});

export function ReportSection({
  title,
  children,
  hasContent = defaultHasContent,
  sectionClassName = "rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]",
  titleClassName = "text-sm font-semibold text-slate-900 dark:text-white",
  bodyClassName = "mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60",
}) {
  if (!hasContent(children)) return null;

  return (
    <section className={sectionClassName}>
      <h4 className={titleClassName}>{title}</h4>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function ReportList({
  title,
  items,
  stringifyItem = defaultStringifyItem,
  sectionClassName = "",
  titleClassName = "text-sm font-semibold text-slate-900 dark:text-white",
  listClassName = "mt-2 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-white/60",
  itemClassName = "flex gap-2",
  bulletClassName = "mt-2 h-1.5 w-1.5 flex-none rounded-full bg-slate-300 dark:bg-white/20",
}) {
  const safeItems = Array.isArray(items)
    ? items.map((item) => stringifyItem(item)).filter(Boolean)
    : [];

  if (safeItems.length === 0) return null;

  return (
    <section className={sectionClassName}>
      <h4 className={titleClassName}>{title}</h4>
      <ul className={listClassName}>
        {safeItems.map((item, index) => (
          <li key={`${title}-${index}`} className={itemClassName}>
            <span className={bulletClassName} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function IconReportBlock({
  title,
  icon: Icon,
  iconColor = "",
  children,
  hasContent = defaultHasContent,
  sectionClassName = "rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]",
  headerClassName = "mb-2 flex items-center gap-2",
  iconClassName = "h-3.5 w-3.5",
  titleClassName = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-white/70",
  bodyClassName = "mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60",
}) {
  if (!hasContent(children)) return null;

  return (
    <section className={sectionClassName}>
      <div className={headerClassName}>
        <Icon className={`${iconClassName} ${iconColor}`} />
        <h4 className={titleClassName}>{title}</h4>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
