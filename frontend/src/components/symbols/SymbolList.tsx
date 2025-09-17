"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { SymbolsAPI } from '@/lib/api/symbols';
import { Symbol, SymbolPriceResponse } from '@/types/symbol';
import { cn } from '@/lib/utils';

export function SymbolList() {
  const queryClient = useQueryClient();
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [deleteSymbol, setDeleteSymbol] = useState<string | null>(null);
  const [symbolPrices, setSymbolPrices] = useState<Record<string, SymbolPriceResponse>>({});

  // Fetch symbols list
  const { data: symbolsData, isLoading, refetch } = useQuery({
    queryKey: ['symbols'],
    queryFn: SymbolsAPI.listSymbols,
  });

  // Delete symbol mutation
  const deleteMutation = useMutation({
    mutationFn: (symbol: string) => SymbolsAPI.deleteSymbol(symbol),
    onSuccess: () => {
      toast.success('Symbol deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['symbols'] });
      setDeleteSymbol(null);
    },
    onError: () => {
      toast.error('Failed to delete symbol');
    },
  });

  // Delete multiple symbols mutation
  const deleteMultipleMutation = useMutation({
    mutationFn: (symbols: string[]) => SymbolsAPI.deleteSymbols(symbols),
    onSuccess: () => {
      toast.success(`${selectedSymbols.length} symbols deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['symbols'] });
      setSelectedSymbols([]);
    },
    onError: () => {
      toast.error('Failed to delete symbols');
    },
  });

  // Fetch prices for all symbols
  useEffect(() => {
    if (symbolsData?.symbols) {
      symbolsData.symbols.forEach(symbol => {
        SymbolsAPI.getSymbolPrice(symbol)
          .then(price => {
            setSymbolPrices(prev => ({ ...prev, [symbol]: price }));
          })
          .catch(() => {
            // Silently fail for individual price fetches
          });
      });
    }
  }, [symbolsData]);

  const handleSelectAll = (checked: boolean) => {
    if (checked && symbolsData?.symbols) {
      setSelectedSymbols(symbolsData.symbols);
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

  const handleDeleteSelected = () => {
    if (selectedSymbols.length > 0) {
      deleteMultipleMutation.mutate(selectedSymbols);
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '-';
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number | null | undefined, changePercent: number | null | undefined) => {
    if (change === null || change === undefined) return null;
    
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    const percentStr = changePercent !== null && changePercent !== undefined 
      ? ` (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`
      : '';
    
    return {
      text: `${changeStr}${percentStr}`,
      color: change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600',
      icon: change > 0 ? <TrendingUp className="h-4 w-4" /> : change < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const symbols = symbolsData?.symbols || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">
            Symbols ({symbols.length})
          </h3>
          {selectedSymbols.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={deleteMultipleMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedSymbols.length} selected
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedSymbols.length === symbols.length && symbols.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Last Price</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {symbols.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No symbols found
                </TableCell>
              </TableRow>
            ) : (
              symbols.map((symbol) => {
                const price = symbolPrices[symbol];
                const changeInfo = formatChange(price?.change, price?.changePercent);
                
                return (
                  <TableRow key={symbol}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSymbols.includes(symbol)}
                        onCheckedChange={(checked) => handleSelectSymbol(symbol, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{symbol}</TableCell>
                    <TableCell className="text-right">
                      {formatPrice(price?.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {changeInfo && (
                        <div className={cn("flex items-center justify-end gap-1", changeInfo.color)}>
                          {changeInfo.icon}
                          <span>{changeInfo.text}</span>
                        </div>
                      )}
                      {!changeInfo && '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {price?.volume?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteSymbol(symbol)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteSymbol} onOpenChange={() => setDeleteSymbol(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Symbol</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteSymbol}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSymbol && deleteMutation.mutate(deleteSymbol)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}