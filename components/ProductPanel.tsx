
import React, { useState, useMemo } from 'react';
import { Product, Benchmark, HistoricalDataPoint } from '../types.ts';

interface ProductPanelProps {
  product: Product;
  strategyBenchmarks: Benchmark[];
  isPdf?: boolean;
}

const MetricItem: React.FC<{ label: string; value: string | React.ReactNode; isPdf?: boolean }> = ({ label, value, isPdf }) => (
  <div className={isPdf ? 'py-1' : 'py-2'}>
    <p className={isPdf ? 'text-xs text-gray-600' : 'text-sm text-slate-500'}>{label}</p>
    <p className={isPdf ? 'text-sm font-bold font-times' : 'text-lg font-semibold text-slate-800'}>{value}</p>
  </div>
);

const PerformanceDisplay: React.FC<{ value: number | null, isPdf?: boolean }> = ({ value, isPdf }) => {
  if (value === null || typeof value === 'undefined') return <span className="text-slate-500">-</span>;
  const isPositive = value > 0;
  const colorClass = isPositive ? (isPdf ? 'text-red-600' : 'text-custom-red') : (isPdf ? 'text-green-600' : 'text-custom-green');
  return <span className={colorClass}>{`${(value * 100).toFixed(2)}%`}</span>;
};

const ProductPanel: React.FC<ProductPanelProps> = ({ product, strategyBenchmarks, isPdf = false }) => {
    const [showAllHistory, setShowAllHistory] = useState(false);
    
    const historicalDataWithChanges = useMemo(() => {
        let prevValue = product.data.length > 0 ? product.data[0].value : 0;
        return product.data.map(point => {
            const change = prevValue !== 0 ? (point.value - prevValue) / prevValue : 0;
            const excessReturns: { [key: string]: number | null } = {};

            strategyBenchmarks.forEach(bm => {
                let prevBmValue: number | undefined = undefined;
                let currentBmValue: number | undefined = undefined;

                for(let i = bm.data.length - 1; i >= 0; i--) {
                    if(bm.data[i].date <= point.date) {
                        currentBmValue = bm.data[i].value;
                        if(i > 0 && bm.data[i-1].date <= new Date(point.date).setDate(new Date(point.date).getDate() -1)) {
                           prevBmValue = bm.data[i-1].value;
                        } else {
                           prevBmValue = currentBmValue;
                        }
                        break;
                    }
                }
                
                if (currentBmValue !== undefined && prevBmValue !== undefined && prevBmValue !== 0) {
                    const bmChange = (currentBmValue - prevBmValue) / prevBmValue;
                    excessReturns[bm.name] = change - bmChange;
                } else {
                    excessReturns[bm.name] = null;
                }
            });

            prevValue = point.value;
            return { ...point, change, excessReturns };
        }).reverse();
    }, [product.data, strategyBenchmarks]);
    
    const displayedHistory = showAllHistory ? historicalDataWithChanges : historicalDataWithChanges.slice(0, 10);
    const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-CA');
    
    const panelClass = isPdf ? "border border-black p-4" : "bg-white p-6 rounded-lg shadow-md";
    const titleClass = isPdf ? "text-xl font-bold mb-4" : "text-xl font-bold text-slate-800 mb-6";
    const gridClass = isPdf ? "grid grid-cols-4 gap-x-4 mb-4" : "grid grid-cols-3 md:grid-cols-6 gap-x-6 gap-y-4 mb-6";

    return (
        <div className={panelClass}>
            <h4 className={titleClass}>{product.name}</h4>
            <div className={gridClass}>
                <MetricItem label="成立日" value={formatDate(product.metrics.inceptionDate)} isPdf={isPdf} />
                <MetricItem label="最新净值" value={product.metrics.latestValue.toFixed(4)} isPdf={isPdf} />
                <MetricItem label="近一周" value={<PerformanceDisplay value={product.metrics.change1W} isPdf={isPdf} />} isPdf={isPdf} />
                <MetricItem label="近一月" value={<PerformanceDisplay value={product.metrics.change1M} isPdf={isPdf} />} isPdf={isPdf} />
                <MetricItem label="今年以来" value={<PerformanceDisplay value={product.metrics.changeYTD} isPdf={isPdf} />} isPdf={isPdf} />
                <MetricItem label="成立以来" value={<PerformanceDisplay value={product.metrics.changeITD} isPdf={isPdf} />} isPdf={isPdf} />
            </div>
            
            <div className={isPdf ? "mb-4" : "mb-6"}>
                 <h5 className={isPdf ? "text-sm font-bold mb-2" : "text-base font-semibold text-slate-700 mb-2"}>近6个月月度涨跌幅</h5>
                 <div className="flex space-x-2">
                     {product.metrics.monthlyChanges.map(mc => (
                         <div key={mc.month} className={isPdf ? "text-center p-1 border border-gray-300" : "text-center p-2 rounded-md bg-slate-50 flex-1"}>
                             <p className={isPdf ? "text-xs" : "text-xs text-slate-500"}>{mc.month}</p>
                             <p className={isPdf ? "font-bold font-times" : "font-semibold"}><PerformanceDisplay value={mc.change} isPdf={isPdf} /></p>
                         </div>
                     ))}
                 </div>
            </div>

            <div>
                <h5 className={isPdf ? "text-sm font-bold mb-2" : "text-base font-semibold text-slate-700 mb-4"}>净值历史</h5>
                <div className="overflow-x-auto">
                    <table className={isPdf ? "w-full text-xs font-times" : "w-full text-sm"}>
                        <thead className={isPdf ? "" : "bg-slate-50"}>
                            <tr>
                                <th className={isPdf ? "p-1 text-left font-bold border-b border-black" : "p-3 text-left text-xs font-semibold text-slate-500 uppercase"}>日期</th>
                                <th className={isPdf ? "p-1 text-left font-bold border-b border-black" : "p-3 text-left text-xs font-semibold text-slate-500 uppercase"}>净值</th>
                                <th className={isPdf ? "p-1 text-left font-bold border-b border-black" : "p-3 text-left text-xs font-semibold text-slate-500 uppercase"}>涨跌幅</th>
                                {strategyBenchmarks.map(bm => <th key={bm.name} className={isPdf ? "p-1 text-left font-bold border-b border-black" : "p-3 text-left text-xs font-semibold text-slate-500 uppercase"}>超额({bm.name})</th>)}
                            </tr>
                        </thead>
                        <tbody className={isPdf ? "divide-y divide-gray-300" : "bg-white divide-y divide-slate-200"}>
                            {displayedHistory.map(h => (
                                <tr key={h.date}>
                                    <td className={isPdf ? "p-1" : "p-3"}>{formatDate(h.date)}</td>
                                    <td className={isPdf ? "p-1" : "p-3"}>{h.value.toFixed(4)}</td>
                                    <td className={isPdf ? "p-1" : "p-3"}><PerformanceDisplay value={h.change} isPdf={isPdf} /></td>
                                    {strategyBenchmarks.map(bm => <td key={bm.name} className={isPdf ? "p-1" : "p-3"}><PerformanceDisplay value={h.excessReturns[bm.name]} isPdf={isPdf} /></td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!isPdf && historicalDataWithChanges.length > 10 && (
                     <button onClick={() => setShowAllHistory(!showAllHistory)} className="text-brand-blue text-sm font-semibold mt-4 hover:underline">
                         {showAllHistory ? '收起' : '显示全部'}
                     </button>
                )}
            </div>
        </div>
    );
};

export default ProductPanel;