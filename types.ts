import React from 'react';

export interface AppSettings {
  apiKey?: string;
  rpm: number;
  maxWorkers: number;
  modelName: string;
  maxRequestsPerDay: number;
  // Server-side Paths
  outputFolder: string; 
  watchedFolders: string[];
  useSameFolderForOutput: boolean;
  
  renderDpi: number;
  exportFormat: 'image/png' | 'image/jpeg';
  exportQuality: number; // 0.1 to 1.0
  autoProcess: boolean;
  // Excalidraw Settings
  generateExcalidraw: boolean;
  excalidrawThreshold: number; // 0.0 to 1.0
  // Post-Processing
  refineMarkdown: boolean;
  models?: {
    transcription?: string | null;
    excalidraw?: string | null;
    refinement?: string | null;
  };
}

export interface PromptParts {
  styleGuide: string;
  transcriptionGoal: string;
  coordinateGoal: string;
  excalidrawGoal: string;
  refinementGoal: string;
}

export interface SubjectConfig {
  id: string;
  subjectName: string;
  prompts: PromptParts;
  // Optional overrides
  generateExcalidraw?: boolean;
  excalidrawThreshold?: number; 
}

export interface ProcessedFile {
  id: string;
  originalName: string;
  subfolder: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  errorMsg?: string;
}

export interface ServerStatus {
  isProcessing: boolean;
  queue: ProcessedFile[];
  completed: ProcessedFile[];
  logs: string[];
  uptime: number;
  detectedSubjects?: string[];
  dailyRequestCount?: number;
  maxRequestsPerDay?: number;
  dailyResetDate?: string;
}

export interface ProcessingViewProps {
  status: ServerStatus;
  refreshStatus: () => void;
  clearCompleted: () => void;
  startBatch: () => void;
  stopBatch: () => void;
}

export interface PromptManagerProps {
  activeSubjects: string[];
}

export interface DiagramBox {
  diagram_present: boolean;
  box_2d: number[][];
}