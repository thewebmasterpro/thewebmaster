import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import HomeClient from "./HomeClient";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);

  return <HomeClient dictionary={dictionary} locale={locale} />;
}
