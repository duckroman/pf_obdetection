import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Play, Pause, Settings, Activity, Aperture, Image as ImageIcon, Video } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { cn } from '../lib/utils';

export default function ObjectDetector() {
    // State
    const [model, setModel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState('live'); // 'live' | 'upload'
    const [mediaFile, setMediaFile] = useState(null); // { type: 'image' | 'video', url: string }
    const [predictions, setPredictions] = useState([]);
    const [fps, setFps] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Settings
    const [settings, setSettings] = useState({
        minConfidence: 0.5,
        maxObjects: 10,
        iouThreshold: 0.3
    });

    // Refs
    const webcamRef = useRef(null);
    const mediaRef = useRef(null); // For uploaded video/image
    const requestRef = useRef();
    const fpsRef = useRef({ lastFrameTime: 0, lastFpsTime: 0, frameCount: 0 });

    // Load Model
    useEffect(() => {
        async function loadModel() {
            // Load COCO-SSD
            const loadedModel = await cocoSsd.load();
            setModel(loadedModel);
            setLoading(false);
        }
        tf.ready().then(loadModel);
    }, []);

    // Detection Loop
    const detect = useCallback(async () => {
        if (isPaused || !model) return;

        // FPS Cap: Max 24 FPS (~41ms per frame)
        const now = performance.now();
        const timeSinceLastFrame = now - fpsRef.current.lastFrameTime;
        if (timeSinceLastFrame < 41) { // 1000ms / 24fps ≈ 41.6ms
            requestRef.current = requestAnimationFrame(detect);
            return;
        }
        fpsRef.current.lastFrameTime = now;

        let videoEl = null;

        if (mode === 'live' && webcamRef.current?.video?.readyState === 4) {
            videoEl = webcamRef.current.video;
        } else if (mode === 'upload' && mediaRef.current && mediaFile?.type === 'video' && !mediaRef.current.paused) {
            if (mediaRef.current.readyState >= 2) {
                videoEl = mediaRef.current;
            }
        } else if (mode === 'upload' && mediaRef.current && mediaFile?.type === 'image') {
            videoEl = mediaRef.current;
        }

        if (videoEl) {
            // Calculate actual FPS based on successful detections
            fpsRef.current.frameCount++;
            if (now - fpsRef.current.lastFpsTime >= 1000) {
                setFps(fpsRef.current.frameCount);
                fpsRef.current.frameCount = 0;
                fpsRef.current.lastFpsTime = now;
            }

            try {
                const results = await model.detect(videoEl, settings.maxObjects, settings.minConfidence);
                setPredictions(results);
            } catch (err) {
                console.error("Detection error:", err);
            }
        }

        if (mode === 'live' || (mode === 'upload' && mediaFile?.type === 'video')) {
            requestRef.current = requestAnimationFrame(detect);
        }
    }, [model, mode, mediaFile, isPaused, settings]);

    // Trigger detection when ready
    useEffect(() => {
        if (mode === 'upload' && mediaFile?.type === 'image' && model) {
            // Run once for image
            setTimeout(detect, 500); // Small delay for render
        } else if (!isPaused) {
            requestRef.current = requestAnimationFrame(detect);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [detect, mode, mediaFile, isPaused, model]);

    // File Upload Handler
    const onDrop = useCallback(acceptedFiles => {
        const file = acceptedFiles[0];
        if (file) {
            const isVideo = file.type.startsWith('video/');
            const url = URL.createObjectURL(file);
            setMediaFile({ type: isVideo ? 'video' : 'image', url });
            setMode('upload');
            setPredictions([]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [], 'video/*': [] } });

    // Clear Upload
    const clearMedia = () => {
        if (mediaFile?.url) URL.revokeObjectURL(mediaFile.url);
        setMediaFile(null);
        setMode('live');
        setPredictions([]);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Main Viewport (2 Columns) */}
            <div className="lg:col-span-2 space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl aspect-video group">

                    {loading && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-blue-400 font-mono text-sm animate-pulse">LOADING NEURAL MODEL...</p>
                            </div>
                        </div>
                    )}

                    {/* Mode: Live Webcam */}
                    {mode === 'live' && (
                        <Webcam
                            ref={webcamRef}
                            muted={true}
                            className="absolute inset-0 w-full h-full object-cover"
                            videoConstraints={{ facingMode: "environment" }}
                        />
                    )}

                    {/* Mode: Upload */}
                    {mode === 'upload' && mediaFile && (
                        mediaFile.type === 'video' ? (
                            <video
                                ref={mediaRef}
                                src={mediaFile.url}
                                className="absolute inset-0 w-full h-full object-contain bg-black"
                                loop
                                autoPlay
                                muted
                                onPlay={() => setIsPaused(false)}
                            />
                        ) : (
                            <img
                                ref={mediaRef}
                                src={mediaFile.url}
                                className="absolute inset-0 w-full h-full object-contain bg-black"
                                alt="Uploaded"
                            />
                        )
                    )}

                    {/* Upload Overlay (when empty) */}
                    {mode === 'upload' && !mediaFile && (
                        <div
                            {...getRootProps()}
                            className={cn(
                                "absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-white/20 m-4 rounded-xl transition-all cursor-pointer hover:bg-white/5",
                                isDragActive && "border-blue-500 bg-blue-500/10"
                            )}
                        >
                            <input {...getInputProps()} />
                            <Upload className="w-12 h-12 text-gray-400 mb-4" />
                            <p className="text-gray-300 font-medium">Drag & drop video or image</p>
                            <p className="text-gray-500 text-sm mt-2">Supports MP4, JPG, PNG</p>
                        </div>
                    )}

                    {/* Bounding Boxes Overlay */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {predictions.map((pred, i) => {
                            // Robust Scaling for object-cover
                            const element = mode === 'live' ? webcamRef.current?.video : mediaRef.current;
                            if (!element) return null;

                            const videoWidth = element.videoWidth || element.naturalWidth;
                            const videoHeight = element.videoHeight || element.naturalHeight;
                            const container = element.parentElement;

                            if (!videoWidth || !videoHeight || !container) return null;

                            const { clientWidth: containerWidth, clientHeight: containerHeight } = container;

                            // Calculate scaling for object-cover
                            const scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);

                            // Dimensions of the video as displayed
                            const displayedWidth = videoWidth * scale;
                            const displayedHeight = videoHeight * scale;

                            // Offsets (centering)
                            const offsetX = (containerWidth - displayedWidth) / 2;
                            const offsetY = (containerHeight - displayedHeight) / 2;

                            const rawStyle = {
                                left: pred.bbox[0] * scale + offsetX,
                                top: pred.bbox[1] * scale + offsetY,
                                width: pred.bbox[2] * scale,
                                height: pred.bbox[3] * scale,
                            };

                            // Clamping Logic with safety margin
                            const MARGIN = 10;
                            const left = Math.max(MARGIN, Math.min(rawStyle.left, containerWidth - rawStyle.width - MARGIN));
                            const top = Math.max(MARGIN, Math.min(rawStyle.top, containerHeight - rawStyle.height - MARGIN));

                            // Override style with clamped values
                            const clampedStyle = {
                                ...rawStyle,
                                left,
                                top,
                                maxWidth: containerWidth - left - MARGIN,
                                maxHeight: containerHeight - top - MARGIN
                            };

                            // Smart Label Positioning
                            const isNearTop = top < 40;

                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute border-2 border-blue-500 bg-blue-500/10 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.5)] flex flex-col p-1"
                                    style={clampedStyle}
                                >
                                    <div
                                        className={cn(
                                            "bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 absolute whitespace-nowrap z-10",
                                            isNearTop ? "top-0.5 left-0.5" : "bottom-full left-0 mb-1"
                                        )}
                                    >
                                        <span>{pred.class.toUpperCase()}</span>
                                        <span className="text-blue-200">|</span>
                                        <span>{Math.round(pred.score * 100)}%</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* HUD Overlay */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-3 text-right">
                            <div className="text-xs text-gray-400 uppercase tracking-widest">FPS</div>
                            <div className="text-2xl font-mono text-green-400 font-bold">{fps}</div>
                        </div>
                        <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-3 text-right">
                            <div className="text-xs text-gray-400 uppercase tracking-widest">Object Count</div>
                            <div className="text-xl font-mono text-blue-400 font-bold">{predictions.length}</div>
                        </div>
                    </div>

                    {/* Controls Overlay (Bottom) */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl z-20">
                        <button
                            onClick={() => {
                                setMode(mode === 'live' ? 'upload' : 'live');
                                setPredictions([]);
                            }}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            title={mode === 'live' ? "Switch to Upload" : "Switch to Live"}
                        >
                            {mode === 'live' ? <ImageIcon className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
                        </button>

                        {mode === 'upload' && mediaFile && (
                            <button onClick={clearMedia} className="p-2 hover:bg-red-500/20 rounded-full text-red-400">
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        <div className="w-px h-8 bg-white/20 mx-2" />

                        <button
                            onClick={() => setIsPaused(!isPaused)}
                            className="p-3 bg-white text-black rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                        >
                            {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar Controls & Visualizations */}
            <div className="space-y-6">

                {/* Confidence Graph */}
                <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <h3 className="font-bold text-white">Live Confidence Stream</h3>
                    </div>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[
                                { name: '', score: 0, label: '' },
                                ...predictions.map((p, i) => ({
                                    name: `${p.class} #${i + 1}`,
                                    score: p.score * 100,
                                    label: `${Math.round(p.score * 100)}%`
                                })),
                                { name: '', score: 0, label: '' }
                            ]}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    tickLine={false}
                                    interval={0}
                                />
                                <YAxis
                                    domain={[0, 110]}
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    tickLine={false}
                                    label={{ value: 'Confidence %', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#8884d8' }}
                                    formatter={(value) => [`${value.toFixed(1)}%`, 'Confidence']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#8884d8"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorScore)"
                                    animationDuration={0}
                                    isAnimationActive={false}
                                >
                                    <LabelList
                                        dataKey="label"
                                        position="top"
                                        offset={10}
                                        style={{ fill: '#e5e7eb', fontSize: 11, fontWeight: 'bold' }}
                                    />
                                </Area>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Global Stats */}
                <div className="glass-panel p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-6">
                        <Settings className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-white">Detection Metrics</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Confidence Threshold</span>
                                <span className="text-white font-mono">{Math.round(settings.minConfidence * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.1" max="0.9" step="0.05"
                                value={settings.minConfidence}
                                onChange={(e) => setSettings({ ...settings, minConfidence: parseFloat(e.target.value) })}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">IOU Threshold</span>
                                <span className="text-white font-mono">{settings.iouThreshold}</span>
                            </div>
                            <input
                                type="range"
                                min="0.1" max="0.9" step="0.1"
                                value={settings.iouThreshold}
                                onChange={(e) => setSettings({ ...settings, iouThreshold: parseFloat(e.target.value) })}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Current Detections List */}
                <div className="glass-panel p-5 rounded-2xl flex-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Aperture className="w-5 h-5 text-orange-400" />
                        Detected Objects
                    </h3>
                    <div className="space-y-2">
                        <AnimatePresence>
                            {predictions.length === 0 ? (
                                <p className="text-gray-500 text-sm py-4 text-center italic">No objects detected</p>
                            ) : (
                                predictions.map((pred, i) => (
                                    <motion.div
                                        key={`${pred.class}-${i}`}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                            <span className="capitalize text-sm font-medium">{pred.class}</span>
                                        </div>
                                        <span className="font-mono text-xs text-blue-300">{(pred.score * 100).toFixed(1)}%</span>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </div >
    );
}
