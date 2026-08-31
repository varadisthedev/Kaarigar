import { redirect } from "next/navigation"

/** The dashboard that used to live at /sell now lives at / — the main
 * entry point for the whole app. This keeps old links/bookmarks working. */
export default async function SellRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}`)
}
