import { formatHourLabel, GRID_HEIGHT, HOUR_HEIGHT } from '@/lib/time'

const HOURS = Array.from({ length: 23 }, (_, i) => i + 1)

/** Hour labels on the left of the grid. Sticky when scrolling sideways. */
export function TimeGutter() {
  return (
    <div
      className="sticky left-0 z-20 w-16 shrink-0 bg-white"
      style={{ height: GRID_HEIGHT }}
      aria-hidden
    >
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute right-2 text-[10px] leading-none text-[#70757a]"
          style={{ top: hour * HOUR_HEIGHT - 5 }}
        >
          {formatHourLabel(hour)}
        </div>
      ))}
      {/* Small ticks joining labels to the hour lines, as in Google Calendar. */}
      {HOURS.map((hour) => (
        <div
          key={`tick-${hour}`}
          className="absolute right-0 h-px w-1.5 bg-[#dadce0]"
          style={{ top: hour * HOUR_HEIGHT }}
        />
      ))}
    </div>
  )
}
