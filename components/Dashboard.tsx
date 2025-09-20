import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Strategy, TimeRange, Product, Benchmark } from '../types.ts';
import MetricsTable from './MetricsTable.tsx';
import NetWorthChart from './NetWorthChart.tsx';
import ProductPanel from './ProductPanel.tsx';
import { ExportIcon, ResetIcon, UploadIcon } from './icons.tsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface DashboardProps {
  strategies: Strategy[];
  onReset: () => void;
  onBenchmarkUpload: (strategyName: string, files: FileList) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ strategies, onReset, onBenchmarkUpload }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.ITD);
  const [isExporting, setIsExporting] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);

  const allProducts = useMemo(() => {
    return strategies.flatMap(s => s.products.map(p => ({ ...p, strategyName: s.name })));
  }, [strategies]);

  const latestDate = useMemo(() => {
    const dates = allProducts.map(p => p.metrics.latestDate).filter(d => d);
    return dates.length > 0 ? Math.max(...dates) : new Date().getTime();
  }, [allProducts]);
  
  const strategyInceptionDate = useMemo(() => {
    const productsInView = (activeTab === 'Overview')
      ? allProducts
      : strategies.find(s => s.name === activeTab)?.products;

    if (!productsInView || productsInView.length === 0) return 0;
    
    const inceptionDates = productsInView.map(p => p.metrics.inceptionDate);
    return Math.min(...inceptionDates);
  }, [activeTab, strategies, allProducts]);

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleBenchmarkFileChange = (e: React.ChangeEvent<HTMLInputElement>, strategyName: string) => {
    if (e.target.files && e.target.files.length > 0) {
        onBenchmarkUpload(strategyName, e.target.files);
    }
  };

  const generatePdf = useCallback(async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageHeight = 297;
        const pageWidth = 210;
        const margin = 10;
        const pageContentHeight = pageHeight - margin * 2 - 15; // available height for content
        const contentWidth = pageWidth - margin * 2;
        let pageCounter = 1;

        const addHeader = (pdfInstance: jsPDF, pageNum: number) => {
          pdfInstance.setFontSize(9);
          pdfInstance.setFont('times', 'normal');
          pdfInstance.text('Beijing Gaohua Securities Brokerage and Wealth Management Department Product Research Group', margin, margin);
          pdfInstance.text(`Page ${pageNum}`, pageWidth - margin, margin, { align: 'right' });
          pdfInstance.line(margin, margin + 2, pageWidth - margin, margin + 2);
        };

        const addFooter = (pdfInstance: jsPDF) => {
            pdfInstance.setFontSize(9);
            pdfInstance.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, pageHeight - margin / 2);
        };

        // --- Title Page ---
        addHeader(pdf, pageCounter);
        pdf.setFont('kai', 'bold');
        pdf.setFontSize(24);
        pdf.text('周度产品净值分析报告', pageWidth / 2, pageHeight / 3, { align: 'center' });
        pdf.setFontSize(16);
        pdf.setFont('times', 'normal');
        pdf.text(`净值最新日期: ${formatDate(latestDate)}`, pageWidth / 2, pageHeight / 3 + 20, { align: 'center' });
        addFooter(pdf);

        const contentElement = reportRef.current;
        const sections = Array.from(contentElement.children) as HTMLElement[];

        for (const section of sections) {
            const canvas = await html2canvas(section, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const pdfImgHeight = contentWidth / ratio;

            let heightLeft = pdfImgHeight;
            let position = -margin - 10; // Start position for image (negative)
            
            pdf.addPage();
            pageCounter++;
            addHeader(pdf, pageCounter);
            addFooter(pdf);

            while (heightLeft > 0) {
                pdf.addImage(imgData, 'PNG', margin, position, contentWidth, pdfImgHeight);
                heightLeft -= pageContentHeight;
                
                if (heightLeft > 0) {
                    pdf.addPage();
                    pageCounter++;
                    addHeader(pdf, pageCounter);
                    addFooter(pdf);
                    position -= pageContentHeight;
                }
            }
        }

        pdf.save(`周度产品净值分析报告-${formatDate(latestDate)}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert(`An error occurred while generating the PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsExporting(false);
    }
  }, [strategies, latestDate, allProducts]);

  const renderContent = () => {
    if (activeTab === 'Overview') {
      return (
        <div id="overview-section">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">总览</h2>
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-semibold text-slate-700 mb-4">所有产品指标汇总</h3>
            <MetricsTable data={allProducts} type="overview" />
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-slate-700 mb-4">所有产品净值曲线</h3>
            <NetWorthChart data={allProducts} timeRange={timeRange} strategyInceptionDate={strategyInceptionDate} />
          </div>
        </div>
      );
    }

    const strategy = strategies.find(s => s.name === activeTab);
    if (!strategy) return null;
    
    const strategyEntities = [...strategy.products, ...strategy.benchmarks];

    return (
      <div id={`${strategy.name}-section`}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800">{strategy.name}</h2>
            <div>
                <label htmlFor={`bm-upload-${strategy.name}`} className="inline-flex items-center bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors text-sm cursor-pointer">
                    <UploadIcon className="w-4 h-4 mr-2"/>
                    {strategy.benchmarks.length > 0 ? '更新 Benchmark' : '上传 Benchmark'}
                </label>
                <input id={`bm-upload-${strategy.name}`} type="file" multiple className="hidden" onChange={(e) => handleBenchmarkFileChange(e, strategy.name)} accept=".xlsx" />
            </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold text-slate-700 mb-4">策略产品及基准指标</h3>
          <MetricsTable data={strategyEntities} type="strategy" />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-semibold text-slate-700 mb-4">策略产品及基准净值曲线</h3>
            <NetWorthChart data={strategyEntities} timeRange={timeRange} strategyInceptionDate={strategyInceptionDate} />
        </div>

        <div>
            <h3 className="text-xl font-semibold text-slate-700 mb-6">各产品详情</h3>
            <div className="space-y-6">
                {strategy.products.map(product => (
                    <ProductPanel key={product.name} product={product} strategyBenchmarks={strategy.benchmarks} />
                ))}
            </div>
        </div>
      </div>
    );
  };
  
  const renderPrintableContent = () => (
    <div ref={reportRef} className="absolute -left-[9999px] top-0 w-[800px] bg-white text-black font-kai">
        {/* Overview for PDF */}
        <div className="p-4 printable-section" id="print-overview">
            <h2 className="text-2xl font-bold mb-4">总览</h2>
            <h3 className="text-xl font-semibold mb-2">所有产品指标汇总</h3>
            <MetricsTable data={allProducts} type="overview" isPdf={true} />
            <div className="mt-4">
                <h3 className="text-xl font-semibold mb-2">所有产品净值曲线</h3>
                <NetWorthChart data={allProducts} timeRange={TimeRange.ITD} isPdf={true} strategyInceptionDate={strategyInceptionDate} />
            </div>
        </div>
        
        {/* Strategies for PDF */}
        {strategies.map(strategy => {
            const strategyEntities = [...strategy.products, ...strategy.benchmarks];
            const productsInStrategy = strategies.find(s => s.name === strategy.name)?.products;
            const strategyPdfInceptionDate = productsInStrategy && productsInStrategy.length > 0 ? Math.min(...productsInStrategy.map(p=>p.metrics.inceptionDate)) : 0;

            return (
                <div key={strategy.name} className="p-4 printable-section" id={`print-${strategy.name}`}>
                    <h2 className="text-2xl font-bold mb-4">{strategy.name}</h2>
                    <h3 className="text-xl font-semibold mb-2">策略产品及基准指标</h3>
                    <MetricsTable data={strategyEntities} type="strategy" isPdf={true} />
                    <div className="mt-4">
                        <h3 className="text-xl font-semibold mb-2">策略产品及基准净值曲线</h3>
                        <NetWorthChart data={strategyEntities} timeRange={TimeRange.ITD} isPdf={true} strategyInceptionDate={strategyPdfInceptionDate} />
                    </div>
                    {strategy.products.map(product => (
                        <div key={product.name} className="mt-4">
                            <ProductPanel product={product} strategyBenchmarks={strategy.benchmarks} isPdf={true} />
                        </div>
                    ))}
                </div>
            );
        })}
    </div>
  );


  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-brand-blue" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
              <h1 className="text-xl font-semibold text-slate-800">产品净值周度更新系统</h1>
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-500">最新更新: {formatDate(latestDate)}</span>
                <button onClick={onReset} className="inline-flex items-center bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors text-sm">
                    <ResetIcon className="w-4 h-4 mr-2"/>
                    重置数据
                </button>
                <button onClick={generatePdf} disabled={isExporting} className="inline-flex items-center bg-brand-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:bg-blue-300 disabled:cursor-not-allowed">
                    <ExportIcon className="w-4 h-4 mr-2"/>
                    {isExporting ? '生成中...' : '导出PDF报告'}
                </button>
            </div>
          </div>
          <div className="mt-4 border-b border-slate-200">
            <nav className="-mb-px flex space-x-6">
              {['Overview', ...strategies.map(s => s.name)].map(tabName => (
                <button key={tabName} onClick={() => setActiveTab(tabName)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tabName ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                  {tabName === 'Overview' ? '总览' : tabName}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>
      
      <main className="max-w-screen-xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end mb-6">
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
                {Object.values(TimeRange).map(range => (
                    <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${timeRange === range ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>
                        {range}
                    </button>
                ))}
            </div>
        </div>
        {renderContent()}
      </main>

      {isExporting && renderPrintableContent()}
      
      <footer className="text-center py-6 text-slate-500 text-sm">
        产品净值周度更新系统 © 2025
      </footer>
    </>
  );
};

export default Dashboard;