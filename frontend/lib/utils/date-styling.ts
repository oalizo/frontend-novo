"use client"

import { differenceInDays, startOfDay } from "date-fns"

export interface DateStyle {
  background: string
  text: string
}

export function getShipDateStyle(shipDate: string | Date | null, status?: string): DateStyle {
  if (!shipDate) {
    return {
      background: 'transparent',
      text: 'inherit'
    }
  }

  // Don't apply colors if status is shipped
  if (status?.toLowerCase() === 'shipped') {
    return {
      background: 'transparent',
      text: 'inherit'
    }
  }

  const today = startOfDay(new Date())
  const targetDate = startOfDay(new Date(shipDate))
  const daysDifference = differenceInDays(targetDate, today)

  // Past due
  if (daysDifference < 0) {
    return {
      background: '#FEE2E2', // Light red
      text: '#991B1B'  // Dark red
    }
  }

  // Due today
  if (daysDifference === 0) {
    return {
      background: '#ECFDF5', // Light green
      text: '#065F46'  // Dark green
    }
  }

  // Due tomorrow
  if (daysDifference === 1) {
    return {
      background: '#FEF3C7', // Light yellow
      text: '#92400E'  // Dark yellow
    }
  }

  // Due in 2-3 days
  if (daysDifference <= 3) {
    return {
      background: '#FEF9C3', // Lighter yellow
      text: '#854D0E'  // Dark yellow
    }
  }

  // Due in more than 3 days
  return {
    background: '#F0F9FF', // Light blue
    text: '#075985'  // Dark blue
  }
}

export function getShipDateTitle(shipDate: string | Date | null): string {
  if (!shipDate) return 'No date specified'

  const today = startOfDay(new Date())
  const targetDate = startOfDay(new Date(shipDate))
  const daysDifference = differenceInDays(targetDate, today)

  if (daysDifference < 0) {
    return `Overdue by ${Math.abs(daysDifference)} days`
  }

  if (daysDifference === 0) {
    return 'Due today'
  }

  if (daysDifference === 1) {
    return 'Due tomorrow'
  }

  return `Due in ${daysDifference} days`
}