import TrackVisualizer from './components/TrackVisualizer';

import { useState, useEffect } from 'react'

function App() {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [selectedRace, setSelectedRace] = useState(null)
  const [raceResults, setRaceResults] = useState([])
  const [resultsLoading, setResultsLoading] = useState(false)
  
  // 🏎️ ADD THIS LINE: Track which driver is currently selected in the 3D view
  const [selectedDriver, setSelectedDriver] = useState('1')
  
  // State to track which button (Q or R) is currently active
  const [activeSession, setActiveSession] = useState('Q')

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/schedule/2023')
      .then(res => res.json())
      .then(data => {
        setSchedule(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const fetchResults = (location, sessionType = 'Q') => {
    setSelectedRace(location)
    setActiveSession(sessionType)
    setResultsLoading(true)
    
    fetch(`http://127.0.0.1:8000/api/results/2023/${location}/${sessionType}`)
      .then(async res => {
        if (!res.ok) throw new Error(`Backend crashed with status: ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error); 
        return data;
      })
      .then(data => {
        setRaceResults(data)
        setResultsLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch results", err)
        alert("Error crunching data: " + err.message)
        setRaceResults([])
        setResultsLoading(false)
      })
  }

  const displayTime = (driver) => {
    if (activeSession === 'Q') {
      return (driver.Q3 && driver.Q3 !== 'NaT' && driver.Q3 !== '') 
        ? String(driver.Q3).substring(10, 19) 
        : 'No Time';
    } else {
      // RACE LOGIC
      // 1. Check Status FIRST. If they didn't finish on the lead lap, show the status!
      if (driver.Status && driver.Status !== 'Finished' && driver.Status !== '') {
          return driver.Status; // This will return "+1 Lap", "Accident", etc.
      }
      
      // 2. If they DID finish on the lead lap, format their time/gap
      if (driver.Time && driver.Time !== 'NaT' && driver.Time !== '') {
         let timeStr = String(driver.Time).replace('0 days ', ''); 
         
         if (driver.Position === 1 || driver.Position === "1.0") {
             // Race Winner
             return timeStr.startsWith('0') ? timeStr.substring(1, 12) : timeStr.substring(0, 12);
         } else {
             // Drivers on the lead lap (Gap to winner)
             let parts = timeStr.split(':');
             if (parts.length === 3) {
                 let minutes = parseInt(parts[1]);
                 let seconds = parts[2].substring(0, 6); 
                 
                 if (minutes > 0) {
                     return `+${minutes}:${seconds}`;
                 } else {
                     return `+${seconds}s`; 
                 }
             }
         }
      }
      
      return 'No Time';
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-b border-gray-700 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-red-600">F1 Analytics Hub</h1>
            <p className="text-gray-400 mt-2">2023 Season</p>
          </div>
          {selectedRace && (
            <button 
              onClick={() => setSelectedRace(null)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors"
            >
              ← Back to Schedule
            </button>
          )}
        </header>

        {loading && <div className="text-center py-20 animate-pulse text-2xl">Loading Schedule... 🏎️</div>}
        {error && <div className="bg-red-900/50 text-red-200 p-4 rounded-lg">Error: {error}</div>}

        {!loading && !error && !selectedRace && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedule.map((race, index) => (
              <div 
                key={index}
                onClick={() => fetchResults(race.Location, 'Q')} 
                className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors border border-gray-700 shadow-lg cursor-pointer transform hover:-translate-y-1"
              >
                <div className="bg-gray-700 px-4 py-2 flex justify-between items-center">
                  <span className="text-sm font-mono text-gray-300">Round {race.RoundNumber}</span>
                  <span className="text-xs bg-red-600 px-2 py-1 rounded text-white font-bold">
                    {new Date(race.EventDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-1">{race.EventName}</h2>
                  <p className="text-gray-400 text-sm">{race.Location}, {race.Country}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedRace && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{selectedRace} Results</h2>
              
              {/* The Session Toggle Buttons */}
              <div className="flex space-x-2 bg-gray-900 p-1 rounded-lg border border-gray-700">
                <button 
                  onClick={() => fetchResults(selectedRace, 'Q')}
                  className={`px-4 py-1.5 rounded text-sm font-bold transition-colors ${activeSession === 'Q' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                  Qualifying
                </button>
                <button 
                  onClick={() => fetchResults(selectedRace, 'R')}
                  className={`px-4 py-1.5 rounded text-sm font-bold transition-colors ${activeSession === 'R' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                  Sunday Race
                </button>
              </div>
            </div>
            {/* 🏎️ PASTE THE 3D TRACK VISUALIZER RIGHT HERE 🏎️ */}
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
            Car #{selectedDriver} - {activeSession === 'Q' ? 'Qualifying' : 'Race'} Telemetry
            </h2>
            {/* Now it dynamically listens to your clicks! */}
            <TrackVisualizer 
              year={2023} 
              location={selectedRace} 
              session={activeSession} 
              driver1={selectedDriver} 
              driver2="16"  // Hardcoded to Charles Leclerc (Car 16) for a test!
            />
            </div>
            {/* ------------------------------------------------ */}
            
            {resultsLoading ? (
               <div className="py-10 text-center animate-pulse text-gray-400">
                  Downloading FastF1 Telemetry... <br/>
                  <span className="text-sm">(This takes a few seconds the first time!)</span>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 uppercase text-sm">
                      <th className="p-3">Pos</th>
                      <th className="p-3">Driver</th>
                      <th className="p-3">Team</th>
                      <th className="p-3">{activeSession === 'Q' ? 'Q3 Time' : 'Total Time'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Notice the exact arrow function syntax right below this line! */}
                    {raceResults.map((driver, i) => (
                      <tr 
                        key={i} 
                        onClick={() => setSelectedDriver(String(driver.DriverNumber))}
                        className={`border-b border-gray-750 hover:bg-gray-700/50 cursor-pointer transition-colors ${selectedDriver === String(driver.DriverNumber) ? 'bg-slate-800 border-l-4 border-l-red-600' : ''}`}
                      >
                        <td className="p-3 font-mono">{driver.Position}</td>
                        <td className="p-3 font-bold">
                          <span className="text-gray-400 text-sm mr-2">{driver.DriverNumber}</span>
                          {driver.BroadcastName}
                        </td>
                        <td className="p-3 text-sm text-gray-300">{driver.TeamName}</td>
                        <td className="p-3 font-mono text-red-400">
                          {displayTime(driver)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App