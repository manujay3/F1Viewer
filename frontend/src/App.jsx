import { useState, useEffect } from 'react'

function App() {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch data from our Python Backend
    fetch('http://127.0.0.1:8000/api/schedule/2023')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        return response.json()
      })
      .then(data => {
        console.log(data[0])
        setSchedule(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        setError(error.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-4xl font-bold text-red-600">F1 2023 Season Schedule</h1>
          <p className="text-gray-400 mt-2">Powered by FastF1 & FastAPI</p>
        </header>

        {loading && (
          <div className="text-center py-20">
            <div className="text-2xl animate-pulse">Loading Race Data... 🏎️</div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
            Error loading data: {error}. Is the backend running?
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedule.map((race, index) => (
              <div 
                key={index} 
                className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors border border-gray-700 shadow-lg"
              >
                <div className="bg-gray-700 px-4 py-2 flex justify-between items-center">
                  <span className="text-sm font-mono text-gray-300">Round {race.RoundNumber}</span>
                  <span className="text-xs bg-red-600 px-2 py-1 rounded text-white font-bold">
                    {new Date(race.EventDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-1">{race.EventName}</h2>
                  <p className="text-gray-400 text-sm mb-4">{race.Location}, {race.Country}</p>
                  
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex justify-between">
                      <span>Qualifying:</span>
                      <span className="text-white">
                        {race.Session3Date ? new Date(race.Session3Date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-red-400">
                      <span>Race:</span>
                      <span className="text-white">
                         {race.Session5Date ? new Date(race.Session5Date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
