import Image from "next/image"

import { Link } from "@/i18n/navigation"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4 sm:p-8">
      <div className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl lg:min-h-[640px] lg:grid-cols-2">
        <Image
          src="/bottomleft.png"
          alt=""
          width={1672}
          height={954}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 z-0 w-64 opacity-90 sm:w-80"
        />
        <div className="relative z-10 flex flex-col justify-center gap-8 p-8 sm:p-12">
          <Link href="/" className="block w-fit">
            <Image
              src="/brand_logo.png"
              alt="Kaarigar — The Indian Artisan"
              width={2073}
              height={758}
              priority
              className="h-16 w-auto object-contain sm:h-20"
            />
          </Link>
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <div className="relative hidden lg:block">
          <Image
            src="/onboarding.png"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="50vw"
          />
        </div>
      </div>
    </div>
  )
}
