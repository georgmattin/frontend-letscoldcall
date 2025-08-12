# Call Outcome Badge Colors

This document lists the color palette used for Call Result badges in `call-logs-section.tsx`.

Each outcome uses a distinct background, border, and text color for clear visual differentiation.

- __meeting-scheduled / meeting-booked__
  - bg: `#ECFDF5`
  - border: `#10B981`
  - text: `#047857`

- __sold__
  - bg: `#EEF2FF`
  - border: `#6366F1`
  - text: `#4338CA`

- __positive__
  - bg: `#F0FDF4`
  - border: `#22C55E`
  - text: `#15803D`

- __interested__
  - bg: `#F0F9FF`
  - border: `#0EA5E9`
  - text: `#0369A1`

- __callback / callback-later__
  - bg: `#EFF6FF`
  - border: `#3B82F6`
  - text: `#1D4ED8`

- __left-voicemail__
  - bg: `#FDF4FF`
  - border: `#D946EF`
  - text: `#A21CAF`

- __neutral__
  - bg: `#F8FAFC`
  - border: `#94A3B8`
  - text: `#475569`

- __not-available__
  - bg: `#F1F5F9`
  - border: `#94A3B8`
  - text: `#475569`

- __no-answer__
  - bg: `#FFF7ED`
  - border: `#FB923C`
  - text: `#C2410C`

- __busy__
  - bg: `#FEFCE8`
  - border: `#EAB308`
  - text: `#A16207`

- __gatekeeper__
  - bg: `#F5F3FF`
  - border: `#8B5CF6`
  - text: `#6D28D9`

- __not-interested__
  - bg: `#FEF2F2`
  - border: `#EF4444`
  - text: `#B91C1C`

- __negative__
  - bg: `#FFF1F2`
  - border: `#F43F5E`
  - text: `#E11D48`

- __wrong-number__
  - bg: `#FFE4E6`
  - border: `#FB7185`
  - text: `#BE123C`

- __do-not-call__
  - bg: `#FFF1F2`
  - border: `#F43F5E`
  - text: `#E11D48`

## Notes

- The mapping lives in `call-logs-section.tsx` as `CALL_OUTCOME_COLORS`.
- Unknown outcomes default to a neutral slate badge: bg `#F1F5F9`, border `#CBD5E1`, text `#334155`.
- Color choices aim for high contrast and distinct hue families to reduce confusion in the call logs table.
