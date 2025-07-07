import React, { useState, useEffect } from 'react';
import { DateRange } from 'react-date-range';
import { addDays, subDays, format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangeSelectorProps {
  onRangeChange: (range: { from: Date; to: Date }) => void;
  value: { from: Date; to: Date };
  className?: string;
}

// Defining the correct interface for Range
interface Range {
  startDate: Date;
  endDate: Date;
  key: string;
}

export default function DateRangeSelector({ onRangeChange, value, className }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateState, setDateState] = useState<Range[]>([
    {
      startDate: value.from,
      endDate: value.to,
      key: 'selection',
    },
  ]);

  useEffect(() => {
    setDateState([
      {
        startDate: value.from,
        endDate: value.to,
        key: 'selection',
      },
    ]);
  }, [value]);

  const handleSelect = (ranges: any) => {
    setDateState([ranges.selection]);
    if (ranges.selection.startDate && ranges.selection.endDate) {
      onRangeChange({
        from: ranges.selection.startDate,
        to: ranges.selection.endDate,
      });
    }
  };

  // Predefined ranges
  const handleDateRangePreset = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    
    setDateState([
      {
        startDate: from,
        endDate: to,
        key: 'selection',
      },
    ]);
    
    onRangeChange({ from, to });
  };

  return (
    <div className={cn("flex flex-col sm:flex-row items-center gap-2", className)}>
      <div className="flex gap-1">
        <Button 
          variant={value.from.getTime() === subDays(new Date(), 7).setHours(0,0,0,0) ? "default" : "outline"} 
          onClick={() => handleDateRangePreset(7)}
          size="sm"
          className="text-xs px-2.5 h-8 bg-primary text-white hover:bg-primary/90 border-primary/10"
        >
          7 days
        </Button>
        <Button 
          variant={value.from.getTime() === subDays(new Date(), 30).setHours(0,0,0,0) ? "default" : "outline"}
          onClick={() => handleDateRangePreset(30)}
          size="sm"
          className="text-xs px-2.5 h-8 bg-primary text-white hover:bg-primary/90 border-primary/10"
        >
          30 days
        </Button>
        <Button 
          variant={value.from.getTime() === subDays(new Date(), 90).setHours(0,0,0,0) ? "default" : "outline"} 
          onClick={() => handleDateRangePreset(90)}
          size="sm"
          className="text-xs px-2.5 h-8 bg-primary text-white hover:bg-primary/90 border-primary/10"
        >
          90 days
        </Button>
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50",
              !dateState[0].startDate && "text-slate-500"
            )}
            size="sm"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            {dateState[0].startDate ? (
              dateState[0].endDate ? (
                <>
                  {format(dateState[0].startDate, "MM/dd/yyyy")} - {format(dateState[0].endDate, "MM/dd/yyyy")}
                </>
              ) : (
                format(dateState[0].startDate, "MM/dd/yyyy")
              )
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white border border-slate-200 shadow-md" align="center">
          <div className="p-2">
            <DateRange
              editableDateInputs={true}
              onChange={handleSelect}
              moveRangeOnFirstSelection={false}
              ranges={dateState}
              months={2}
              direction="horizontal"
              locale={enUS}
              rangeColors={["#3B82F6"]}
              className="border-0"
            />
            <div className="flex justify-end mt-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}
                className="border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancel
              </Button>
              <Button size="sm" onClick={() => setIsOpen(false)}
                className="bg-primary text-white hover:bg-primary/90">
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 