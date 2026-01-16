import { PromptParts } from './types';

export const AVAILABLE_MODELS = [
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (Recommended for Reasoning)' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Faster/Cheaper)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

export const DEFAULT_STYLE_GUIDE = ``;
export const DEFAULT_TRANSCRIPTION_GOAL = ``;
export const DEFAULT_COORDINATE_GOAL = ``;
export const DEFAULT_EXCALIDRAW_GOAL = ``;
export const DEFAULT_REFINEMENT_GOAL = ``;

export const DEFAULT_PROMPT_PARTS: PromptParts = {
  styleGuide: "",
  transcriptionGoal: "",
  coordinateGoal: "",
  excalidrawGoal: "",
  refinementGoal: ""
};