import { AppSettings, SubjectConfig, ServerStatus, PromptParts } from '../types';

const API_URL = 'http://localhost:3001/api';

export const getStatus = async (): Promise<ServerStatus> => {
  const res = await fetch(`${API_URL}/status`);
  return res.json();
};

export const getConfig = async (): Promise<{ settings: AppSettings, subjects: SubjectConfig[] }> => {
  const res = await fetch(`${API_URL}/config`);
  return res.json();
};

export const getDefaults = async (): Promise<PromptParts> => {
  const res = await fetch(`${API_URL}/config/defaults`);
  return res.json();
};

export const updateSettings = async (settings: AppSettings): Promise<void> => {
  await fetch(`${API_URL}/config/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
};

export const updateSubjects = async (subjects: SubjectConfig[]): Promise<void> => {
  await fetch(`${API_URL}/config/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subjects)
  });
};

export const startProcessing = async (): Promise<void> => {
  await fetch(`${API_URL}/control/start`, { method: 'POST' });
};

export const stopProcessing = async (): Promise<void> => {
  await fetch(`${API_URL}/control/stop`, { method: 'POST' });
};

export const clearCompleted = async (): Promise<void> => {
  await fetch(`${API_URL}/control/clear`, { method: 'POST' });
};

export const resetDailyLimit = async (): Promise<void> => {
  await fetch(`${API_URL}/control/reset-limit`, { method: 'POST' });
};

export const reorderQueue = async (orderedIds: string[]): Promise<void> => {
  await fetch(`${API_URL}/queue/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds })
  });
};

export const redoFile = async (fileId: string): Promise<void> => {
  await fetch(`${API_URL}/queue/redo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId })
  });
};

export const processSingle = async (fileId: string): Promise<void> => {
  await fetch(`${API_URL}/control/process-single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId })
  });
};