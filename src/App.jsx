import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Brain, Activity, Upload, Camera } from 'lucide-react';
import ObjectDetector from './components/ObjectDetector';
import TransferLearner from './components/TransferLearner';
import { cn } from './lib/utils';

function App() {
  const [activeTab, setActiveTab] = useState('detect'); // 'detect' | 'train'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 md:p-8 font-sans overflow-x-hidden selection:bg-purple-500/30">

      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-3 bg-blue-500/20 rounded-xl backdrop-blur-md border border-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Eye className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
              Neural<span className="text-white">Vision</span>
            </h1>
            <p className="text-gray-400 text-sm">Advanced Real-time Object Detection System</p>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex p-1 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
          <TabButton
            active={activeTab === 'detect'}
            onClick={() => setActiveTab('detect')}
            icon={<Camera className="w-4 h-4" />}
            label="Live Detection"
          />
          <TabButton
            active={activeTab === 'train'}
            onClick={() => setActiveTab('train')}
            icon={<Brain className="w-4 h-4" />}
            label="Custom Training"
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto min-h-[600px] relative">
        <AnimatePresence mode="wait">
          {activeTab === 'detect' ? (
            <motion.div
              key="detect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ObjectDetector />
            </motion.div>
          ) : (
            <motion.div
              key="train"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TransferLearner />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 text-center text-gray-500 text-sm border-t border-white/5 pt-8">
        <p>© JRC • 2026</p>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative",
        active ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
      )}
    >
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 rounded-lg shadow-inner"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon} {label}
      </span>
    </button>
  );
}

export default App;
