"use client"

import { countries, type Country } from "@/config/countries"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CountrySelect({
  value,
  onValueChange,
  disabled,
}: {
  value: string
  onValueChange: (dialCode: string) => void
  disabled?: boolean
}) {
  const selected = countries.find((c) => c.dialCode === value)

  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as string)}
      disabled={disabled}
      items={countries.map((c) => ({ value: c.dialCode, label: `${c.name} ${c.dialCode}` }))}
    >
      <SelectTrigger className="w-[110px] shrink-0" aria-label="Country code">
        <SelectValue>
          {selected ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden>{selected.flag}</span>
              <span>{selected.dialCode}</span>
            </span>
          ) : (
            "Code"
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {countries.map((country: Country) => (
          <SelectItem key={country.iso2} value={country.dialCode}>
            <span className="flex items-center gap-2">
              <span aria-hidden>{country.flag}</span>
              <span className="flex-1 truncate">{country.name}</span>
              <span className="text-muted-foreground">{country.dialCode}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
