import React, { useState, useEffect } from 'react';
import { Settings, PenTool, LayoutDashboard, WifiOff } from 'lucide-react';
import SettingsPage from './components/SettingsPage';
import PromptManager from './components/PromptManager';
import ProcessingView from './components/ProcessingView';
import { ServerStatus } from './types';
import { getStatus, startProcessing, stopProcessing, clearCompleted } from './utils/api';

type View = 'dashboard' | 'prompts' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<ServerStatus>({
      isProcessing: false,
      queue: [],
      completed: [],
      logs: [],
      uptime: 0,
      detectedSubjects: [] // Initialize
  });

  // Prompt Config Data for Manager
  const [activeSubjects, setActiveSubjects] = useState<string[]>([]);

  // Polling Loop
  useEffect(() => {
      const poll = async () => {
          try {
              const data = await getStatus();
              setStatus(data);
              setConnected(true);
              
              // Combine subjects from queue AND file system detection
              const subjects = new Set<string>();
              
              // 1. From active files
              [...data.queue, ...data.completed].forEach(f => {
                  if (f.subfolder && f.subfolder !== 'root') subjects.add(f.subfolder);
              });

              // 2. From file system scan (provided by server)
              if (data.detectedSubjects) {
                  data.detectedSubjects.forEach(s => subjects.add(s));
              }

              setActiveSubjects(Array.from(subjects));

          } catch (e) {
              setConnected(false);
          }
      };
      
      const interval = setInterval(poll, 1000);
      poll(); // initial
      return () => clearInterval(interval);
  }, []);

  if (!connected) {
      return (
          <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
              <WifiOff className="w-16 h-16 mb-6 opacity-50" />
              <h1 className="text-2xl font-bold text-white mb-2">Disconnected from Server</h1>
              <p className="max-w-md text-center mb-6">
                  Could not connect to the NoteForge backend. 
                  Please ensure the Node.js server is running (<code>npm run server</code>).
              </p>
              <div className="animate-pulse text-sm text-indigo-400">Retrying connection...</div>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <div className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 space-y-8 z-10 shrink-0">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="font-bold text-xl">N</span>
        </div>

        <nav className="flex-1 flex flex-col space-y-6 w-full">
          <NavItem 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')} 
            icon={<LayoutDashboard />} 
            label="Dash"
          />
          <NavItem 
            active={currentView === 'prompts'} 
            onClick={() => setCurrentView('prompts')} 
            icon={<PenTool />} 
            label="Prompts"
          />
          <NavItem 
            active={currentView === 'settings'} 
            onClick={() => setCurrentView('settings')} 
            icon={<Settings />} 
            label="Server"
          />
        </nav>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden relative">
        {currentView === 'dashboard' && (
            <ProcessingView 
                status={status}
                refreshStatus={() => {}} // handled by poll
                startBatch={startProcessing}
                stopBatch={stopProcessing}
                clearCompleted={clearCompleted}
            />
        )}
        {currentView === 'prompts' && (
            <PromptManager activeSubjects={activeSubjects} />
        )}
        {currentView === 'settings' && <SettingsPage />}
      </div>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`w-full flex flex-col items-center justify-center py-3 transition-all relative group
      ${active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
  >
    <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-500/10' : 'group-hover:bg-slate-800'}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
    </div>
    <span className="text-[10px] mt-1 font-medium">{label}</span>
    {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-l-full" />}
  </button>
);

export default App;