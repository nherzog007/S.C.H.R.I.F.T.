import React, { useState, useEffect } from 'react';
import { Plus, Trash, Edit2, FolderOpen, Save, BookOpen, AlertCircle, Globe, RotateCcw, Wand2, PenTool, ToggleLeft } from 'lucide-react';
import { SubjectConfig, PromptParts, PromptManagerProps } from '../types';
import { loadSubjectConfigs, saveSubjectConfigs } from '../utils/storage';
import { updateSubjects, getConfig, getDefaults } from '../utils/api';

const GLOBAL_CONFIG_ID = 'GLOBAL_DEFAULTS';

// Ensure subject IDs map cleanly to folder names on disk
const makeSubjectId = (name: string) => {
    const cleaned = name.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    return cleaned || 'subject';
};

const PromptManager: React.FC<PromptManagerProps> = ({ activeSubjects }) => {
  // Data State
  const [configs, setConfigs] = useState<SubjectConfig[]>([]);
  // Local state for what the "Server Defaults" are (fetched on mount)
  const [serverDefaults, setServerDefaults] = useState<PromptParts>({
      styleGuide: '', transcriptionGoal: '', coordinateGoal: '', excalidrawGoal: '', refinementGoal: ''
  });
  const [globalPrompts, setGlobalPrompts] = useState<PromptParts>(serverDefaults);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [selectedId, setSelectedId] = useState<string | null>(GLOBAL_CONFIG_ID);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Editor State
  const [editingConfig, setEditingConfig] = useState<SubjectConfig | null>(null);

  // Load configs from server on mount to ensure synchronization
  useEffect(() => {
    const fetchConfigs = async () => {
        try {
            // 1. Get System Defaults (The single source of truth from server.js)
            const defaults = await getDefaults();
            setServerDefaults(defaults);

            // 2. Get Configs
            const data = await getConfig();
            if (data.subjects && data.subjects.length > 0) {
                setConfigs(data.subjects);
                const global = data.subjects.find(s => s.id === GLOBAL_CONFIG_ID);
                if (global) {
                    setGlobalPrompts(global.prompts);
                } else {
                    // If no global override saved, use system defaults
                    setGlobalPrompts(defaults);
                }
            } else {
                // If completely fresh, fallback to local storage (if any) or defaults
                const local = loadSubjectConfigs();
                setConfigs(local);
                if (local.length === 0) {
                    setGlobalPrompts(defaults);
                }
            }
        } catch (e) {
            console.error("Failed to fetch configs from server", e);
            // Fallback for offline dev, though server is required for this app
        } finally {
            setIsLoading(false);
        }
    };
    fetchConfigs();
  }, []);

  // Set initial editing state once data is loaded
  useEffect(() => {
      if (!isLoading && !editingConfig && selectedId === GLOBAL_CONFIG_ID) {
          setEditingConfig({
              id: GLOBAL_CONFIG_ID,
              subjectName: "Global Defaults",
              prompts: globalPrompts
          });
      }
  }, [isLoading, globalPrompts]);

  const handleAddSubject = (name?: string) => {
    const subjName = name || newSubjectName.trim();
    if (!subjName) return;

    const existing = configs.find(c => c.subjectName === subjName);
    if (existing) {
        handleSelect(existing);
        setNewSubjectName('');
        return;
    }

    const newConfig: SubjectConfig = {
            id: makeSubjectId(subjName),
      subjectName: subjName,
      prompts: { ...globalPrompts }
    };
    const newConfigs = [...configs, newConfig];
    setConfigs(newConfigs);
    setNewSubjectName('');
    handleSelect(newConfig);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this custom configuration? The folder will revert to using Global Defaults.")) {
        const newConfigs = configs.filter(c => c.id !== id);
        setConfigs(newConfigs);
        // Sync delete to server immediately
        updateSubjects(newConfigs).catch(err => console.error("Failed to sync delete", err));
        
        if (selectedId === id) {
          handleSelectGlobal();
        }
    }
  };

  const handleSelect = (config: SubjectConfig) => {
    setSelectedId(config.id);
    setEditingConfig({ ...config });
  };

  const handleSelectGlobal = () => {
      setSelectedId(GLOBAL_CONFIG_ID);
      setEditingConfig({
          id: GLOBAL_CONFIG_ID,
          subjectName: "Global Defaults",
          prompts: globalPrompts
      });
  };

  const handleSaveEdit = async () => {
    if (!editingConfig) return;

    let updatedConfigs = [...configs];

    if (editingConfig.id === GLOBAL_CONFIG_ID) {
        // Save Global State
        setGlobalPrompts(editingConfig.prompts);
        
        const globalIndex = updatedConfigs.findIndex(c => c.id === GLOBAL_CONFIG_ID);
        if (globalIndex >= 0) {
            updatedConfigs[globalIndex] = editingConfig;
        } else {
            updatedConfigs.push(editingConfig);
        }
    } else {
        // Save Subject
        updatedConfigs = configs.map(c => c.id === editingConfig.id ? editingConfig : c);
    }

    // IMPORTANT: Update state for both Global and Subjects
    setConfigs(updatedConfigs);
    saveSubjectConfigs(updatedConfigs);

    try {
        await updateSubjects(updatedConfigs);
        const btn = document.getElementById('save-btn');
        if(btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Saved!';
            setTimeout(() => btn.innerHTML = originalText, 1500);
        }
    } catch (e) {
        alert("Failed to sync prompts to server. Check console.");
        console.error(e);
    }
  };

  const handleResetToGlobal = () => {
      if (!editingConfig || editingConfig.id === GLOBAL_CONFIG_ID) return;
      if (confirm("Reset these prompts to match current Global Defaults?")) {
          setEditingConfig({
              ...editingConfig,
              prompts: { ...globalPrompts },
              generateExcalidraw: undefined,
              excalidrawThreshold: undefined
          });
      }
  };

  const handleResetToSystemDefaults = () => {
      if (!editingConfig) return;
      if (confirm("Reset everything to the original Server System Defaults?")) {
          setEditingConfig({
              ...editingConfig,
              prompts: { ...serverDefaults },
              generateExcalidraw: undefined,
              excalidrawThreshold: undefined
          });
      }
  }

  const combinedList = () => {
      const items = [...configs.filter(c => c.id !== GLOBAL_CONFIG_ID)]; 
      
      activeSubjects.forEach(sub => {
          if (!items.find(i => i.subjectName === sub)) {
              items.push({
                  id: `temp-${sub}`,
                  subjectName: sub,
                  prompts: serverDefaults
              });
          }
      });
      
      return items.sort((a, b) => {
          const aActive = activeSubjects.includes(a.subjectName);
          const bActive = activeSubjects.includes(b.subjectName);
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          return a.subjectName.localeCompare(b.subjectName);
      });
  };

  const isGlobal = selectedId === GLOBAL_CONFIG_ID;

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 p-6 max-h-[calc(100vh-80px)] overflow-hidden">
      {/* Sidebar List */}
      <div className="w-full md:w-1/4 bg-slate-900 rounded-lg border border-slate-800 p-4 flex flex-col shadow-lg">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-indigo-400"/>
            Configuration
        </h3>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            placeholder="Add Subject..."
            className="flex-1 bg-slate-800 text-sm border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
          />
          <button onClick={() => handleAddSubject()} className="bg-indigo-600 p-1.5 rounded hover:bg-indigo-700 text-white transition">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {/* Global Item */}
            <div
                onClick={handleSelectGlobal}
                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-all border
                    ${isGlobal ? 'bg-indigo-900/40 border-indigo-500/50' : 'bg-slate-800 border-transparent hover:bg-slate-750 hover:border-slate-700'}
                `}
            >
                <div className="flex items-center">
                    <Globe className={`w-4 h-4 mr-2 ${isGlobal ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <div className="flex flex-col">
                        <span className={`font-medium text-sm ${isGlobal ? 'text-white' : 'text-slate-300'}`}>Global Defaults</span>
                        <span className="text-[10px] text-slate-500">Fallback for all folders</span>
                    </div>
                </div>
            </div>

            <div className="h-px bg-slate-800 my-2 mx-2" />

            {/* Subject List */}
            {combinedList().map(c => {
                const isTemp = c.id.startsWith('temp-');
                const isActive = activeSubjects.includes(c.subjectName);
                const isSelected = selectedId === c.id;
                
                return (
                    <div
                    key={c.id}
                    onClick={() => isTemp ? handleAddSubject(c.subjectName) : handleSelect(c)}
                    className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-all border
                        ${isSelected ? 'bg-indigo-900/40 border-indigo-500/50' : 'bg-slate-800 border-transparent hover:bg-slate-750 hover:border-slate-700'}
                        ${isTemp ? 'opacity-70 border-dashed border-slate-700' : ''}
                    `}
                    >
                    <div className="flex items-center overflow-hidden">
                        {isActive ? (
                            <FolderOpen className="w-4 h-4 mr-2 text-indigo-400 flex-shrink-0" />
                        ) : (
                            <div className="w-4 h-4 mr-2 flex-shrink-0" />
                        )}
                        <div className="flex flex-col overflow-hidden">
                            <span className={`font-medium truncate text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>{c.subjectName}</span>
                            {isTemp && <span className="text-[10px] text-indigo-400">Click to Configure</span>}
                        </div>
                    </div>
                    
                    {!isTemp && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                            <Trash className="w-3.5 h-3.5" />
                        </button>
                    )}
                    </div>
                );
            })}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 bg-slate-900 rounded-lg border border-slate-800 p-6 flex flex-col overflow-hidden shadow-xl">
        {editingConfig ? (
          <>
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center">
                 <h2 className="text-xl font-bold text-white mr-3 flex items-center">
                    {editingConfig.id === GLOBAL_CONFIG_ID ? (
                        <Globe className="w-5 h-5 mr-2 text-indigo-400" />
                    ) : (
                        <span className="text-slate-400 font-normal mr-2">Folder:</span> 
                    )}
                    {editingConfig.subjectName}
                 </h2>
                 {activeSubjects.includes(editingConfig.subjectName) && editingConfig.id !== GLOBAL_CONFIG_ID && (
                     <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full border border-indigo-500/30">Active</span>
                 )}
              </div>
              
              <div className="flex space-x-3">
                  {/* Reset Logic Buttons */}
                  {editingConfig.id !== GLOBAL_CONFIG_ID ? (
                      <button 
                        onClick={handleResetToGlobal}
                        className="flex items-center bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium transition text-xs"
                        title="Reset to Global Defaults"
                      >
                        <RotateCcw className="w-3 h-3 mr-2" /> Use Global
                      </button>
                  ) : (
                      <button 
                        onClick={handleResetToSystemDefaults}
                        className="flex items-center bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium transition text-xs"
                        title="Reset to System Factory Defaults"
                      >
                        <RotateCcw className="w-3 h-3 mr-2" /> System Reset
                      </button>
                  )}

                  <button 
                    id="save-btn"
                    onClick={handleSaveEdit} 
                    className="flex items-center bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium transition shadow-lg shadow-green-900/20"
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Config
                  </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              
              {/* Folder Settings Override Section */}
              {editingConfig.id !== GLOBAL_CONFIG_ID && (
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 mb-6">
                      <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center">
                          <ToggleLeft className="w-4 h-4 mr-2" /> Folder Settings Override
                      </h4>
                      
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-slate-300">
                                  Override Excalidraw Settings
                              </label>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                      type="checkbox" 
                                      checked={editingConfig.generateExcalidraw !== undefined} 
                                      onChange={(e) => {
                                          if (e.target.checked) {
                                              setEditingConfig({ ...editingConfig, generateExcalidraw: true, excalidrawThreshold: 0.6 });
                                          } else {
                                              setEditingConfig({ ...editingConfig, generateExcalidraw: undefined, excalidrawThreshold: undefined });
                                          }
                                      }} 
                                      className="sr-only peer" 
                                  />
                                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                              </label>
                          </div>

                          {editingConfig.generateExcalidraw !== undefined && (
                              <div className="pl-4 border-l-2 border-indigo-900/50 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                  <div className="flex items-center justify-between">
                                      <label className="text-sm text-slate-400 flex items-center">
                                          <PenTool className="w-3.5 h-3.5 mr-2" /> Enable Generation
                                      </label>
                                      <input 
                                          type="checkbox"
                                          checked={editingConfig.generateExcalidraw}
                                          onChange={(e) => setEditingConfig({ ...editingConfig, generateExcalidraw: e.target.checked })}
                                          className="w-4 h-4 text-indigo-600 bg-slate-800 border-slate-700 rounded focus:ring-indigo-500"
                                      />
                                  </div>
                                  
                                  <div>
                                      <div className="flex justify-between items-center mb-2">
                                          <label className="text-xs text-slate-400">Confidence Threshold</label>
                                          <span className="text-xs font-mono text-indigo-400">
                                              {((editingConfig.excalidrawThreshold || 0.6) * 100).toFixed(0)}%
                                          </span>
                                      </div>
                                      <input 
                                          type="range" 
                                          min="0" 
                                          max="1" 
                                          step="0.05"
                                          value={editingConfig.excalidrawThreshold ?? 0.6}
                                          onChange={(e) => setEditingConfig({ ...editingConfig, excalidrawThreshold: parseFloat(e.target.value) })}
                                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                      />
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              <div className="group">
                <label className="block text-sm font-semibold text-indigo-300 mb-2 flex items-center">
                    Style Guide
                    <span className="ml-2 text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Part 1</span>
                </label>
                <textarea
                  value={editingConfig.prompts.styleGuide}
                  onChange={(e) => setEditingConfig({...editingConfig, prompts: {...editingConfig.prompts, styleGuide: e.target.value}})}
                  className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-300 leading-relaxed focus:ring-2 focus:ring-indigo-500/50 outline-none transition resize-y"
                  spellCheck={false}
                  placeholder={isLoading ? "Loading..." : ""}
                />
              </div>
              
              <div className="group">
                <label className="block text-sm font-semibold text-indigo-300 mb-2 flex items-center">
                    Transcription Prompt
                    <span className="ml-2 text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Part 2</span>
                </label>
                <div className="bg-blue-900/10 border border-blue-900/30 rounded p-2 mb-2 flex items-start">
                    <AlertCircle className="w-4 h-4 text-blue-400 mr-2 mt-0.5" />
                    <p className="text-xs text-blue-300">Use <code className="text-white bg-blue-900/50 px-1 rounded">{'{{STYLE_GUIDE}}'}</code> to insert the style guide.</p>
                </div>
                <textarea
                  value={editingConfig.prompts.transcriptionGoal}
                  onChange={(e) => setEditingConfig({...editingConfig, prompts: {...editingConfig.prompts, transcriptionGoal: e.target.value}})}
                  className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-300 leading-relaxed focus:ring-2 focus:ring-indigo-500/50 outline-none transition resize-y"
                  spellCheck={false}
                  placeholder={isLoading ? "Loading..." : ""}
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-indigo-300 mb-2 flex items-center">
                    Diagram Extraction Prompt
                    <span className="ml-2 text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Part 3</span>
                </label>
                <textarea
                  value={editingConfig.prompts.coordinateGoal}
                  onChange={(e) => setEditingConfig({...editingConfig, prompts: {...editingConfig.prompts, coordinateGoal: e.target.value}})}
                  className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-300 leading-relaxed focus:ring-2 focus:ring-indigo-500/50 outline-none transition resize-y"
                  spellCheck={false}
                  placeholder={isLoading ? "Loading..." : ""}
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-indigo-300 mb-2 flex items-center">
                    Excalidraw Conversion Prompt
                    <span className="ml-2 text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Part 4</span>
                </label>
                <textarea
                  value={editingConfig.prompts.excalidrawGoal}
                  onChange={(e) => setEditingConfig({...editingConfig, prompts: {...editingConfig.prompts, excalidrawGoal: e.target.value}})}
                  className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-300 leading-relaxed focus:ring-2 focus:ring-indigo-500/50 outline-none transition resize-y"
                  spellCheck={false}
                  placeholder={isLoading ? "Loading..." : ""}
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-purple-300 mb-2 flex items-center">
                    <Wand2 className="w-4 h-4 mr-2" />
                    Refinement Prompt (Post-Processing)
                    <span className="ml-2 text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Part 5</span>
                </label>
                <div className="bg-purple-900/10 border border-purple-900/30 rounded p-2 mb-2 flex items-start">
                    <AlertCircle className="w-4 h-4 text-purple-400 mr-2 mt-0.5" />
                    <p className="text-xs text-purple-300">
                        This runs on the <strong>full document</strong> after all pages are concatenated. Use it to fix flow, headers, and split sentences. 
                        Only active if "Refine Markdown" is enabled in Settings.
                    </p>
                </div>
                <textarea
                  value={editingConfig.prompts.refinementGoal}
                  onChange={(e) => setEditingConfig({...editingConfig, prompts: {...editingConfig.prompts, refinementGoal: e.target.value}})}
                  className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-300 leading-relaxed focus:ring-2 focus:ring-purple-500/50 outline-none transition resize-y"
                  spellCheck={false}
                  placeholder={isLoading ? "Loading..." : ""}
                />
              </div>

            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
                <Edit2 className="w-8 h-8 opacity-50" />
            </div>
            <div className="text-center">
                <p className="text-lg font-medium text-slate-300">No Config Selected</p>
                <p className="text-sm max-w-xs mx-auto mt-2">Select Global Defaults or a specific folder from the sidebar.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptManager;