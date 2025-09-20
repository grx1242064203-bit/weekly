import React, { useMemo } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Product, Benchmark, TimeRange } from '../types.ts';
import { CHART_COLORS } from '../constants.ts';

interface NetWorthChartProps {
  data: (Product | Benchmark)[];
  timeRange: TimeRange;
  isPdf?: boolean;
  strategyInceptionDate: number;
}

const NetWorthChart: React.FC<NetWorthChartProps> = ({ data, timeRange, isPdf = false, strategyInceptionDate = 0 }) => {
  const { chartData, series } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], series: [] };
    }
    
    const allDates = new Set<number>();
    data.forEach(item => item.data.forEach(dp => allDates.add(dp.date)));

    const sortedDates = Array.from(allDates).sort((a, b) => a - b);
    
    const latestDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : Date.now();
    
    const getStartDate = (range: TimeRange, latest: number, inception: number): number => {
        const d = new Date(latest);
        switch (range) {
            case TimeRange.M1:
                d.setUTCMonth(d.getUTCMonth() - 1);
                return d.getTime();
            case TimeRange.YTD:
                return new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime();
            case TimeRange.Y1:
                d.setUTCFullYear(d.getUTCFullYear() - 1);
                return d.getTime();
            case TimeRange.Y3:
                d.setUTCFullYear(d.getUTCFullYear() - 3);
                return d.getTime();
            case TimeRange.Y5:
                d.setUTCFullYear(d.getUTCFullYear() - 5);
                return d.getTime();
            case TimeRange.ITD:
            default:
                return inception; // Use the passed-in strategy inception date
        }
    };
    
    const startDate = getStartDate(timeRange, latestDate, strategyInceptionDate);
    const filteredDates = sortedDates.filter(d => d >= startDate);

    const rebasedData: { [date: number]: { [name: string]: number } } = {};
    const seriesData = data.map(item => {
        const firstPointInRange = item.data.find(dp => dp.date >= startDate);
        const rebaseValue = firstPointInRange ? firstPointInRange.value : 1;

        item.data.forEach(dp => {
            if (dp.date >= startDate) {
                if (!rebasedData[dp.date]) {
                    rebasedData[dp.date] = {};
                }
                rebasedData[dp.date][item.name] = (dp.value / rebaseValue);
            }
        });
        return { name: item.name, type: item.type };
    });

    const finalChartData = filteredDates.map((date, index) => {
        let entry: { date: number; [key: string]: number | null } = { date };
        
        seriesData.forEach(s => {
            const point = rebasedData[date]?.[s.name];
            entry[s.name] = point !== undefined ? point : null;
        });
        return entry;
    }).map((entry, index, arr) => {
        // Forward fill missing data, but only if a previous value exists.
        seriesData.forEach(s => {
            if (entry[s.name] === null && index > 0) {
                entry[s.name] = arr[index - 1][s.name];
            }
        });
        return entry;
    });

    return { chartData: finalChartData, series: seriesData };
  }, [data, timeRange, strategyInceptionDate]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-CA');
  };

  const formatTick = (value: number) => value.toFixed(2);
  
  const fontStyle = isPdf ? { fontFamily: 'Times New Roman', fontSize: '10px' } : {};

  return (
    <div style={{ width: '100%', height: isPdf ? 350 : 400 }}>
        <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tickFormatter={formatDate} dy={10} style={fontStyle} />
                <YAxis tickFormatter={formatTick} domain={['auto', 'auto']} style={fontStyle} />
                <Tooltip
                    formatter={(value: number) => value.toFixed(4)}
                    labelFormatter={formatDate}
                    contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        ...fontStyle
                    }}
                />
                <Legend wrapperStyle={fontStyle} />
                {series.map((s, index) => {
                    const isGhProduct = s.name.toLowerCase().startsWith('gh');
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    return (
                        <React.Fragment key={s.name}>
                            {isGhProduct && (
                                <Area
                                    type="monotone"
                                    dataKey={s.name}
                                    fill="#F0F7FF"
                                    stroke="none"
                                    connectNulls={false}
                                />
                            )}
                            <Line
                                type="monotone"
                                dataKey={s.name}
                                stroke={color}
                                strokeWidth={s.type === 'benchmark' ? 3 : 2}
                                dot={false}
                                strokeDasharray={s.type === 'benchmark' ? "5 5" : undefined}
                                connectNulls={false}
                            />
                        </React.Fragment>
                    )
                })}
            </ComposedChart>
        </ResponsiveContainer>
    </div>
  );
};

export default NetWorthChart;