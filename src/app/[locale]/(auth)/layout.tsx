import { Link } from "@/i18n/navigation"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <Link href="/" className="font-heading text-xl font-medium text-foreground">
        CraftMate
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
