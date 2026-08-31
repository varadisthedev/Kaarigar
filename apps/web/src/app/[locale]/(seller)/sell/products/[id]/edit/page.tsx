import { notFound } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { findProductById } from "@/infra/db/repositories/business.repository"
import { getCurrentUser } from "@/infra/http/current-user"
import { EditProductForm } from "@/components/sell/edit-product-form"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const t = await getTranslations("sell")

  const user = await getCurrentUser()
  if (!user) notFound()

  const product = await findProductById(id)
  if (!product || product.business.ownerId !== user.sub) notFound()

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-xl font-medium text-foreground">{t("editProduct")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("editProductSubtitle")}</p>
      </div>

      <EditProductForm
        productId={product.id}
        initial={{
          titleEn: product.titleEn,
          descriptionEn: product.descriptionEn ?? "",
          materials: product.materials ?? [],
          dimensions: product.dimensions ?? "",
          priceMin: product.priceMin ?? "",
          priceMax: product.priceMax ?? "",
          tags: product.seoKeywords ?? [],
        }}
      />
    </div>
  )
}
