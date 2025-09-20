import { Strategy, Product, Benchmark, HistoricalDataPoint, Metrics } from '../types.ts';

declare const XLSX: any;

// --- File Parsing ---

const parseExcelFile = (file: File): Promise<HistoricalDataPoint[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        const historicalData = json
          .slice(1) // Skip header row
          .map((row) => {
            if (row && row[0] && (row[1] !== null && row[1] !== undefined)) {
              // Excel dates can be tricky. XLSX can convert them to JS dates.
              // We handle both serial number and string dates.
              let date;
              if (typeof row[0] === 'number') {
                  // Excel serial date
                  date = new Date(Date.UTC(1899, 11, 30 + row[0]));
              } else {
                  // Attempt to parse string date
                  date = new Date(row[0] as string);
              }

              if (isNaN(date.getTime())) {
                return null; // Invalid date
              }
              
              const value = typeof row[1] === 'string' ? parseFloat(row[1]) : row[1] as number;
              if (isNaN(value)) {
                return null; // Invalid value
              }
              return { date: date.getTime(), value };
            }
            return null;
          })
          .filter((p): p is HistoricalDataPoint => p !== null)
          .sort((a, b) => a.date - b.date);
        resolve(historicalData);
      } catch (e) {
        reject(new Error(`Failed to parse ${file.name}: ${e instanceof Error ? e.message : String(e)}`));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const processUploadedFiles = async (files: FileList): Promise<Strategy[]> => {
  const strategiesMap: { [key: string]: Product[] } = {};

  for (const file of Array.from(files)) {
    const pathParts = (file as any).webkitRelativePath.split('/');
    if (pathParts.length < 3) continue; 

    const strategyName = pathParts[pathParts.length - 2];
    const productName = file.name.replace(/\.xlsx$/i, '');
    
    if (!strategiesMap[strategyName]) {
      strategiesMap[strategyName] = [];
    }
    
    const data = await parseExcelFile(file);
    if (data.length > 0) {
      const product: Product = {
        name: productName,
        type: 'product',
        data,
        metrics: {} as Metrics // will be calculated later
      };
      strategiesMap[strategyName].push(product);
    }
  }

  const strategies: Strategy[] = Object.keys(strategiesMap).map(name => ({
    name,
    products: strategiesMap[name],
    benchmarks: [],
  }));

  return calculateAllMetrics(strategies);
};

export const processBenchmarkFiles = async (strategyName: string, files: FileList, currentStrategies: Strategy[]): Promise<Strategy[]> => {
    const newBenchmarks: Benchmark[] = [];
    for (const file of Array.from(files)) {
        const benchmarkName = file.name.replace(/\.xlsx$/i, '');
        const data = await parseExcelFile(file);
        if (data.length > 0) {
            newBenchmarks.push({
                name: benchmarkName,
                type: 'benchmark',
                data,
                metrics: {} as Metrics // will be calculated later
            });
        }
    }

    const updatedStrategies = currentStrategies.map(s => {
        if (s.name === strategyName) {
            // Replace existing benchmarks
            return { ...s, benchmarks: newBenchmarks };
        }
        return s;
    });

    return calculateAllMetrics(updatedStrategies);
};


// --- Metrics Calculation ---

const getClosestDataPoint = (data: HistoricalDataPoint[], targetDate: number): HistoricalDataPoint | null => {
    if (!data || data.length === 0) return null;
    // Assumes data is sorted by date
    let closest = null;
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].date <= targetDate) {
            closest = data[i];
            break;
        }
    }
    return closest;
};

const calculateChange = (data: HistoricalDataPoint[], startDate: number, endDate: number): number | null => {
    const startPoint = getClosestDataPoint(data, startDate);
    const endPoint = getClosestDataPoint(data, endDate);

    if (startPoint && endPoint && startPoint.value !== 0 && endPoint.date > startPoint.date) {
        return (endPoint.value - startPoint.value) / startPoint.value;
    }
    return null;
};

const calculateMonthlyChanges = (data: HistoricalDataPoint[], latestDate: number): { month: string; change: number }[] => {
    const changes = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(latestDate);
        d.setUTCMonth(d.getUTCMonth() - i, 1);
        const monthEnd = new Date(d);
        monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);

        const dStart = new Date(latestDate);
        dStart.setUTCMonth(dStart.getUTCMonth() - (i + 1), 1);
       
        const startPoint = getClosestDataPoint(data, dStart.getTime());
        const endPoint = getClosestDataPoint(data, monthEnd.getTime());

        if (startPoint && endPoint && startPoint.value !== 0) {
            changes.push({
                month: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
                change: (endPoint.value - startPoint.value) / startPoint.value
            });
        }
    }
    return changes.reverse();
};

const calculateMetricsForEntity = (entity: Product | Benchmark, benchmarks?: Benchmark[]): Metrics => {
    const { data } = entity;
    if (data.length === 0) throw new Error(`No data for ${entity.name}`);

    const inceptionDate = data[0].date;
    const latestPoint = data[data.length - 1];
    const latestDate = latestPoint.date;
    const latestValue = latestPoint.value;

    const today = new Date(latestDate);
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setUTCDate(today.getUTCDate() - 7);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setUTCMonth(today.getUTCMonth() - 1);
    const startOfYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));

    const change1W = calculateChange(data, oneWeekAgo.getTime(), latestDate);
    const change1M = calculateChange(data, oneMonthAgo.getTime(), latestDate);
    const changeYTD = calculateChange(data, startOfYear.getTime(), latestDate);
    const changeITD = calculateChange(data, inceptionDate, latestDate);
    
    const monthlyChanges = calculateMonthlyChanges(data, latestDate);

    const metrics: Metrics = {
        inceptionDate,
        latestValue,
        latestDate,
        change1W,
        change1M,
        changeYTD,
        changeITD,
        monthlyChanges,
    };
    
    if (entity.type === 'product' && benchmarks && benchmarks.length > 0) {
        metrics.excessReturns = benchmarks.map(b => {
            // For fair comparison, calculate benchmark changes over the exact same period as the product.
            const bChange1W = calculateChange(b.data, oneWeekAgo.getTime(), latestDate);
            const bChange1M = calculateChange(b.data, oneMonthAgo.getTime(), latestDate);
            const bChangeYTD = calculateChange(b.data, startOfYear.getTime(), latestDate);
            // Crucially, use the product's inception date for the benchmark's ITD calculation.
            const bChangeITD = calculateChange(b.data, inceptionDate, latestDate);
            
            return {
                vs: b.name,
                change1W: metrics.change1W !== null && bChange1W !== null ? metrics.change1W - bChange1W : null,
                change1M: metrics.change1M !== null && bChange1M !== null ? metrics.change1M - bChange1M : null,
                changeYTD: metrics.changeYTD !== null && bChangeYTD !== null ? metrics.changeYTD - bChangeYTD : null,
                changeITD: metrics.changeITD !== null && bChangeITD !== null ? metrics.changeITD - bChangeITD : null,
            };
        });
    }

    return metrics;
};


export const calculateAllMetrics = (strategies: Strategy[]): Strategy[] => {
    return strategies.map(strategy => {
        const calculatedBenchmarks = strategy.benchmarks.map(b => ({
            ...b,
            metrics: calculateMetricsForEntity(b),
        }));

        const calculatedProducts = strategy.products.map(p => ({
            ...p,
            metrics: calculateMetricsForEntity(p, calculatedBenchmarks),
        }));

        return { ...strategy, products: calculatedProducts, benchmarks: calculatedBenchmarks };
    });
};