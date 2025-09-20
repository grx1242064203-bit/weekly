
import React, { useState, useEffect, useCallback } from 'react';
import FileUploader from './components/FileUploader.tsx';
import Dashboard from './components/Dashboard.tsx';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import { Strategy } from './types.ts';
import { processUploadedFiles, processBenchmarkFiles } from './services/dataProcessor.ts';
import { LoadingIcon } from './components/icons.tsx';

const App: React.FC = () => {
  const [strategies, setStrategies] = useLocalStorage<Strategy[]>('strategiesData', []);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing...');
  const [view, setView] = useState<'uploader' | 'dashboard'>('uploader');

  useEffect(() => {
    if (strategies && strategies.length > 0) {
      setView('dashboard');
    }
    setIsLoading(false);
  }, [strategies]);

  const handleDataUpload = useCallback(async (files: FileList) => {
    setIsLoading(true);
    setLoadingMessage('Processing product data...');
    try {
      const processedData = await processUploadedFiles(files);
      setStrategies(processedData);
      setView('dashboard');
    } catch (error) {
      console.error("Error processing files:", error);
      alert(`An error occurred while processing files: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [setStrategies]);
  
  const handleBenchmarkUpload = useCallback(async (strategyName: string, files: FileList) => {
    if (!strategies) return;
    setIsLoading(true);
    setLoadingMessage(`Processing benchmarks for ${strategyName}...`);
    try {
      const updatedStrategies = await processBenchmarkFiles(strategyName, files, strategies);
      setStrategies(updatedStrategies);
    } catch (error) {
      console.error("Error processing benchmark files:", error);
      alert(`An error occurred while processing benchmark files: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [strategies, setStrategies]);

  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to delete all uploaded data?')) {
      setStrategies([]);
      setView('uploader');
    }
  }, [setStrategies]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-700">
        <LoadingIcon className="w-16 h-16 animate-spin text-brand-blue" />
        <p className="mt-4 text-lg">{loadingMessage}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {view === 'dashboard' && strategies && strategies.length > 0 ? (
        <Dashboard strategies={strategies} onReset={handleReset} onBenchmarkUpload={handleBenchmarkUpload} />
      ) : (
        <FileUploader onDataUpload={handleDataUpload} />
      )}
    </div>
  );
};

export default App;