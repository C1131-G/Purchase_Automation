import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/table/core/table-root'

const columnWidths = ['14%', '14%', '17%', '23%', '16%', '16%']
const rowCount = 10

const cellWidths = ['w-20', 'w-22', 'w-24', 'w-32', 'w-18', 'w-16']

export function TableSkeleton() {
  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <div className="flex flex-col gap-3 px-6 py-4 border-b border-zinc-50 bg-white">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded bg-zinc-200 animate-pulse" />
          <div className="h-4 w-3 rounded bg-zinc-100 animate-pulse" />
          <div className="h-4 w-40 rounded bg-zinc-200 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-zinc-100 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-auto w-full px-1.5">
        <Table className="w-full min-w-300">
          <TableHeader>
            <TableRow>
              {columnWidths.map((width, index) => (
                <TableHead
                  key={`header-${index}`}
                  className="align-top py-3 whitespace-nowrap"
                  style={{ width }}
                >
                  <div className="ml-2 h-3 w-20 rounded bg-zinc-200 animate-pulse" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={`row-${rowIndex}`}>
                {columnWidths.map((width, colIndex) => (
                  <TableCell key={`cell-${rowIndex}-${colIndex}`} style={{ width }}>
                    <div
                      className={`h-4 rounded bg-zinc-100 animate-pulse ${cellWidths[colIndex] ?? 'w-24'}`}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-12 px-6 py-5 border-t border-zinc-100 bg-white">
        <div className="flex items-center space-x-3">
          <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
          <div className="h-9 w-20 rounded-lg border border-zinc-100 bg-zinc-50 animate-pulse" />
        </div>
        <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
        <div className="flex items-center space-x-1.5">
          <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
          <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
          <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
          <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
