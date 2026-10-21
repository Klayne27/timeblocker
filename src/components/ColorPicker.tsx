import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Pipette } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { contrastText, isPaletteColor, normalizeHex, PALETTE } from '@/lib/colors'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
}

const swatchClass =
  'grid size-7 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] focus-visible:ring-offset-2'

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const current = normalizeHex(value) ?? value
  const isCustom = !isPaletteColor(current)

  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Color">
      {PALETTE.map((color) => {
        const selected = color.hex === current
        return (
          <Tooltip key={color.hex}>
            <TooltipTrigger asChild>
              <motion.button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={color.name}
                className={swatchClass}
                style={{ backgroundColor: color.hex }}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => onChange(color.hex)}
              >
                {selected && (
                  <Check className="size-4" strokeWidth={3} style={{ color: contrastText(color.hex) }} />
                )}
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>{color.name}</TooltipContent>
          </Tooltip>
        )
      })}

      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <motion.button
                type="button"
                role="radio"
                aria-checked={isCustom}
                aria-label="Custom color"
                className={cn(swatchClass, !isCustom && 'border border-black/10')}
                style={{
                  background: isCustom
                    ? current
                    : 'conic-gradient(#d50000, #f6bf26, #33b679, #039be5, #8e24aa, #d50000)',
                }}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.92 }}
              >
                {isCustom ? (
                  <Check className="size-4" strokeWidth={3} style={{ color: contrastText(current) }} />
                ) : (
                  <Pipette className="size-3.5 text-white drop-shadow" />
                )}
              </motion.button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Custom color</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-60" align="end">
          <CustomColorForm key={current} value={current} onChange={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function CustomColorForm({ value, onChange }: ColorPickerProps) {
  const [draft, setDraft] = useState(value)
  const valid = normalizeHex(draft) !== null

  return (
    <div className="space-y-3">
      <Label htmlFor="custom-color-native">Custom color</Label>
      <input
        id="custom-color-native"
        type="color"
        value={normalizeHex(value) ?? '#000000'}
        onChange={(e) => {
          setDraft(e.target.value)
          onChange(e.target.value)
        }}
        className="h-24 w-full cursor-pointer rounded-md border border-input bg-transparent p-1"
      />
      <div className="space-y-1.5">
        <Label htmlFor="custom-color-hex" className="text-xs text-muted-foreground">
          Hex
        </Label>
        <Input
          id="custom-color-hex"
          value={draft}
          spellCheck={false}
          aria-invalid={!valid}
          placeholder="#1a73e8"
          onChange={(e) => {
            setDraft(e.target.value)
            const hex = normalizeHex(e.target.value)
            if (hex) onChange(hex)
          }}
        />
        {!valid && <p className="text-xs text-destructive">Use a hex color like #1a73e8.</p>}
      </div>
    </div>
  )
}
