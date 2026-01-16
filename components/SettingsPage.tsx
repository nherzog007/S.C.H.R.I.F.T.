import React, { useState, useEffect } from 'react';
import { Save, Cpu, Gauge, Image as ImageIcon, FolderOutput, PenTool, Key, Zap, FolderInput, Plus, Trash2, ArrowRight, Wand2, BrainCircuit, RotateCcw } from 'lucide-react';
import { AppSettings } from '../types';
import { getConfig, updateSettings, resetDailyLimit } from '../utils/api';
import { AVAILABLE_MODELS } from '../constants';
import FormField from './FormField';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [newPath, setNewPath] = useState('');

  useEffect(() => {
    getConfig().then(data => setSettings(data.settings));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    await updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetLimit = async () => {
      if (confirm("Are you sure you want to reset the daily request counter to 0?")) {
          await resetDailyLimit();
          setResetSuccess(true);
          setTimeout(() => setResetSuccess(false), 2000);
      }
  };

  const addWatchedFolder = () => {
    if (!settings || !newPath.trim()) return;
    setSettings({
        ...settings,
        watchedFolders: [...settings.watchedFolders, newPath.trim()]
    });
    setNewPath('');
  };

  const removeWatchedFolder = (index: number) => {
    if (!settings) return;
    const newFolders = [...settings.watchedFolders];
    newFolders.splice(index, 1);
    setSettings({ ...settings, watchedFolders: newFolders });
  };

  if (!settings) return <div className="p-8 text-center text-slate-500">Loading configuration from server...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 pb-20 overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-center space-x-3 border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-slate-100">Server Configuration</h2>
      </div>

      <div className="space-y-6">

        {/* API Configuration */}
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">API Configuration</h3>
        <FormField
          label="Gemini API Key"
          icon={<Key className="w-4 h-4 mr-2" />}
        >
          <input
            type="password"
            value={settings.apiKey || ''}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600 font-mono text-sm"
            placeholder="AIzaSy..."
          />
        </FormField>

        <FormField label="Model Selection" icon={<BrainCircuit className="w-4 h-4 mr-2" />}>
            <div className="flex gap-2">
                <select
                    value={settings.modelName}
                    onChange={(e) => setSettings({ ...settings, modelName: e.target.value })}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                    {AVAILABLE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    {!AVAILABLE_MODELS.find(m => m.value === settings.modelName) && <option value={settings.modelName}>{settings.modelName} (Custom)</option>}
                </select>
            </div>
            <div className="mt-2">
                <input 
                    type="text" 
                    placeholder="Or type custom model name..."
                    value={settings.modelName}
                    onChange={(e) => setSettings({ ...settings, modelName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-400 focus:text-slate-200 focus:border-indigo-500 transition-colors"
                />
            </div>
            
            {/* Advanced Model Routing */}
            <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Task Specific Overrides <span className="text-[10px] text-slate-600 normal-case ml-2 font-normal">(Leave "Default" to use main model)</span></h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Transcription Model */}
                    <div className="bg-slate-900/40 p-2 rounded border border-slate-800">
                        <label className="block text-[10px] text-indigo-300 font-bold mb-1 uppercase">Transcription & Vision</label>
                        <select
                            value={settings.models?.transcription || ''}
                            onChange={(e) => {
                                const val = e.target.value || null;
                                setSettings({ 
                                    ...settings, 
                                    models: { ...settings.models, transcription: val } 
                                });
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">Default ({settings.modelName})</option>
                            {AVAILABLE_MODELS.map(m => <option key={`tr-${m.value}`} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>

                    {/* Excalidraw Model */}
                    <div className="bg-slate-900/40 p-2 rounded border border-slate-800">
                        <label className="block text-[10px] text-indigo-300 font-bold mb-1 uppercase">Excalidraw Generation</label>
                        <select
                            value={settings.models?.excalidraw || ''}
                            onChange={(e) => {
                                const val = e.target.value || null;
                                setSettings({ 
                                    ...settings, 
                                    models: { ...settings.models, excalidraw: val } 
                                });
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">Default ({settings.modelName})</option>
                            {AVAILABLE_MODELS.map(m => <option key={`ex-${m.value}`} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>

                    {/* Refinement Model */}
                    <div className="bg-slate-900/40 p-2 rounded border border-slate-800">
                        <label className="block text-[10px] text-indigo-300 font-bold mb-1 uppercase">Refinement & Structure</label>
                        <select
                            value={settings.models?.refinement || ''}
                            onChange={(e) => {
                                const val = e.target.value || null;
                                setSettings({ 
                                    ...settings, 
                                    models: { ...settings.models, refinement: val } 
                                });
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">Default ({settings.modelName})</option>
                            {AVAILABLE_MODELS.map(m => <option key={`rf-${m.value}`} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </FormField>

        {/* Path Configuration */}
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">File System Paths</h3>

        <FormField
          label="Watched Input Folders"
          icon={<FolderInput className="w-4 h-4 mr-2" />}
        >
          <div className="space-y-2 mb-3">
            {settings.watchedFolders.map((path, i) => (
              <div key={i} className="flex gap-2">
                <input
                  disabled
                  value={path}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-slate-400"
                />
                <button onClick={() => removeWatchedFolder(i)} className="text-red-400 hover:text-red-300 px-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {settings.watchedFolders.length === 0 && (
              <div className="text-xs text-slate-600 italic px-2">No folders watched. Add a local path below.</div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500"
              placeholder="Absolute path to watch (e.g. /home/user/PDFs)..."
            />
            <button onClick={addWatchedFolder} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 rounded-md">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </FormField>

        <div className="border-t border-slate-800 pt-4"></div>

        {/* Output Configuration */}
        <div>
                 <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-slate-400 flex items-center">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Match Input Folder
                        <span className="ml-2 text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            Save output next to original PDF
                        </span>
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={settings.useSameFolderForOutput ?? true} 
                            onChange={(e) => setSettings({...settings, useSameFolderForOutput: e.target.checked})} 
                            className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:bg-indigo-600 after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                </div>

                {!settings.useSameFolderForOutput && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
                            <FolderOutput className="w-4 h-4 mr-2" />
                            Output Folder Path
                        </label>
                        <input
                            type="text"
                            value={settings.outputFolder}
                            onChange={(e) => setSettings({ ...settings, outputFolder: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                            placeholder="C:\Users\Name\Documents\Notes\Output"
                        />
                    </div>
                )}
            </div>

        {/* Automation Settings */}
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Automation</h3>
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-400 flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                    Auto-Start Processing
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={settings.autoProcess} 
                        onChange={(e) => setSettings({...settings, autoProcess: e.target.checked})} 
                        className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:bg-indigo-600 after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </div>
        </div>
        
        {/* Processing Config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
              <Cpu className="w-4 h-4 mr-2" />
              Concurrency
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.maxWorkers}
              onChange={(e) => setSettings({ ...settings, maxWorkers: parseInt(e.target.value) || 1 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-slate-100"
            />
          </div>

          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
              <Gauge className="w-4 h-4 mr-2" />
              RPM Limit
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={settings.rpm}
              onChange={(e) => setSettings({ ...settings, rpm: parseInt(e.target.value) || 10 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-slate-100"
            />
          </div>

          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-400 flex items-center">
                <Gauge className="w-4 h-4 mr-2" />
                Max Requests Per Day
                </label>
                <button 
                    onClick={handleResetLimit}
                    className={`text-[10px] flex items-center px-2 py-1 rounded border transition-colors ${resetSuccess ? 'border-green-600 text-green-400 bg-green-900/20' : 'border-slate-700 text-slate-500 hover:text-white hover:bg-slate-800'}`}
                    title="Reset Counter to 0"
                >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    {resetSuccess ? 'Reset!' : 'Reset'}
                </button>
            </div>
            <input
              type="number"
              min={1}
              max={10000}
              value={settings.maxRequestsPerDay}
              onChange={(e) => setSettings({ ...settings, maxRequestsPerDay: parseInt(e.target.value) || 1000 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-slate-100"
            />
          </div>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-4">
           {/* Excalidraw Global Toggle */}
           <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-400 flex items-center">
                  <PenTool className="w-4 h-4 mr-2" />
                  Generate Excalidraw (Global Default)
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                      type="checkbox" 
                      checked={settings.generateExcalidraw} 
                      onChange={(e) => setSettings({...settings, generateExcalidraw: e.target.checked})} 
                      className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:bg-indigo-600 after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
           </div>

           {/* Global Threshold Slider */}
           <div>
              <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center">
                      Confidence Threshold
                  </label>
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded">
                      {(settings.excalidrawThreshold * 100).toFixed(0)}%
                  </span>
              </div>
              <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={settings.excalidrawThreshold}
                  onChange={(e) => setSettings({...settings, excalidrawThreshold: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-slate-600 mt-1">
                  Global minimum confidence score (0-100%) required to accept AI-generated Excalidraw JSON.
              </p>
           </div>
           
           <div className="h-px bg-slate-800" />
           
           {/* Refinement Toggle */}
           <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-400 flex items-center">
                    <Wand2 className="w-4 h-4 mr-2 text-purple-400" />
                    Refine Markdown (Post-Processing)
                </label>
                <p className="text-[10px] text-slate-500 mt-1 ml-6">
                    Fixes disjointed sentences and heading hierarchy after page merging.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                      type="checkbox" 
                      checked={settings.refineMarkdown ?? false} 
                      onChange={(e) => setSettings({...settings, refineMarkdown: e.target.checked})} 
                      className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-900 rounded-full peer peer-checked:bg-purple-600 after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
           </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center justify-center w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <Save className="w-5 h-5 mr-2" />
          {saved ? "Saved!" : "Save Configuration"}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;