"use client";

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { SymbolsAPI } from '@/lib/api/symbols';
import { BulkDownloadRequest } from '@/types/symbol';

interface BulkDownloadProps {
  symbols: string[];
}

export function BulkDownload({ symbols }: BulkDownloadProps) {
  const [open, setOpen] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>(new Date());

  const downloadMutation = useMutation({
    mutationFn: (request: BulkDownloadRequest) => SymbolsAPI.bulkDownload(request),
    onSuccess: (data) => {
      const successCount = data.successful.length;
      const failedCount = data.failed.length;
      
      if (successCount > 0 && failedCount === 0) {
        toast.success(`Successfully downloaded data for ${successCount} symbols`);
      } else if (successCount > 0 && failedCount > 0) {
        toast.warning(`Downloaded ${successCount} symbols, ${failedCount} failed`);
      } else {
        toast.error('All downloads failed');
      }
      
      setOpen(false);
      setSelectedSymbols([]);
      setStartDate(undefined);
    },
    onError: () => {
      toast.error('Failed to perform bulk download');
    },
  });

  const handleSubmit = () => {
    if (selectedSymbols.length === 0) {
      toast.error('Please select at least one symbol');
      return;
    }
    
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    const request: BulkDownloadRequest = {
      symbols: selectedSymbols,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
    };

    downloadMutation.mutate(request);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSymbols(symbols);
    } else {
      setSelectedSymbols([]);
    }
  };

  const handleSelectSymbol = (symbol: string, checked: boolean) => {
    if (checked) {
      setSelectedSymbols([...selectedSymbols, symbol]);
    } else {
      setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Bulk Download
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Download Historical Data</DialogTitle>
          <DialogDescription>
            Select symbols and date range to download historical price data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Select Symbols</Label>
            <div className="border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="select-all"
                  checked={selectedSymbols.length === symbols.length && symbols.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Select All ({symbols.length})
                </label>
              </div>
              <ScrollArea className="h-40">
                <div className="grid grid-cols-3 gap-2">
                  {symbols.map((symbol) => (
                    <div key={symbol} className="flex items-center space-x-2">
                      <Checkbox
                        id={symbol}
                        checked={selectedSymbols.includes(symbol)}
                        onCheckedChange={(checked) => handleSelectSymbol(symbol, checked as boolean)}
                      />
                      <label
                        htmlFor={symbol}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {symbol}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedSymbols.length} symbols selected
            </p>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) =>
                      date > new Date() || (startDate && date < startDate)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={downloadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={downloadMutation.isPending || selectedSymbols.length === 0 || !startDate}
          >
            {downloadMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}