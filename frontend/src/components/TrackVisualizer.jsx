import { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

const formatTime = (totalSeconds) => {
  if (!totalSeconds || isNaN(totalSeconds)) return "0:00.0";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
};

// 🏎️ Official F1 Team Hex Colors
const TEAM_COLORS = {
  "VER": "#3671C6", "PER": "#3671C6", 
  "HAM": "#6CD3BF", "RUS": "#6CD3BF", 
  "LEC": "#F91536", "SAI": "#F91536", 
  "NOR": "#F58020", "PIA": "#F58020", 
  "ALO": "#358C75", "STR": "#358C75", 
  "GAS": "#2293D1", "OCO": "#2293D1", 
  "ALB": "#37BEDD", "SAR": "#37BEDD", 
  "TSU": "#5E8FAA", "DEV": "#5E8FAA", "RIC": "#5E8FAA", 
  "BOT": "#C92D4B", "ZHO": "#C92D4B", 
  "MAG": "#B6BABD", "HUL": "#B6BABD", 
};

const getDriverColor = (driverCode) => TEAM_COLORS[driverCode] || "#ffffff";

// 🏎️ Notice the new 'distancesRef' and 'leaderboardRef' props!
function AnimatedCar({ points, rawTelemetry, indexRef, isPlaying, playbackRate, sliderRef, uiRefs, color, isPrimary, masterTimeRef, driverCode, distancesRef, leaderboardRef }) {
  const carRef = useRef();
  const localGhostIndex = useRef(0); 

  useFrame(() => {
    if (!points || points.length < 2 || !rawTelemetry) return;

    let currentData = null;
    let safeIndex = 0;

    if (isPrimary) {
      if (indexRef.current >= points.length || Number.isNaN(indexRef.current)) indexRef.current = 0;
      
      if (isPlaying) {
        const currentSpeed = 0.5 * playbackRate; 
        indexRef.current += currentSpeed;
        if (indexRef.current >= points.length) indexRef.current = 0; 
      }

      safeIndex = Math.floor(indexRef.current);
      const currentPoint = points[safeIndex];
      currentData = rawTelemetry[safeIndex];
      
      if (carRef.current && currentPoint && currentData) {
        carRef.current.position.copy(currentPoint);
        masterTimeRef.current = currentData.Time;

        if (uiRefs.speed.current) uiRefs.speed.current.innerText = Math.round(currentData.Speed || 0);
        if (uiRefs.gear.current) uiRefs.gear.current.innerText = currentData.nGear || 'N';
        if (uiRefs.rpm.current) uiRefs.rpm.current.innerText = Math.round(currentData.RPM || 0);
        if (uiRefs.throttle.current) uiRefs.throttle.current.style.width = `${currentData.Throttle || 0}%`;
        const brakeVal = currentData.Brake === true ? 100 : (Number(currentData.Brake) || 0);
        if (uiRefs.brake.current) uiRefs.brake.current.style.width = `${brakeVal}%`;
        if (uiRefs.currentTime.current) uiRefs.currentTime.current.innerText = formatTime(currentData.Time);
      }

      if (sliderRef.current && isPlaying) sliderRef.current.value = safeIndex;

    } else {
      const targetTime = masterTimeRef.current;
      if (!targetTime) return;

      let searchIndex = localGhostIndex.current;
      while (searchIndex < rawTelemetry.length - 1 && rawTelemetry[searchIndex].Time < targetTime) searchIndex++;
      while (searchIndex > 0 && rawTelemetry[searchIndex].Time > targetTime) searchIndex--;

      localGhostIndex.current = searchIndex;
      const currentPoint = points[searchIndex];
      currentData = rawTelemetry[searchIndex];
      
      if (carRef.current && currentPoint) carRef.current.position.copy(currentPoint);
    }

    // 🏎️ THE LEADERBOARD LOGIC
    // 1. Every car logs its current distance into the shared memory
    if (currentData && distancesRef.current) {
        distancesRef.current[driverCode] = currentData.Distance || 0;
    }

    // 2. Only the Primary car sorts the list and draws the HTML to prevent 20 cars from drawing at once
    if (isPrimary && leaderboardRef.current && distancesRef.current) {
        // We only sort every 3 frames to save processing power and keep it silky smooth
        if (safeIndex % 3 === 0) {
            const standings = Object.entries(distancesRef.current)
                .sort((a, b) => b[1] - a[1]); // Sort from highest distance to lowest

            let htmlString = '';
            standings.forEach(([drv, dist], pos) => {
                const teamColor = TEAM_COLORS[drv] || '#ffffff';
                htmlString += `
                  <div class="flex items-center gap-3 mb-1 bg-slate-950/80 px-2 py-1 rounded border border-slate-700/50 shadow-sm">
                    <span class="text-[10px] font-bold text-gray-500 w-4 text-right">${pos + 1}</span>
                    <span class="w-1.5 h-3 rounded-sm" style="background-color: ${teamColor}"></span>
                    <span class="text-xs font-bold text-white tracking-widest">${drv}</span>
                  </div>
                `;
            });
            leaderboardRef.current.innerHTML = htmlString;
        }
    }
  });

  return (
    <group ref={carRef}>
      <Sphere args={[1.5, 16, 16]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isPrimary ? 2 : 1} />
      </Sphere>
      <Html distanceFactor={80} center position={[0, 2.5, 0]}>
        <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider select-none pointer-events-none transition-colors ${isPrimary ? 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-slate-900/80 text-gray-300 border border-slate-700/50'}`}>
          {driverCode}
        </div>
      </Html>
    </group>
  );
}

export default function TrackVisualizer({ year, location, session, primaryDriver }) {
  const [gridData, setGridData] = useState({});
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1); 
  const [errorMsg, setErrorMsg] = useState(null);
  
  const indexRef = useRef(0);
  const sliderRef = useRef();
  
  // 🏎️ The New Shared Memories
  const masterTimeRef = useRef(0);
  const distancesRef = useRef({}); 
  const leaderboardRef = useRef(null);
  
  const uiRefs = {
    speed: useRef(null), gear: useRef(null), rpm: useRef(null),
    throttle: useRef(null), brake: useRef(null), currentTime: useRef(null) 
  };

  useEffect(() => {
    setGridData({}); setErrorMsg(null);
    indexRef.current = 0; setPlaybackRate(1); 
    distancesRef.current = {}; // Reset distances on track change
    if (sliderRef.current) sliderRef.current.value = 0;
    if (leaderboardRef.current) leaderboardRef.current.innerHTML = '';

    const encodedLocation = encodeURIComponent(location);

    fetch(`http://127.0.0.1:8000/api/telemetry/grid/${year}/${encodedLocation}/${session}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
            const errorDetail = typeof data.detail === 'object' ? JSON.stringify(data.detail) : data.detail;
            throw new Error(errorDetail || `Server Error: ${res.status}`);
        }
        return data;
      })
      .then((data) => {
         if (data && data.error) setErrorMsg(typeof data.error === 'object' ? JSON.stringify(data.error) : data.error);
         else setGridData(data);
      })
      .catch((err) => setErrorMsg(err.message));
  }, [year, location, session]);

  const primaryTelemetry = gridData[primaryDriver] || [];
  
  const trackOutline = useMemo(() => {
    if (!primaryTelemetry || primaryTelemetry.length === 0) return [];
    return primaryTelemetry
      .filter(t => t && Number.isFinite(t.X) && Number.isFinite(t.Y))
      .map(t => new THREE.Vector3(t.X / 100, 0, t.Y / 100));
  }, [primaryTelemetry]);

  const handleScrub = (e) => {
    indexRef.current = Number(e.target.value);
    setIsPlaying(false); 
    if (uiRefs.currentTime.current && primaryTelemetry[indexRef.current]) {
       uiRefs.currentTime.current.innerText = formatTime(primaryTelemetry[indexRef.current].Time);
       masterTimeRef.current = primaryTelemetry[indexRef.current].Time; 
    }
  };

  const skipForward = () => {
    indexRef.current = Math.min(trackOutline.length - 1, indexRef.current + 200); 
    if (sliderRef.current) sliderRef.current.value = indexRef.current;
  };
  const skipBackward = () => {
    indexRef.current = Math.max(0, indexRef.current - 200);
    if (sliderRef.current) sliderRef.current.value = indexRef.current;
  };
  const togglePlaybackSpeed = () => setPlaybackRate(prev => prev === 0.5 ? 1 : prev === 1 ? 2 : prev === 2 ? 4 : 0.5);

  const totalLapTime = primaryTelemetry.length > 0 ? formatTime(primaryTelemetry[primaryTelemetry.length - 1].Time) : "0:00";

  return (
    <div className="w-full flex flex-col gap-4">
      
      <div className="w-full h-[600px] bg-slate-950 rounded-xl overflow-hidden relative border border-slate-700 shadow-2xl">
        
        {errorMsg && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90">
            <p className="text-red-500 font-mono text-center px-4">⚠️ {errorMsg}</p>
          </div>
        )}

        {(!errorMsg && Object.keys(gridData).length === 0) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 pointer-events-none">
            <p className="text-cyan-400 font-mono animate-pulse mb-2">Downloading 20-Car Telemetry Matrix...</p>
            <p className="text-gray-500 font-mono text-xs">(This takes a moment for a full Grand Prix)</p>
          </div>
        )}

        {/* 🏎️ THE NEW LIVE LEADERBOARD TOWER */}
        <div className="absolute top-4 left-4 z-10 w-32 pointer-events-none">
          <div className="bg-slate-900/90 border border-slate-700 rounded-t-lg p-2 mb-1 shadow-2xl">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Live Order</h3>
          </div>
          {/* The Animation Engine injects the sorted list right into this div! */}
          <div ref={leaderboardRef} className="flex flex-col drop-shadow-md"></div>
        </div>

        {/* Single Car Telemetry HUD */}
        <div className="absolute top-4 right-4 z-10 bg-slate-900/90 border border-slate-700 p-4 rounded-xl w-64 shadow-2xl pointer-events-none">
          <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
             <h3 className="text-xs font-bold text-gray-500 uppercase">Live Telemetry</h3>
             <span className="text-xs font-bold px-2 py-1 rounded text-slate-900" style={{ backgroundColor: getDriverColor(primaryDriver) }}>
               Car #{primaryDriver}
             </span>
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
            <div><span ref={uiRefs.rpm} className="text-sm font-mono text-white">0</span><span className="text-xs text-gray-500 ml-1">RPM</span></div>
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

        <Canvas camera={{ position: [0, 120, 0], fov: 50 }}>
          <ambientLight intensity={1} />
          {trackOutline.length >= 2 && (
            <>
              <Line points={trackOutline} color="#334155" lineWidth={2} />
              
              <group position={trackOutline[0]}>
                <Sphere args={[2, 16, 16]}>
                   <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
                </Sphere>
                <Html distanceFactor={100} center position={[0, -4, 0]}>
                   <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest bg-slate-950/80 px-2 py-0.5 rounded border border-gray-700 select-none pointer-events-none">
                     Start / Finish
                   </div>
                </Html>
              </group>
              
              {Object.keys(gridData).map((driverCode) => {
                const driverTelemetry = gridData[driverCode];
                const driverPoints = driverTelemetry
                  .filter(t => t && Number.isFinite(t.X) && Number.isFinite(t.Y))
                  .map(t => new THREE.Vector3(t.X / 100, 0, t.Y / 100));
                
                if (driverPoints.length < 2) return null;

                const isPrimary = driverCode === primaryDriver;

                return (
                  <AnimatedCar 
                    key={driverCode}
                    driverCode={driverCode} 
                    points={driverPoints} 
                    rawTelemetry={driverTelemetry} 
                    indexRef={indexRef} 
                    isPlaying={isPlaying} 
                    playbackRate={playbackRate} 
                    sliderRef={sliderRef} 
                    uiRefs={uiRefs} 
                    color={getDriverColor(driverCode)} 
                    isPrimary={isPrimary} 
                    masterTimeRef={masterTimeRef} 
                    distancesRef={distancesRef} 
                    leaderboardRef={leaderboardRef}
                  />
                );
              })}
            </>
          )}
          <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
        </Canvas>
      </div>

      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <span ref={uiRefs.currentTime} className="text-sm font-mono text-cyan-400 w-12 text-right">0:00.0</span>
          <input 
            type="range" 
            ref={sliderRef} 
            min="0" 
            max={trackOutline.length > 0 ? trackOutline.length - 1 : 100} 
            defaultValue="0" 
            disabled={trackOutline.length < 2 || errorMsg} 
            onChange={handleScrub} 
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600 disabled:opacity-50" 
          />
          <span className="text-sm font-mono text-gray-500 w-12">{totalLapTime}</span>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button onClick={skipBackward} disabled={trackOutline.length < 2 || errorMsg} className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">⏪</button>
            <button onClick={() => setIsPlaying(!isPlaying)} disabled={trackOutline.length < 2 || errorMsg} className="w-10 h-10 flex items-center justify-center bg-white text-black hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50">
              {isPlaying ? '⏸' : '▶️'}
            </button>
            <button onClick={skipForward} disabled={trackOutline.length < 2 || errorMsg} className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">⏩</button>
          </div>
          <button onClick={togglePlaybackSpeed} disabled={trackOutline.length < 2 || errorMsg} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-sm rounded-lg border border-slate-700 transition-colors disabled:opacity-50">
            {playbackRate}x Speed
          </button>
        </div>
      </div>
    </div>
  );
}