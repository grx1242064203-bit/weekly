
export interface HistoricalDataPoint {
  date: number; // Storing date as timestamp for easier calculations
  value: number;
}

export interface Metrics {
  inceptionDate: number;
  latestValue: number;
  latestDate: number;
  change1W: number | null;
  change1M: number | null;
  changeYTD: number | null;
  changeITD: number;
  monthlyChanges: { month: string; change: number }[];
  excessReturns?: {
    vs: string;
    change1W: number | null;
    change1M: number | null;
    changeYTD: number | null;
    changeITD: number | null;
  }[];
}

export interface Product {
  name: string;
  type: 'product';
  data: HistoricalDataPoint[];
  metrics: Metrics;
}

export interface Benchmark {
  name: string;
  type: 'benchmark';
  data: HistoricalDataPoint[];
  metrics: Metrics;
}

export interface Strategy {
  name: string;
  products: Product[];
  benchmarks: Benchmark[];
}

export enum TimeRange {
  ITD = 'Since Inception',
  Y5 = '5 Years',
  Y3 = '3 Years',
  Y1 = '1 Year',
  YTD = 'YTD',
  M1 = '1 Month',
}

export type SortConfig = {
    key: string;
    direction: 'ascending' | 'descending';
} | null;
