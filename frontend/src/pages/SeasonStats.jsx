import { useState, useEffect } from 'react';

// Using the same hex colors to keep the UI consistent!
const TEAM_COLORS = {
  "Red Bull": "#3671C6", "Mercedes": "#6CD3BF", "Ferrari": "#F91536", 
  "McLaren": "#F58020", "Aston Martin": "#358C75", "Alpine F1 Team": "#2293D1", 
  "Williams": "#37BEDD", "AlphaTauri": "#5E8FAA", "Alfa Romeo": "#C92D4B", "Haas F1 Team": "#B6BABD", 
};

export default function SeasonStats() {
  const [standings, setStandings] = useState({ drivers: [], constructors: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/standings/2023')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch standings");
        return res.json();
      })
      .then(data => {
        setStandings(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-20 animate-pulse font-mono text-cyan-400">Fetching FIA Database...</div>;
  if (error) return <div className="bg-red-900/50 text-red-200 p-4 rounded-lg font-mono">⚠️ {error}</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* DRIVERS CHAMPIONSHIP */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="bg-slate-900 p-4 border-b border-slate-800">
          <h2 className="text-xl font-bold uppercase tracking-wider text-gray-200">Drivers' Championship</h2>
        </div>
        <div className="p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-widest border-b border-slate-800">
                <th className="pb-3 pl-2">Pos</th>
                <th className="pb-3">Driver</th>
                <th className="pb-3">Wins</th>
                <th className="pb-3 text-right pr-4">Points</th>
              </tr>
            </thead>
            <tbody>
              {standings.drivers.map((driver, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 pl-2 font-mono text-gray-400">{driver.position}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-6 rounded-full" style={{ backgroundColor: TEAM_COLORS[driver.constructorName] || '#fff' }}></div>
                      <div>
                        <div className="font-bold">{driver.givenName} {driver.familyName}</div>
                        <div className="text-xs text-gray-500">{driver.constructorName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-gray-400">{driver.wins}</td>
                  <td className="py-3 font-mono font-bold text-cyan-400 text-right pr-4">{driver.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONSTRUCTORS CHAMPIONSHIP */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl h-fit">
        <div className="bg-slate-900 p-4 border-b border-slate-800">
          <h2 className="text-xl font-bold uppercase tracking-wider text-gray-200">Constructors' Championship</h2>
        </div>
        <div className="p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-widest border-b border-slate-800">
                <th className="pb-3 pl-2">Pos</th>
                <th className="pb-3">Team</th>
                <th className="pb-3">Wins</th>
                <th className="pb-3 text-right pr-4">Points</th>
              </tr>
            </thead>
            <tbody>
              {standings.constructors.map((team, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="py-4 pl-2 font-mono text-gray-400">{team.position}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TEAM_COLORS[team.constructorName] || '#fff' }}></div>
                      <span className="font-bold text-lg">{team.constructorName}</span>
                    </div>
                  </td>
                  <td className="py-4 font-mono text-gray-400">{team.wins}</td>
                  <td className="py-4 font-mono font-bold text-cyan-400 text-right pr-4 text-lg">{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}