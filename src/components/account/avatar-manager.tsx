"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { uploadToCloudinary } from "@/lib/cloudinary-upload"
import { apiFetch } from "@/lib/api-fetch"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export function AvatarManager({ initialUrl, name }: { initialUrl: string | null; name: string | null }) {
  const t = useTranslations("account")
  const [url, setUrl] = React.useState(initialUrl)
  const [pending, setPending] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setPending(true)
    try {
      const uploaded = await uploadToCloudinary(file, "avatar")
      const res = await apiFetch("/api/account/avatar", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: uploaded.url, publicId: uploaded.publicId }),
      })
      if (res.ok) setUrl(uploaded.url)
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    setPending(true)
    try {
      const res = await apiFetch("/api/account/avatar", { method: "DELETE" })
      if (res.ok) setUrl(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {url && <AvatarImage src={url} alt={name ?? ""} />}
        <AvatarFallback>{(name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : url ? t("avatarReplace") : t("avatarUpload")}
          </Button>
          {url && (
            <Button size="sm" variant="ghost" disabled={pending} onClick={handleDelete}>
              {t("avatarDelete")}
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
        />
      </div>
    </div>
  )
}
