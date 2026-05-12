import { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const formatTime = (totalSeconds) => {
  if (!totalSeconds || isNaN(totalSeconds)) return "0:00.0";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
};

// 🏎️ THE UPGRADED CAR COMPONENT
// It now takes a 'color' prop so we can tell them apart!
function AnimatedCar({ points, rawTelemetry, indexRef, isPlaying, playbackRate, sliderRef, uiRefs, color, isPrimary }) {
  const carRef = useRef();

  useFrame(() => {
    if (!points || points.length < 2) return;

    if (indexRef.current >= points.length || Number.isNaN(indexRef.current)) indexRef.current = 0;

    if (isPlaying && isPrimary) {
      const currentSpeed = 0.5 * playbackRate; // Slowed down for readability
      indexRef.current += currentSpeed;
      if (indexRef.current >= points.length) indexRef.current = 0; 
    }

    const safeIndex = Math.floor(indexRef.current);
    // If the secondary car DNF'd or has a shorter array, freeze it at its last known point
    const carPoint = points[safeIndex] || points[points.length - 1]; 
    const currentData = rawTelemetry[safeIndex] || rawTelemetry[rawTelemetry.length - 1];
    
    if (carRef.current && carPoint) {
      carRef.current.position.copy(carPoint);
      
      // We only update the DOM HUD for the Primary Car to avoid overriding data
      if (isPrimary && currentData) {
        if (uiRefs.speed.current) uiRefs.speed.current.innerText = Math.round(currentData.Speed || 0);
        if (uiRefs.gear.current) uiRefs.gear.current.innerText = currentData.nGear || 'N';
        
        // Overflow Fix: Math.round() prevents long decimals from breaking the box
        if (uiRefs.rpm.current) uiRefs.rpm.current.innerText = Math.round(currentData.RPM || 0);
        
        if (uiRefs.throttle.current) uiRefs.throttle.current.style.width = `${currentData.Throttle || 0}%`;
        const brakeVal = currentData.Brake === true ? 100 : (Number(currentData.Brake) || 0);
        if (uiRefs.brake.current) uiRefs.brake.current.style.width = `${brakeVal}%`;
        if (uiRefs.currentTime.current) uiRefs.currentTime.current.innerText = formatTime(currentData.Time);
      }
    }

    if (isPrimary && sliderRef.current && isPlaying) {
      sliderRef.current.value = safeIndex;
    }
  });

  return (
    <Sphere ref={carRef} args={[1.5, 16, 16]}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
    </Sphere>
  );
}

// 🏎️ Notice we added a 'driver2' prop here!
export default function TrackVisualizer({ year, location, session, driver1, driver2 }) {
  const [telemetry1, setTelemetry1] = useState([]);
  const [telemetry2, setTelemetry2] = useState([]); // State for the ghost car
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1); 
  const [errorMsg, setErrorMsg] = useState(null);
  
  const indexRef = useRef(0);
  const sliderRef = useRef();
  const uiRefs = {
    speed: useRef(null), gear: useRef(null), rpm: useRef(null),
    throttle: useRef(null), brake: useRef(null), currentTime: useRef(null) 
  };

  useEffect(() => {
    setTelemetry1([]); setTelemetry2([]); setErrorMsg(null);
    indexRef.current = 0; setPlaybackRate(1); 
    if (sliderRef.current) sliderRef.current.value = 0;

    // Use the new comparison endpoint!
    fetch(`http://localhost:8000/api/telemetry/compare/${year}/${location}/${session}/${driver1}/${driver2}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `Server Error: ${res.status}`);
        return data;
      })
      .then((data) => {
         if (data && data.error) setErrorMsg(data.error);
         else {
             setTelemetry1(data.driver1);
             setTelemetry2(data.driver2);
         }
      })
      .catch((err) => setErrorMsg(err.message));
  }, [year, location, session, driver1, driver2]);

  // Map coordinates for Driver 1
  const points1 = useMemo(() => {
    if (!Array.isArray(telemetry1) || telemetry1.length === 0) return [];
    return telemetry1.filter(t => t && Number.isFinite(t.X) && Number.isFinite(t.Y)).map(t => new THREE.Vector3(t.X / 100, 0, t.Y / 100));
  }, [telemetry1]);

  // Map coordinates for Driver 2
  const points2 = useMemo(() => {
    if (!Array.isArray(telemetry2) || telemetry2.length === 0) return [];
    return telemetry2.filter(t => t && Number.isFinite(t.X) && Number.isFinite(t.Y)).map(t => new THREE.Vector3(t.X / 100, 0, t.Y / 100));
  }, [telemetry2]);

  const handleScrub = (e) => {
    indexRef.current = Number(e.target.value);
    setIsPlaying(false); 
    if (uiRefs.currentTime.current && telemetry1[indexRef.current]) {
       uiRefs.currentTime.current.innerText = formatTime(telemetry1[indexRef.current].Time);
    }
  };

  const skipForward = () => {
    indexRef.current = Math.min(points1.length - 1, indexRef.current + 200); 
    if (sliderRef.current) sliderRef.current.value = indexRef.current;
  };
  const skipBackward = () => {
    indexRef.current = Math.max(0, indexRef.current - 200);
    if (sliderRef.current) sliderRef.current.value = indexRef.current;
  };
  const togglePlaybackSpeed = () => setPlaybackRate(prev => prev === 0.5 ? 1 : prev === 1 ? 2 : prev === 2 ? 4 : 0.5);

  const totalLapTime = telemetry1.length > 0 ? formatTime(telemetry1[telemetry1.length - 1].Time) : "0:00";

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full h-[450px] bg-slate-950 rounded-xl overflow-hidden relative border border-slate-700">
        
        {errorMsg && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90">
            <p className="text-red-500 font-mono text-center px-4">⚠️ {errorMsg}</p>
          </div>
        )}

        {(!errorMsg && points1.length < 2) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 pointer-events-none">
            <p className="text-gray-400 font-mono animate-pulse">Downloading Dual Telemetry Matrix...</p>
          </div>
        )}

        {/* 🏎️ Overflow Fix: Widened HUD to w-64 so big numbers fit */}
        <div className="absolute top-4 right-4 z-10 bg-slate-900/90 border border-slate-700 p-4 rounded-xl w-64 shadow-2xl pointer-events-none">
          <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
             <h3 className="text-xs font-bold text-gray-500 uppercase">Live Telemetry</h3>
             {/* Show who we are tracking */}
             <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">Car #{driver1}</span>
          </div>
          
          <div className="flex justify-between items-end mb-4">
            <div>
              <span ref={uiRefs.speed} className="text-3xl font-black text-white font-mono">0</span>
              <span className="text-gray-400 text-sm ml-1">km/h</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 text-[10px] block uppercase tracking-wider">Gear</span>
              <span ref={uiRefs.gear} className="text-xl font-bold text-cyan-400 font-mono">-</span>
            </div>
          </div>
          
          <div className="mb-4 bg-slate-950 p-2 rounded border border-slate-800 flex justify-between items-center">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Engine</span>
            <div>
               <span ref={uiRefs.rpm} className="text-sm font-mono text-white">0</span>
               <span className="text-xs text-gray-500 ml-1">RPM</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Throttle</span></div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div ref={uiRefs.throttle} className="h-full bg-green-500 w-0 transition-all duration-75"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Brake</span></div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div ref={uiRefs.brake} className="h-full bg-red-600 w-0 transition-all duration-75"></div>
              </div>
            </div>
          </div>
        </div>

        <Canvas camera={{ position: [0, 80, 0], fov: 50 }}>
          <ambientLight intensity={1} />
          {points1.length >= 2 && (
            <>
              {/* Draw the track outline */}
              <Line points={points1} color="#334155" lineWidth={2} />
              
              {/* PRIMARY CAR (Red) */}
              <AnimatedCar 
                points={points1} rawTelemetry={telemetry1} indexRef={indexRef} 
                isPlaying={isPlaying} playbackRate={playbackRate} sliderRef={sliderRef} 
                uiRefs={uiRefs} color="#ef4444" isPrimary={true} 
              />
              
              {/* GHOST CAR (Cyan) */}
              {points2.length >= 2 && (
                <AnimatedCar 
                  points={points2} rawTelemetry={telemetry2} indexRef={indexRef} 
                  isPlaying={isPlaying} playbackRate={playbackRate} sliderRef={sliderRef} 
                  uiRefs={uiRefs} color="#06b6d4" isPrimary={false} 
                />
              )}
            </>
          )}
          <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
        </Canvas>
      </div>

      {/* YouTube Scrubber Controls remain the exact same here... */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <span ref={uiRefs.currentTime} className="text-sm font-mono text-cyan-400 w-12 text-right">0:00.0</span>
          <input 
            type="range" ref={sliderRef} min="0" max={points1.length > 0 ? points1.length - 1 : 100} 
            defaultValue="0" disabled={points1.length < 2 || errorMsg} onChange={handleScrub}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600 disabled:opacity-50"
          />
          <span className="text-sm font-mono text-gray-500 w-12">{totalLapTime}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button onClick={skipBackward} disabled={points1.length < 2 || errorMsg} className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50" title="Rewind">⏪</button>
            <button onClick={() => setIsPlaying(!isPlaying)} disabled={points1.length < 2 || errorMsg} className="w-10 h-10 flex items-center justify-center bg-white text-black hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50">{isPlaying ? '⏸' : '▶️'}</button>
            <button onClick={skipForward} disabled={points1.length < 2 || errorMsg} className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50" title="Fast Forward">⏩</button>
          </div>
          <button onClick={togglePlaybackSpeed} disabled={points1.length < 2 || errorMsg} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-sm rounded-lg border border-slate-700 transition-colors disabled:opacity-50">{playbackRate}x Speed</button>
        </div>
      </div>
    </div>
  );
}