"use client"

import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"

const BRAND_OPTIONS = [
  "Schindler",
  "Otis",
  "KONE",
  "ThyssenKrupp",
  "Mitsubishi",
  "Fujitec",
  "Hyundai",
  "Toshiba",
  "Hitachi",
  "Otro",
]

interface MultiSelectProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

export function MultiSelect({ value, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggleBrand = (brand: string) => {
    if (value.includes(brand)) {
      onChange(value.filter((b) => b !== brand))
    } else {
      onChange([...value, brand])
    }
  }

  const displayText = value.length > 0 ? value.join(", ") : (placeholder || "Seleccionar marcas")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-white dark:border-slate-200",
            value.length === 0 ? "text-slate-400" : "text-slate-900 dark:text-slate-900"
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
        <div className="space-y-1">
          {BRAND_OPTIONS.map((brand) => (
            <label
              key={brand}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-900 hover:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Checkbox
                checked={value.includes(brand)}
                onCheckedChange={() => toggleBrand(brand)}
              />
              {brand}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
