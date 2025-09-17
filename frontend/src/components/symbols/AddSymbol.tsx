"use client";

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SymbolsAPI } from '@/lib/api/symbols';

export function AddSymbol() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState('');

  const addMutation = useMutation({
    mutationFn: (symbol: string) => SymbolsAPI.addSymbol(symbol),
    onSuccess: () => {
      toast.success(`Symbol ${symbol.toUpperCase()} added successfully`);
      queryClient.invalidateQueries({ queryKey: ['symbols'] });
      setOpen(false);
      setSymbol('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add symbol');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      addMutation.mutate(symbol.toUpperCase().trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Symbol
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Symbol</DialogTitle>
            <DialogDescription>
              Enter a stock symbol to download its historical data.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="symbol" className="text-right">
                Symbol
              </Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="col-span-3"
                disabled={addMutation.isPending}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={addMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending || !symbol.trim()}>
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Symbol'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}