import React, { useRef, useEffect, useState } from 'react';
import { Play, Loader2, AlertTriangle, CheckCircle, FileText, Server, Clock, StopCircle, Trash, GripVertical, RotateCcw, PlayCircle } from 'lucide-react';
import { ProcessingViewProps } from '../types';
import { reorderQueue, redoFile, processSingle } from '../utils/api';

const ProcessingView: React.FC<ProcessingViewProps> = ({ 
    status, 
    startBatch,
    stopBatch,
    clearCompleted
}) => {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [status.logs]);

  const activeFiles = [...status.queue];

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Compute new order
    const currentIds = activeFiles.map(f => f.id);
    const draggedIdx = currentIds.indexOf(draggedId);
    const targetIdx = currentIds.indexOf(targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    // Remove dragged item and insert at target position
    currentIds.splice(draggedIdx, 1);
    currentIds.splice(targetIdx, 0, draggedId);

    await reorderQueue(currentIds);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleRedo = async (fileId: string) => {
    await redoFile(fileId);
  };

  const handleProcessSingle = async (fileId: string) => {
    await processSingle(fileId);
  };
  // If processing, the first item in queue is usually the one active in the backend logic, 
  // or the backend marks specific status.
  
  // Format uptime
  const formatUptime = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}h ${m}m`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Top Bar */}
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <div>
            <h2 className="text-xl font-bold text-white flex items-center">
                <Server className="mr-2 text-indigo-400" /> Server Dashboard
            </h2>
            <div className="flex items-center text-xs text-slate-500 mt-1">
                <Clock className="w-3 h-3 mr-1" /> Uptime: {formatUptime(status.uptime)}
                <span className="mx-2">•</span>
                <span>Queue: {status.queue.length}</span>
                <span className="mx-2">•</span>
                <span>Completed: {status.completed.length}</span>
                {status.dailyRequestCount !== undefined && status.maxRequestsPerDay !== undefined && (
                    <>
                        <span className="mx-2">•</span>
                        <span className={status.dailyRequestCount >= status.maxRequestsPerDay ? 'text-red-400 font-semibold' : ''}>
                            Daily Requests: {status.dailyRequestCount}/{status.maxRequestsPerDay}
                        </span>
                    </>
                )}
            </div>
        </div>
        
        <div className="flex items-center space-x-4">
            {status.isProcessing ? (
                 <button 
                    onClick={stopBatch}
                    className="flex items-center px-6 py-2 rounded font-bold text-white bg-red-600 hover:bg-red-700 transition"
                 >
                    <StopCircle className="w-4 h-4 mr-2" /> Stop Server
                 </button>
            ) : (
                 <button 
                    onClick={startBatch}
                    disabled={status.queue.length === 0}
                    className={`flex items-center px-6 py-2 rounded font-bold text-white transition ${status.queue.length === 0 ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                 >
                    <Play className="w-4 h-4 mr-2" /> Start Processing
                 </button>
            )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* File List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {activeFiles.length === 0 && status.completed.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                    <div className="text-center p-8 max-w-md">
                        <Server className="w-20 h-20 text-slate-700 mx-auto mb-6" />
                        <h3 className="text-2xl font-bold text-slate-500 mb-3">Server Idle</h3>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            Waiting for files in watched folders...
                        </p>
                    </div>
                </div>
            )}
            
            {/* Active Queue */}
            {activeFiles.map(file => (
                <div 
                    key={file.id} 
                    draggable={file.status !== 'processing'}
                    onDragStart={(e) => handleDragStart(e, file.id)}
                    onDragOver={(e) => handleDragOver(e, file.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, file.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-slate-900 border p-4 rounded-lg flex items-center justify-between transition-all
                        ${file.status === 'processing' ? 'border-indigo-500/30 animate-pulse-slow' : 'border-slate-700 hover:border-slate-600'}
                        ${draggedId === file.id ? 'opacity-50 scale-95' : ''}
                        ${dragOverId === file.id ? 'border-indigo-400 border-2' : ''}
                        ${file.status !== 'processing' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                    {/* Drag Handle */}
                    <div className={`mr-3 text-slate-600 ${file.status === 'processing' ? 'opacity-30' : 'hover:text-slate-400'}`}>
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex items-center space-x-4 w-1/3">
                        <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-400">
                             {file.status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileText className="w-5 h-5"/>}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-medium text-slate-200 truncate">{file.originalName}</p>
                            <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
                                {file.subfolder}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 px-4">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span className="font-mono">{file.status.toUpperCase()}</span>
                            <span>{file.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${file.progress}%` }}></div>
                        </div>
                    </div>
                    {/* Single Process Button */}
                    {file.status === 'pending' && !status.isProcessing && (
                        <button
                            onClick={() => handleProcessSingle(file.id)}
                            title="Process this file only"
                            className="ml-2 p-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/40 transition"
                        >
                            <PlayCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}

            {/* Completed List (Limited history) */}
            {status.completed.length > 0 && (
                <div className="mt-8 border-t border-slate-800 pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase">Recently Completed</h3>
                        <button onClick={clearCompleted} className="text-xs text-slate-600 hover:text-red-400 flex items-center">
                            <Trash className="w-3 h-3 mr-1" /> Clear History
                        </button>
                    </div>
                    <div className="space-y-2 opacity-60 hover:opacity-100 transition">
                        {status.completed.map(file => (
                            <div key={file.id} className="bg-slate-950 border border-slate-800 p-3 rounded flex items-center justify-between group">
                                <div className="flex items-center space-x-3">
                                    {file.status === 'error' ? (
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                    <span className="text-sm text-slate-400 truncate w-64">{file.originalName}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {file.status === 'error' ? (
                                        <span className="text-xs text-red-500 truncate max-w-[150px]">{file.errorMsg}</span>
                                    ) : (
                                        <span className="text-xs text-green-500">Saved to Output</span>
                                    )}
                                    <button
                                        onClick={() => handleRedo(file.id)}
                                        title="Re-process this file"
                                        className="p-1.5 rounded bg-slate-800 text-slate-500 hover:text-indigo-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Logs Panel */}
        <div className="w-96 bg-black border-l border-slate-800 flex flex-col shrink-0">
             <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Server Logs</h3>
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live connection"></div>
             </div>
             <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-slate-500 space-y-1">
                {status.logs.length === 0 && <span className="opacity-30 italic">No logs yet...</span>}
                {status.logs.map((log, i) => (
                    <div key={i} className="break-words border-b border-slate-900/50 pb-0.5">{log}</div>
                ))}
                <div ref={logsEndRef} />
             </div>
        </div>

      </div>
    </div>
  );
};

export default ProcessingView;