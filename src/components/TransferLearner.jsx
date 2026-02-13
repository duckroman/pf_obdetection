import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { motion } from 'framer-motion';
import { Plus, Trash2, Zap, Brain, CheckCircle2, Eye, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

export default function TransferLearner() {
    const [net, setNet] = useState(null);
    const [classifier, setClassifier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([
        { id: 0, name: 'Class A (e.g. Thumbs Up)', count: 0, color: 'bg-emerald-500' },
        { id: 1, name: 'Class B (e.g. Open Palm)', count: 0, color: 'bg-indigo-500' },
        { id: 2, name: 'Background (Nothing)', count: 0, color: 'bg-gray-500' }
    ]);
    const [result, setResult] = useState(null);
    const [isTraining, setIsTraining] = useState(false);
    const [viewMode, setViewMode] = useState('train'); // 'train' | 'predict'

    const webcamRef = useRef(null);
    const requestRef = useRef();

    // Initialize
    useEffect(() => {
        async function init() {
            console.log('Loading Mobilenet...');
            const loadedNet = await mobilenet.load();
            console.log('Loading KNN...');
            const loadedClassifier = knnClassifier.create();
            setNet(loadedNet);
            setClassifier(loadedClassifier);
            setLoading(false);
        }
        tf.ready().then(init);
    }, []);

    // Add Example
    const addExample = async (classId) => {
        if (net && classifier && webcamRef.current?.video?.readyState === 4) {
            const img = tf.browser.fromPixels(webcamRef.current.video);
            const activation = net.infer(img, true);
            classifier.addExample(activation, classId);

            // Update counts
            setClasses(prev => prev.map(c =>
                c.id === classId ? { ...c, count: c.count + 1 } : c
            ));

            // Dispose tensors
            img.dispose();
            // activation is typically kept by KNN but we don't need to manually dispose if KNN manages it? 
            // Actually KNN expects us to pass the activation. We should verify docs. 
            // Usually strict dispose is needed for img. Activation is stored by KNN.

            setIsTraining(true);
            setTimeout(() => setIsTraining(false), 200);
        }
    };

    // Prediction Loop
    const predict = useCallback(async () => {
        if (classifier && net && webcamRef.current?.video?.readyState === 4 && classifier.getNumClasses() > 0) {
            const img = tf.browser.fromPixels(webcamRef.current.video);
            const activation = net.infer(img, 'conv_preds');

            try {
                const result = await classifier.predictClass(activation);
                setResult(result);
            } catch (e) {
                // Can fail if no examples
            }

            img.dispose();
            activation.dispose();
        }
        requestRef.current = requestAnimationFrame(predict);
    }, [classifier, net]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(predict);
        return () => cancelAnimationFrame(requestRef.current);
    }, [predict]);

    // Clear All
    const clearAll = () => {
        if (classifier) {
            classifier.clearAllClasses();
            setClasses(prev => prev.map(c => ({ ...c, count: 0 })));
            setResult(null);
        }
    };

    // Add New Class
    const addClass = () => {
        const newId = classes.length;
        const colors = ['bg-pink-500', 'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-rose-500'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setClasses([...classes, {
            id: newId,
            name: `Class ${String.fromCharCode(65 + newId)}`,
            count: 0,
            color: randomColor
        }]);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Visual Input Column */}
            <div className={cn("space-y-6 transition-all duration-500", viewMode === 'predict' ? "" : "")}>
                <div className={cn("relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all duration-500 aspect-video")}>
                    {loading && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-md">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Brain className="w-6 h-6 text-blue-400 animate-pulse" />
                                </div>
                            </div>
                            <p className="mt-4 text-blue-400 font-mono text-sm tracking-widest animate-pulse">INITIALIZING NEURAL NET...</p>
                        </div>
                    )}

                    <Webcam
                        ref={webcamRef}
                        className="w-full h-full object-cover"
                        videoConstraints={{ facingMode: 'user' }}
                        muted
                    />

                    {/* Live Prediction Overlay - ONLY IN PREDICT MODE */}

                </div>



                {/* Mode Toggle Bar - Only visible in Predict Mode or as a small control in Train mode? 
                    Actually, let's put the big toggle below the video if in predict mode, or in the sidebar if in train mode.
                    For clean UX, let's keep it context-aware.
                */}

                {viewMode === 'predict' && (
                    <div className="flex justify-center">
                        <button
                            onClick={() => setViewMode('train')}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-full font-medium transition-colors border border-white/10 flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" /> Back to Training
                        </button>
                    </div>
                )}

                {/* Instructions - Only in Train Mode */}
                {viewMode === 'train' && (
                    <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200">
                        <div className="flex items-center gap-2 font-bold mb-2">
                            <Brain className="w-4 h-4" />
                            How it works
                        </div>
                        <p>This demo uses <strong>Transfer Learning</strong>. The neural network (MobileNet) extracts features, and we train a custom classifier (KNN) in real-time in your browser.</p>
                        <ul className="list-disc list-inside mt-2 text-blue-300/80 pl-2 space-y-1">
                            <li>Select an object or gesture for Class A.</li>
                            <li>Click "Train" repeatedly to gather ~20 examples.</li>
                            <li>Repeat for Class B.</li>
                            <li>Switch to <strong>Prediction Mode</strong> to test.</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Prediction Results Column - Only in Predict Mode */}
            {
                viewMode === 'predict' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Eye className="w-5 h-5 text-blue-400" />
                                Live Predictions
                            </h2>
                            <button
                                onClick={() => setViewMode('train')}
                                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/10 flex items-center gap-2"
                            >
                                <Settings className="w-3 h-3" /> Back to Training
                            </button>
                        </div>

                        <div className="space-y-2">
                            {result && result.confidences ? (
                                Object.entries(result.confidences)
                                    .map(([label, confidence]) => ({ label, confidence }))
                                    .filter(item => item.confidence > 0.05) // Show anything > 5%
                                    .sort((a, b) => b.confidence - a.confidence)
                                    .map((item) => (
                                        <div key={item.label} className="relative group">
                                            <div className="glass-panel p-3 rounded-xl flex items-center justify-between relative overflow-hidden">
                                                {/* Progress Background */}
                                                <div
                                                    className={cn("absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-300", classes[item.label]?.color || "bg-gray-500")}
                                                    style={{ width: `${item.confidence * 100}%` }}
                                                />

                                                <div className="relative z-10 flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-bold text-white text-sm">
                                                            {classes[item.label]?.name || `Class ${item.label}`}
                                                        </span>
                                                        <span className="font-mono font-bold text-white text-sm">
                                                            {(item.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                            ) : (
                                <div className="text-gray-500 text-sm text-center py-8">
                                    Waiting for prediction data...
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Training Controls Column - Hidden in Predict Mode */}
            {
                viewMode === 'train' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-400" />
                                Machine Teaching
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setViewMode('predict')}
                                    className="px-4 py-1.5 text-xs font-bold bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Eye className="w-3 h-3" /> Test / Predict
                                </button>
                                <button
                                    onClick={clearAll}
                                    className="px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-3 h-3" /> Reset
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            {classes.map((cls) => (
                                <div key={cls.id} className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

                                    <div className="glass-panel p-4 rounded-xl flex items-center justify-between relative overflow-hidden">

                                        {/* Progress Background */}
                                        <div
                                            className={cn("absolute left-0 top-0 bottom-0 opacity-10 transition-all duration-300", cls.color)}
                                            style={{ width: `${Math.min(cls.count * 2, 100)}%` }} // Visual progress up to 50 samples
                                        />

                                        <div className="relative z-10 flex-1 mr-4">
                                            <input
                                                value={cls.name}
                                                onChange={(e) => setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, name: e.target.value } : c))}
                                                className="bg-transparent text-lg font-bold text-white outline-none border-b border-transparent focus:border-white/30 placeholder-gray-500 w-full"
                                            />
                                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                                <span className="font-mono text-white/80 bg-white/10 px-1.5 rounded">{cls.count} samples</span>
                                                {cls.count > 0 && cls.count < 10 && <span className="text-yellow-500">More needed...</span>}
                                                {cls.count >= 10 && <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => addExample(cls.id)}
                                                className={cn(
                                                    "relative z-10 px-6 py-3 rounded-lg font-bold text-white shadow-lg flex items-center gap-2 transition-all active:scale-95",
                                                    cls.color
                                                )}
                                            >
                                                <Plus className="w-5 h-5" />
                                                Train
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addClass}
                                className="w-full py-4 rounded-xl border-2 border-dashed border-white/10 text-gray-400 font-bold hover:border-white/30 hover:text-white hover:bg-white/5 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add New Class
                            </button>

                        </div>
                    </div>
                )
            }
        </div >
    );
}
