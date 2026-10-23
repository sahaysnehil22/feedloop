import Widget from "./widget";
import { normalizeLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const key = sp.key || "";
  return (
    <Widget
      projKey={key}
      init={{
        theme: sp.theme === "dark" ? "dark" : "light",
        accent_color: sp.accent,
        language: normalizeLang(sp.lang),
        hide_badge: sp.hide_badge === "1",
      }}
    />
  );
}
