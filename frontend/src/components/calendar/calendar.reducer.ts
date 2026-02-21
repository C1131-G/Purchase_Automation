import {
  type CalendarDateRange,
  type CalendarView,
  isCalendarDateRange,
} from '@/components/calendar/calendar.shared'

type CalendarState = {
  currentDate: Date
  view: CalendarView
  internalSingle: Date | undefined
  internalRange: CalendarDateRange
}

type CalendarAction =
  | { type: 'SET_CURRENT_DATE'; payload: Date }
  | { type: 'PREV_MONTH' }
  | { type: 'NEXT_MONTH' }
  | { type: 'TOGGLE_VIEW'; payload: { showMonthAndYearPickers: boolean } }
  | { type: 'OPEN_GRID' }
  | { type: 'SET_INTERNAL_SINGLE'; payload: Date | undefined }
  | { type: 'SET_INTERNAL_RANGE'; payload: CalendarDateRange }
  | { type: 'SYNC_SELECTED'; payload: { selected?: Date | CalendarDateRange; today: Date } }

/**
 * createCalendarInitialState: Bootstraps the calendar state based on selection and current date.
 * Ensures the view anchor (currentDate) is derived from the active selection.
 */
export const createCalendarInitialState = (
  selected: Date | CalendarDateRange | undefined,
  today: Date,
): CalendarState => {
  const initialDate =
    selected instanceof Date
      ? selected
      : isCalendarDateRange(selected) && selected.from
        ? selected.from
        : today

  return {
    currentDate: initialDate,
    view: 'grid',
    internalSingle: selected instanceof Date ? selected : undefined,
    internalRange: isCalendarDateRange(selected) ? selected : {},
  }
}

export const calendarReducer = (state: CalendarState, action: CalendarAction): CalendarState => {
  switch (action.type) {
    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.payload }
    case 'PREV_MONTH': {
      const year = state.currentDate.getFullYear()
      const month = state.currentDate.getMonth()
      return { ...state, currentDate: new Date(year, month - 1, 1) }
    }
    case 'NEXT_MONTH': {
      const year = state.currentDate.getFullYear()
      const month = state.currentDate.getMonth()
      return { ...state, currentDate: new Date(year, month + 1, 1) }
    }
    case 'TOGGLE_VIEW':
      if (!action.payload.showMonthAndYearPickers) return state
      return { ...state, view: state.view === 'grid' ? 'picker' : 'grid' }
    case 'OPEN_GRID':
      return state.view === 'grid' ? state : { ...state, view: 'grid' }
    case 'SET_INTERNAL_SINGLE':
      return { ...state, internalSingle: action.payload }
    case 'SET_INTERNAL_RANGE':
      return { ...state, internalRange: action.payload }
    case 'SYNC_SELECTED': {
      const { selected, today } = action.payload
      if (selected instanceof Date) {
        return {
          ...state,
          currentDate: selected,
          internalSingle: selected,
          internalRange: {},
        }
      }
      if (isCalendarDateRange(selected)) {
        const anchor = selected.from ?? state.currentDate ?? today
        return {
          ...state,
          currentDate: anchor,
          internalSingle: undefined,
          internalRange: selected,
        }
      }
      return state
    }
    default:
      return state
  }
}

export type { CalendarState }
