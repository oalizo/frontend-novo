"use client"

interface EditableTrackingNumberProps {
  value: string | null
}

export function EditableTrackingNumber({ value }: EditableTrackingNumberProps) {
  return (
    <span className="font-mono">
      {value || '-'}
    </span>
  )
}