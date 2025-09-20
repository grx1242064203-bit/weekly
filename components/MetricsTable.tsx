import React, { useState, useMemo } from 'react';
import { Product, Benchmark, SortConfig } from '../types.ts';
import { ArrowUpIcon, ArrowDownIcon } from './icons.tsx';

type TableData = (Product | (Product & { strategyName: string }) | Benchmark);

interface MetricsTableProps {
  data: TableData[];
  type: 'overview' | 'strategy';
  isPdf?: boolean;
}

const PerformanceCell: React.FC<{ value: number | null }> = ({ value }) => {
    if (value === null || typeof value === 'undefined') return <span className="text-slate-500">-</span>;
    const isPositive = value > 0;
    const colorClass = isPositive ? 'text-custom-red' : 'text-custom-green';
    return <span className={colorClass}>{`${(value * 100).toFixed(2)}%`}</span>;
};

const MetricsTable: React.FC<MetricsTableProps> = ({ data, type, isPdf = false }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'metrics.change1W', direction: 'descending' });
  
  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const keys = sortConfig.key.split('.');
        const aValue = keys.reduce((o, k) => (o as any)?.[k], a);
        const bValue = keys.reduce((o, k) => (o as any)?.[k], b);

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const SortableHeader: React.FC<{ sortKey: string; children: React.ReactNode }> = ({ sortKey, children }) => {
      const isSorted = sortConfig?.key === sortKey;
      const Icon = sortConfig?.direction === 'ascending' ? ArrowUpIcon : ArrowDownIcon;
      return (
          <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
              <div className="flex items-center">
                  {children}
                  {isSorted && <Icon className="w-4 h-4 ml-1" />}
              </div>
          </th>
      );
  };
  
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-CA');

  const getExcessReturn = (product: Product, benchmarkName: string, key: 'change1W' | 'change1M' | 'changeYTD' | 'changeITD') => {
      const excessReturn = product.metrics.excessReturns?.find(er => er.vs === benchmarkName);
      return excessReturn ? excessReturn[key] : null;
  };
  
  const benchmarksInTable = useMemo(() => data.filter(d => d.type === 'benchmark') as Benchmark[], [data]);

  const baseTableClass = isPdf ? "w-full text-sm font-times" : "w-full text-sm";
  const baseThClass = isPdf ? "p-2 text-left text-xs font-bold border-b-2 border-black" : "p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider";
  const baseTdClass = isPdf ? "p-2 border-b border-gray-400" : "p-3 border-b border-slate-200";

  return (
    <div className="overflow-x-auto">
        <table className={baseTableClass}>
        <thead className={isPdf ? "" : "bg-slate-50"}>
            <tr>
            {type === 'overview' && <SortableHeader sortKey="strategyName">策略</SortableHeader>}
            <SortableHeader sortKey="name">产品名称</SortableHeader>
            <SortableHeader sortKey="metrics.inceptionDate">成立日</SortableHeader>
            <SortableHeader sortKey="metrics.latestValue">最新净值</SortableHeader>
            <SortableHeader sortKey="metrics.change1W">近一周涨跌幅</SortableHeader>
            <SortableHeader sortKey="metrics.change1M">近一月涨跌幅</SortableHeader>
            <SortableHeader sortKey="metrics.changeYTD">今年以来涨跌幅</SortableHeader>
            <SortableHeader sortKey="metrics.changeITD">成立以来涨跌幅</SortableHeader>
            {type === 'strategy' && benchmarksInTable.map(bm => (
                <React.Fragment key={bm.name}>
                    <SortableHeader sortKey={`metrics.excessReturns[${benchmarksInTable.indexOf(bm)}].change1W`}>超额({bm.name}) 1W</SortableHeader>
                </React.Fragment>
            ))}
            </tr>
        </thead>
        <tbody className={isPdf ? "" : "bg-white divide-y divide-slate-200"}>
            {sortedData.map((item, index) => {
              const isGhProduct = item.name.toLowerCase().startsWith('gh');
              const isBenchmark = item.type === 'benchmark';
              let rowClass = '';
              if (isBenchmark) {
                rowClass = isPdf ? "font-bold" : "bg-slate-100 font-medium";
              } else if (isGhProduct) {
                rowClass = 'bg-brand-blue-light';
              }

              return (
                <tr key={`${item.name}-${index}`} className={rowClass}>
                    {type === 'overview' && <td className={baseTdClass}>{(item as Product & { strategyName: string }).strategyName}</td>}
                    <td className={`${baseTdClass} font-semibold text-slate-800`}>{item.name}</td>
                    <td className={baseTdClass}>{formatDate(item.metrics.inceptionDate)}</td>
                    <td className={baseTdClass}>{item.metrics.latestValue.toFixed(4)}</td>
                    <td className={baseTdClass}><PerformanceCell value={item.metrics.change1W} /></td>
                    <td className={baseTdClass}><PerformanceCell value={item.metrics.change1M} /></td>
                    <td className={baseTdClass}><PerformanceCell value={item.metrics.changeYTD} /></td>
                    <td className={baseTdClass}><PerformanceCell value={item.metrics.changeITD} /></td>
                    {type === 'strategy' && item.type === 'product' && benchmarksInTable.map(bm => (
                        <td key={bm.name} className={baseTdClass}>
                            <PerformanceCell value={getExcessReturn(item as Product, bm.name, 'change1W')} />
                        </td>
                    ))}
                    {type === 'strategy' && item.type === 'benchmark' && benchmarksInTable.map(bm => <td key={bm.name} className={baseTdClass}>-</td>)}
                </tr>
              );
            })}
        </tbody>
        </table>
    </div>
  );
};

export default MetricsTable;