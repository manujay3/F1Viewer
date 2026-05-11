import { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// 1. The Animation Engine
// We pass in our Refs so the 3D engine can talk to the HTML slider
function AnimatedCar({ points, indexRef, isPlaying, sliderRef }) {
  const carRef = useRef();

  useFrame(() => {
    if (!points || points.length === 0) return;

    if (isPlaying) {
      // Tweak this to make playback faster/slower
      const PLAYBACK_SPEED = 3; 
      indexRef.current += PLAYBACK_SPEED;
      
      // Loop back to the start finish line
      if (indexRef.current >= points.length) {
        indexRef.current = 0; 
      }
    }

    // Move the 3D car to the exact coordinate
    const currentPoint = points[Math.floor(indexRef.current)];
    if (carRef.current && currentPoint) {
      carRef.current.position.copy(currentPoint);
    }

    // THE MAGIC: Move the HTML slider thumb to match the car's position 
    // WITHOUT causing a React re-render!
    if (sliderRef.current && isPlaying) {
      sliderRef.current.value = indexRef.current;
    }
  });

  return (
    <Sphere ref={carRef} args={[1.5, 16, 16]}>
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
    </Sphere>
  );
}

// 2. The Main Component
export default function TrackVisualizer({ year, location, session, driver }) {
  const [telemetry, setTelemetry] = useState([]);
  
  // State for the Play/Pause button
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Refs to hold the current frame number and the HTML slider element
  const indexRef = useRef(0);
  const sliderRef = useRef();

  useEffect(() => {
    fetch(`http://localhost:8000/api/telemetry/${year}/${location}/${session}/${driver}`)
      .then((res) => res.json())
      .then((data) => setTelemetry(data))
      .catch((err) => console.error("Error fetching telemetry:", err));
  }, [year, location, session, driver]);

  const points = useMemo(() => {
    if (!telemetry || telemetry.length === 0) return [];
    return telemetry.map(t => new THREE.Vector3(t.X / 100, 0, t.Y / 100));
  }, [telemetry]);

  // When the user drags the slider, jump the car to that exact frame
  const handleScrub = (e) => {
    indexRef.current = Number(e.target.value);
    setIsPlaying(false); // Auto-pause when they grab the slider so they can inspect a corner
  };

  if (telemetry.length === 0) {
    return <div className="p-10 text-center text-gray-400 font-mono animate-pulse">Loading Replay Engine...</div>;
  }

  return (
    <div className="w-full flex flex-col gap-4">
      
      {/* 3D Canvas Area */}
      <div className="w-full h-[400px] bg-slate-950 rounded-xl overflow-hidden cursor-move relative border border-slate-700">
        <Canvas camera={{ position: [0, 80, 0], fov: 50 }}>
          <ambientLight intensity={1} />
          
          <Line points={points} color="#334155" lineWidth={2} />
          
          <AnimatedCar 
            points={points} 
            indexRef={indexRef} 
            isPlaying={isPlaying} 
            sliderRef={sliderRef}
          />
          
          <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
        </Canvas>
      </div>

      {/* HTML Media Controls */}
      <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-700">
        
        {/* Play/Pause Button */}
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-12 h-12 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-full text-white text-xl transition-colors flex-shrink-0"
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>
        
        {/* Scrubber Range Input */}
        <div className="flex-grow flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Telemetry Timeline
          </label>
          <input 
            type="range" 
            ref={sliderRef}
            min="0" 
            max={points.length - 1} 
            defaultValue="0"
            onChange={handleScrub}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
        </div>
        
      </div>
    </div>
  );
}