'use server';

import { getItem, putItem, queryItems, scanItems, deleteItem } from '@/util/server-only/dynamodb';

// Define types for our stock data
export type Stock = {
  stockId: string;
  date: string;
  price: number;
  quantity: number;
  notes?: string;
};

/**
 * Get a stock record by ID and date
 */
export async function getStock(stockId: string, date: string): Promise<Stock | null> {
  try {
    return await getItem<Stock>('stocks', { stockId, date });
  } catch (error) {
    console.error('Failed to get stock:', error);
    throw new Error('Failed to get stock record');
  }
}

/**
 * Add or update a stock record
 */
export async function saveStock(stock: Stock): Promise<void> {
  try {
    // Validate stock data
    if (!stock.stockId || !stock.date) {
      throw new Error('Stock ID and date are required');
    }
    
    await putItem('stocks', stock);
  } catch (error) {
    console.error('Failed to save stock:', error);
    throw new Error('Failed to save stock record');
  }
}

/**
 * Get all stocks for a specific stock ID
 */
export async function getStockHistory(stockId: string): Promise<Stock[]> {
  try {
    return await queryItems<Stock>(
      'stocks',
      'stockId = :stockId',
      { ':stockId': stockId }
    );
  } catch (error) {
    console.error('Failed to get stock history:', error);
    throw new Error('Failed to get stock history');
  }
}

/**
 * Get all stocks
 */
export async function getAllStocks(): Promise<Stock[]> {
  try {
    return await scanItems<Stock>('stocks');
  } catch (error) {
    console.error('Failed to get all stocks:', error);
    throw new Error('Failed to get all stocks');
  }
}

/**
 * Delete a stock record
 */
export async function deleteStock(stockId: string, date: string): Promise<void> {
  try {
    await deleteItem('stocks', { stockId, date });
  } catch (error) {
    console.error('Failed to delete stock:', error);
    throw new Error('Failed to delete stock record');
  }
} 