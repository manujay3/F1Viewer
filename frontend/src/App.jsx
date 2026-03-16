import { useState, useEffect } from 'react'

function App() {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. Fetch data when the page loads
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/schedule/2023')
      .then(response => response.json())
      .then(data => {
        setSchedule(data)
        setLoading(false)
      })
      .catch(error => console.error("Error fetching data:", error))
  }, [])

  // 2. Helper function to make dates look nice
  const formatDate = (dateString) => {
    if (!dateString) return "TBA"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-extrabold text-red-600 tracking-tighter">
            F1 <span className="text-white">2023 SCHEDULE</span>
          </h1>
          <p className="text-gray-400 mt-2">Official FastF1 Data Integration</p>
        </header>

        {/* Loading State */}
        {loading && <p className="text-center text-xl animate-pulse">Loading race data...</p>}

        {/* Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedule.map((race) => (
            <div key={race.RoundNumber} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-red-600 transition-all hover:shadow-2xl hover:-translate-y-1">
              
              {/* Card Header: Location */}
              <div className="bg-gray-700 p-3 flex justify-between items-center">
                <span className="text-xs font-bold bg-gray-900 px-2 py-1 rounded text-gray-300">ROUND {race.RoundNumber}</span>
                <span className="text-sm font-semibold text-gray-200 uppercase tracking-wide">{race.Location}</span>
              </div>

              {/* Card Body: Race Name */}
              <div className="p-5">
                <h2 className="text-2xl font-bold mb-1 leading-tight">{race.EventName}</h2>
                <p className="text-gray-500 text-sm mb-4">{race.Country}</p>
                
                {/* Times Section */}
                <div className="space-y-3 pt-4 border-t border-gray-700">
                  
                  {/* Qualifying Row */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-400 font-semibold">Qualifying</span>
                    <span className="text-sm font-mono bg-gray-900 px-2 py-1 rounded text-gray-300">
                      {formatDate(race.Session4Date)}
                    </span>
                  </div>

                  {/* Race Row */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white font-bold">🏁 RACE</span>
                    <span className="text-sm font-mono bg-red-600 px-2 py-1 rounded text-white font-bold shadow-lg shadow-red-900/50">
                      {formatDate(race.Session5Date)}
                    </span>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  )
}

export default App
