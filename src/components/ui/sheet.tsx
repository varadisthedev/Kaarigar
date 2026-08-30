"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />
}

function SheetTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger {...props} />
}

/** A full-height panel sliding in from the left — built on the same Dialog
 * primitive as `dialog.tsx` (proven working) rather than Base UI's Drawer,
 * whose swipe-direction/positioning API wasn't worth the added risk here. */
function SheetContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-foreground/30 transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-[85vw] max-w-sm flex-col overflow-y-auto border-r border-border bg-card text-card-foreground shadow-sm",
          "transition-transform duration-150 data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
          className
        )}
        {...props}
      >
        <DialogPrimitive.Close className="absolute top-3 right-3 flex size-9 items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="size-5" />
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title className={cn("font-heading text-base font-medium text-foreground", className)} {...props} />
}

export { Sheet, SheetTrigger, SheetContent, SheetTitle }
