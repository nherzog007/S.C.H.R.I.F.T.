import { AppSettings, SubjectConfig, PromptParts } from '../types';
import { DEFAULT_PROMPT_PARTS } from '../constants';

const SETTINGS_KEY = 'noteforge_settings';
const SUBJECTS_KEY = 'noteforge_subjects';
const GLOBAL_PROMPTS_KEY = 'noteforge_global_prompts';

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  rpm: 10,
  maxWorkers: 3,
  modelName: 'gemini-3-pro-preview',
  maxRequestsPerDay: 1000,
  outputFolder: '',
  watchedFolders: [],
  useSameFolderForOutput: true,
  renderDpi: 300,
  exportFormat: 'image/png',
  exportQuality: 0.9,
  autoProcess: false,
  generateExcalidraw: true,
  excalidrawThreshold: 0.6,
  refineMarkdown: false
};

export const loadSettings = (): AppSettings => {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  try {
    // Merge with default to ensure new keys exist if loading old settings
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const loadGlobalPrompts = (): PromptParts => {
  const saved = localStorage.getItem(GLOBAL_PROMPTS_KEY);
  if (!saved) return DEFAULT_PROMPT_PARTS;
  try {
    return { ...DEFAULT_PROMPT_PARTS, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_PROMPT_PARTS;
  }
};

export const saveGlobalPrompts = (prompts: PromptParts) => {
  localStorage.setItem(GLOBAL_PROMPTS_KEY, JSON.stringify(prompts));
};

export const loadSubjectConfigs = (): SubjectConfig[] => {
  const saved = localStorage.getItem(SUBJECTS_KEY);
  if (!saved) return [];
  try {
    // Validate config structure in case defaults changed
    const loaded = JSON.parse(saved);
    return loaded.map((c: any) => ({
      ...c,
      prompts: { ...DEFAULT_PROMPT_PARTS, ...c.prompts }
    }));
  } catch {
    return [];
  }
};

export const saveSubjectConfigs = (configs: SubjectConfig[]) => {
  localStorage.setItem(SUBJECTS_KEY, JSON.stringify(configs));
};

export const getPromptForSubject = (subjectName: string, configs: SubjectConfig[]): PromptParts => {
  const config = configs.find(c => c.subjectName === subjectName);
  return config ? config.prompts : loadGlobalPrompts();
};