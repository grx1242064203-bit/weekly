
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons.tsx';

interface FileUploaderProps {
  onDataUpload: (files: FileList) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onDataUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onDataUpload(files);
    }
  }, [onDataUpload]);
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if(files && files.length > 0) {
          onDataUpload(files);
      }
  }, [onDataUpload]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-brand-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            <h1 className="text-xl font-semibold text-slate-800">产品净值周度更新系统</h1>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">数据上传</h2>
            <p className="text-slate-500 mb-6">上传策略文件夹</p>

            <div 
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-200 ${isDragging ? 'border-brand-blue bg-brand-blue-light' : 'border-slate-300 bg-slate-50'}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <UploadIcon className="w-16 h-16 text-slate-400 mb-4"/>
                <p className="text-slate-600 font-semibold text-lg mb-2">拖放策略文件夹到此处, 或</p>
                <label htmlFor="folder-upload" className="cursor-pointer bg-brand-blue text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-600 transition-colors">
                  选择文件夹
                </label>
                <input 
                  id="folder-upload" 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                  // @ts-ignore
                  webkitdirectory="true"
                  directory="true"
                />
                <div className="text-left text-sm text-slate-500 mt-6 max-w-md mx-auto space-y-1">
                    <p><span className="font-semibold">文件结构:</span> 总文件夹 → 策略文件夹 → 产品净值序列.xlsx</p>
                    <p><span className="font-semibold">Excel格式:</span> 第一列日期, 第二列净值。文件名即为产品名称。</p>
                </div>
              </div>
            </div>
        </div>
      </main>
      <footer className="text-center py-4 text-slate-500 text-sm">
        产品净值周度更新系统 © 2025
      </footer>
    </div>
  );
};

export default FileUploader;