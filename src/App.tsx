import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Play, Pause, Maximize, Layers, Zap, Hand, Info, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import ParticleSimulation from './components/ParticleSimulation';
import HandTracker from './components/HandTracker';
import { SimulationSettings, HandGesture } from './types';
import { audioController } from './lib/audio';

const INITIAL_SETTINGS: SimulationSettings = {
  speed: 1.0,
  dimension: 5.0,
  particleCount: 10000,
  colorPalette: 'default',
  shape: 'sphere',
  particleShape: 'sphere',
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<SimulationSettings>(INITIAL_SETTINGS);
  const [gestureMode, setGestureMode] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<HandGesture>({ type: 'none', confidence: 0 });
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [viewAngle, setViewAngle] = useState(0);
  const [topView, setTopView] = useState(false);

  const handleGesture = useCallback((gesture: HandGesture) => {
    if (gesture.type !== currentGesture.type && gesture.type !== 'none') {
      audioController.playGestureSound(gesture.type);
    }
    setCurrentGesture(gesture);
    if (!gestureMode) return;

    // Adjust settings based on gesture and position
    setSettings((prev) => {
      let next = { ...prev };
      const factor = gesture.x < 0.4 ? -1 : gesture.x > 0.6 ? 1 : 0;
      
      if (factor === 0 && gesture.type !== 'none') return prev; // Dead zone in the middle

      if (gesture.type === 'one-finger') {
        next.speed = Math.max(0.1, Math.min(prev.speed + 0.05 * factor, 5.0));
      } else if (gesture.type === 'open-hand') {
        next.dimension = Math.max(1.0, Math.min(prev.dimension + 0.1 * factor, 10.0));
      } else if (gesture.type === 'closed-hand') {
        next.particleCount = Math.max(1000, Math.min(prev.particleCount + 200 * factor, 100000));
      }
      return next;
    });
  }, [gestureMode]);

  const shapes: SimulationSettings['shape'][] = ['sphere', 'helix', 'tornado', 'galaxy', 'cube', 'torus', 'wave', 'implosion'];

  const shapeInfo = {
    sphere: { title: 'Geodesic Sphere', desc: 'Perfect distribution of points. Radius is adjustable.' },
    helix: { title: 'DNA Structure', desc: 'Double Helix formation.' },
    tornado: { title: 'Tornado — HDR', desc: 'Electric violet funnel wall with white-blue lightning core.' },
    galaxy: { title: 'Butterfly Formation', desc: 'Tracing 20,000 sequential points of a chaotic signal.' },
    cube: { title: 'Quantum Cube', desc: 'A rigid lattice structure of particles.' },
    torus: { title: 'Magnetic Torus', desc: 'A donut-shaped energy field.' },
    wave: { title: 'Sine Wave', desc: 'An undulating ocean of particles.' },
    implosion: { title: 'Singularity', desc: 'Particles collapsing into a central point.' },
  };

  const nextShape = () => {
    audioController.playChangeSound();
    const idx = shapes.indexOf(settings.shape);
    setSettings({ ...settings, shape: shapes[(idx + 1) % shapes.length] });
  };

  const prevShape = () => {
    audioController.playChangeSound();
    const idx = shapes.indexOf(settings.shape);
    setSettings({ ...settings, shape: shapes[(idx - 1 + shapes.length) % shapes.length] });
  };

  const handleSpin = () => {
    audioController.playSpinSound();
    setSpinTrigger(s => s + 1);
  };

  return (
    <div className="relative w-full h-screen bg-black text-white font-sans overflow-hidden">
      {/* Particle Simulation Layer */}
      <div className="absolute inset-0 z-0">
        <ParticleSimulation settings={settings} spinTrigger={spinTrigger} viewAngle={viewAngle} topView={topView} />
      </div>

      {/* UI Overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
        {/* Top Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white/90 leading-none">
              AI Particle <span className="text-emerald-400">Simulator</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${gestureMode ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-white/20'}`} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-50 font-bold">
                {gestureMode ? 'Neural Control Active' : 'Manual Mode'}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowControls(!showControls)}
              className={`p-2.5 rounded-full border-2 transition-colors ${
                showControls ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
              }`}
              title="Toggle Settings"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={handleSpin}
              onMouseEnter={() => audioController.playHoverSound()}
              className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-full border-2 border-white/10 transition-colors"
              title="Rotate 360 Degrees"
            >
              <RefreshCw size={18} />
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Spin 360°</span>
            </button>
            <button
              onClick={() => {
                audioController.playChangeSound();
                setTopView(!topView);
              }}
              onMouseEnter={() => audioController.playHoverSound()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full border-2 transition-all duration-300 ${
                topView 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                  : 'bg-white/5 border-white/10 hover:border-white/30 text-white'
              }`}
              title="Toggle Top View"
            >
              <Layers size={18} />
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Top View</span>
            </button>
            <button
              onClick={() => {
                audioController.playChangeSound();
                setGestureMode(!gestureMode);
              }}
              onMouseEnter={() => audioController.playHoverSound()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full border-2 transition-all duration-300 ${
                gestureMode 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                  : 'bg-white/5 border-white/10 hover:border-white/30'
              }`}
            >
              <Hand size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Gesture Control</span>
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border-2 border-white/10 transition-colors"
            >
              <Info size={20} />
            </button>
          </div>
        </div>

        {/* Center Content - Gesture Visualizer */}
        <AnimatePresence>
          {gestureMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6"
            >
              <div className="w-64 h-48 rounded-3xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl">
                <HandTracker onGesture={handleGesture} />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-[0.3em] font-mono opacity-40 mb-2 font-bold">Neural Feedback</span>
                <span className="text-2xl font-black uppercase tracking-tighter text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                  {currentGesture.type === 'none' ? 'Searching...' : currentGesture.type.replace('-', ' ')}
                </span>
                {currentGesture.type !== 'none' && (
                  <div className="flex items-center gap-6 mt-4">
                    <span className={`text-[10px] font-black tracking-widest ${currentGesture.x < 0.4 ? 'text-emerald-400' : 'opacity-20'}`}>DECREASE</span>
                    <div className="w-32 h-1.5 bg-white/10 rounded-full relative overflow-hidden">
                      <motion.div 
                        animate={{ left: `${currentGesture.x * 100}%` }}
                        className="absolute top-0 bottom-0 w-4 bg-emerald-500 shadow-[0_0_15px_#10b981]"
                      />
                    </div>
                    <span className={`text-[10px] font-black tracking-widest ${currentGesture.x > 0.6 ? 'text-emerald-400' : 'opacity-20'}`}>INCREASE</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom UI */}
        <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end pointer-events-none">
          {/* Left side: Settings Menu */}
          <div className="flex flex-col items-start gap-6 pointer-events-auto w-80">
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="bg-[#05100a]/90 backdrop-blur-2xl border border-emerald-500/20 p-8 rounded-[2rem] w-full flex flex-col gap-8 shadow-2xl"
                >
                  <div className="flex justify-between items-center border-b-2 border-white/5 pb-4">
                    <span className="text-[10px] uppercase tracking-[0.3em] font-mono text-emerald-400 font-black">Simulation Controls</span>
                    <Zap size={16} className="text-emerald-400 animate-pulse" />
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Speed Slider */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Time Flow</span>
                        <span className="text-xs font-mono font-bold">{settings.speed.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="5.0"
                        step="0.1"
                        value={settings.speed}
                        onChange={(e) => setSettings({ ...settings, speed: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Dimension Slider */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Scale</span>
                        <span className="text-xs font-mono font-bold">{settings.dimension.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="10.0"
                        step="0.1"
                        value={settings.dimension}
                        onChange={(e) => setSettings({ ...settings, dimension: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Particle Count Slider */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Density</span>
                        <span className="text-xs font-mono font-bold">{(settings.particleCount / 1000).toFixed(1)}K</span>
                      </div>
                      <input
                        type="range"
                        min="1000"
                        max="100000"
                        step="1000"
                        value={settings.particleCount}
                        onChange={(e) => setSettings({ ...settings, particleCount: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Particle Shape Selector */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Particle Shape</span>
                      </div>
                      <div className="flex gap-2">
                        {(['sphere', 'cube', 'star'] as const).map((pShape) => (
                          <button
                            key={pShape}
                            onClick={() => {
                              audioController.playChangeSound();
                              setSettings({ ...settings, particleShape: pShape });
                            }}
                            onMouseEnter={() => audioController.playHoverSound()}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md border transition-colors ${
                              settings.particleShape === pShape
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {pShape}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Palette Selector */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Color Palette</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['default', 'neon', 'fire', 'ocean', 'monochrome', 'cyberpunk'] as const).map((palette) => (
                          <button
                            key={palette}
                            onClick={() => {
                              audioController.playChangeSound();
                              setSettings({ ...settings, colorPalette: palette });
                            }}
                            onMouseEnter={() => audioController.playHoverSound()}
                            className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md border transition-colors ${
                              settings.colorPalette === palette
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {palette}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* View Angle Slider */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">View Angle</span>
                        <span className="text-xs font-mono font-bold">{viewAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={viewAngle}
                        onChange={(e) => setViewAngle(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Center: Formation Selector */}
          <div className="pointer-events-auto flex items-center justify-between bg-[#05100a] backdrop-blur-md border border-emerald-500/20 px-8 py-4 rounded-full min-w-[300px] shadow-2xl">
            <button 
              onClick={prevShape} 
              onMouseEnter={() => audioController.playHoverSound()}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
            >
              <ChevronLeft size={18} strokeWidth={3} />
            </button>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white/90">{settings.shape}</span>
            <button 
              onClick={nextShape} 
              onMouseEnter={() => audioController.playHoverSound()}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
            >
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>

          {/* Right side: Info Box */}
          <div className="flex flex-col items-end gap-6 pointer-events-auto w-80">
            {/* Info Box */}
            <motion.div 
              key={settings.shape}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#05100a] border-l-2 border-emerald-500 p-6 w-full shadow-2xl"
            >
              <h3 className="text-emerald-400 font-mono font-bold uppercase tracking-widest text-sm mb-3 text-left">{shapeInfo[settings.shape].title}</h3>
              <p className="text-xs text-white/60 font-mono leading-relaxed text-left">
                {shapeInfo[settings.shape].desc}
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#111] border border-white/10 p-8 rounded-3xl max-w-md w-full flex flex-col gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold italic uppercase tracking-tighter">Hand Gesture <span className="text-emerald-400">Guide</span></h2>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">1</div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Adjust Speed</h3>
                    <p className="text-xs opacity-60 mt-1">Hold up <span className="text-emerald-400 font-bold">one finger</span> (index) to accelerate the simulation flow.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">🖐️</div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Adjust Dimension</h3>
                    <p className="text-xs opacity-60 mt-1">Show an <span className="text-emerald-400 font-bold">open hand</span> to expand the spatial scale of the formation.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">✊</div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Increase Particles</h3>
                    <p className="text-xs opacity-60 mt-1">Make a <span className="text-emerald-400 font-bold">closed fist</span> to inject more particles into the system.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowInfo(false)}
                className="w-full py-3 bg-emerald-500 text-black font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-radial-[circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%]" />
    </div>
  );
};

export default App;
