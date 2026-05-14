import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import RaceCenter from './pages/RaceCenter';
import SeasonStats from './pages/SeasonStats'; // We will build this next!

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <span className="text-2xl font-black text-red-600 tracking-tighter italic">
              F1<span className="text-white">HUB</span>
            </span>
            
            <div className="flex space-x-1">
              <Link 
                to="/" 
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${location.pathname === '/' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-slate-800'}`}
              >
                3D Race Center
              </Link>
              <Link 
                to="/stats" 
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${location.pathname === '/stats' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-slate-800'}`}
              >
                Season Standings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white font-sans">
        <Navigation />
        <main className="max-w-7xl mx-auto py-8 px-6">
          <Routes>
            <Route path="/" element={<RaceCenter />} />
            <Route path="/stats" element={<SeasonStats />} />
          </Routes>
        </main>
      </div>ß
    </Router>
  );
}