from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import os
import pandas as pd


# Enable the cache in the 'cache' directory
fastf1.Cache.enable_cache('cache') 


# --- 2. CREATE THE APP ---
app = FastAPI(title="F1Viewer API")


# --- 3. CONFIGURE CORS ---
# This allows the frontend (which will run on a different port) to talk to this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for development only)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],
)


# 4. DEFINE ROUTES (URLS) 

@app.get("/")
def home():
    """
    A simple check to see if the server is running.
    """
    return {"message": "F1Viewer API is running! 🏎️"}


@app.get("/api/schedule/{year}")
def get_schedule(year: int):
    try:
        # Get schedule, but ignore Pre-Season Testing (Round 0)
        schedule = fastf1.get_event_schedule(year, include_testing=False)
        
        columns_we_want = [
            'RoundNumber', 
            'Country', 
            'Location', 
            'EventName', 
            'EventDate', 
            'Session4Date', 
            'Session5Date'
        ]
        
        filtered_schedule = schedule[columns_we_want]
        # Convert to dictionary (JSON) and handle empty values
        return filtered_schedule.fillna('').to_dict(orient='records')
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/results/{year}/{location}/{session_type}")
def get_session_results(year: int, location: str, session_type: str):
    
    try:
        # Load the session. Disabling telemetry/weather makes this load much faster.
        session = fastf1.get_session(year, location, session_type)
        session.load(telemetry=False, weather=False)
        
        # Select the most relevant columns for the frontend
        columns = [
            'Position', 'DriverNumber', 'BroadcastName', 
            'Abbreviation', 'TeamName', 'Q3', 'Time', 'Status'
        ]
        
        # FastF1 returns all columns, but some might be missing depending on the session 
        available_columns = [col for col in columns if col in session.results.columns]
        results = session.results[available_columns].copy()

        # Timedelta objects (like lap times) break JSON serialization, so convert them to strings
        for col in ['Q3', 'Time']:
            if col in results.columns:
                results[col] = results[col].astype(str).replace('NaT', '')

        return results.fillna('').to_dict(orient='records')

    except Exception as e:
        return {"error": str(e)}
    
@app.get("/api/telemetry/{year}/{location}/{session_type}/{driver}")
def get_telemetry(year: int, location: str, session_type: str, driver: str):
    """
    Fetch the raw telemetry (speed, throttle, gears, X/Y coordinates) for a driver's fastest lap.
    """
    try:
        # 1. Load the session with telemetry enabled
        session = fastf1.get_session(year, location, session_type)
        session.load(telemetry=True, weather=False)

        # 2. Grab this specific driver's fastest lap
        fastest_lap = session.laps.pick_driver(driver).pick_fastest()
        
        # 3. Extract the microsecond-by-microsecond car telemetry
        telemetry = fastest_lap.get_telemetry()

        # 4. Select only the columns we need for the 3D visualizer
        df = telemetry[['Distance', 'Speed', 'Throttle', 'Brake', 'nGear', 'X', 'Y']].copy()
        
        # 5. Fill any missing data gaps with 0
        df = df.fillna(0)
        
        # 6. Send the coordinates to React
        return df.to_dict(orient='records')
        
    except Exception as e:
        return {"error": str(e)}