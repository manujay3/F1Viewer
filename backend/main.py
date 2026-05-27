from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import os
import pandas as pd
import redis

if not os.path.exists('cache'):
    os.makedirs('cache')

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

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

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

@app.get("/api/telemetry/grid/{year}/{location}/{session_type}")
def get_full_grid_telemetry(year: int, location: str, session_type: str):
    try:
        # 🧠 THE FIX: Translate fuzzy React names (Bahrain) to strict DB names (Sakhir)
        # This takes 0.01 seconds and uses almost zero memory!
        fastf1.Cache.enable_cache('cache')
        event = fastf1.get_event(year, location)
        strict_location = event.Location 
        
        # Now we build the key using the strict name!
        cache_key = f"grid_{year}_{strict_location}_{session_type}"

        # 🛡️ Look in Redis
        cached_data = redis_client.get(cache_key)
        
        if cached_data:
            print(f"Serving {cache_key} instantly from Redis!")
            return json.loads(cached_data)
        else:
            return {"error": f"Data not in cache. Looked for key: {cache_key}"}
            
    except Exception as e:
        return {"error": f"Backend Error: {str(e)}"}

# 🏎️ MOVED TO TOP: Specific Compare Route
@app.get("/api/telemetry/compare/{year}/{location}/{session_type}/{driver1}/{driver2}")
def get_telemetry_compare(year: int, location: str, session_type: str, driver1: str, driver2: str):
    try:
        session = fastf1.get_session(year, location, session_type)
        session.load(telemetry=True, weather=False, messages=False)

        def extract_driver_data(driver_code):
            laps = session.laps.pick_driver(driver_code)
            if len(laps) == 0:
                return []
            
            telemetry = laps.get_telemetry()
            df = telemetry[['Time', 'Distance', 'Speed', 'Throttle', 'Brake', 'nGear', 'RPM', 'X', 'Y']].copy()
            df = df.iloc[::4, :] # Downsample to save browser memory
            df['Time'] = df['Time'].dt.total_seconds()
            df = df.fillna(0)
            return df.to_dict(orient="records")

        # Fetch both drivers
        data1 = extract_driver_data(driver1)
        data2 = extract_driver_data(driver2)

        if not data1 or not data2:
            return {"error": "Could not find lap data for one or both drivers."}

        # Return them as a combined dictionary
        return {
            "driver1": data1,
            "driver2": data2
        }

    except Exception as e:
        return {"error": f"Backend Error: {str(e)}"}

# ⚠️ MOVED TO BOTTOM: Dynamic Route (Catch-all)
@app.get("/api/telemetry/{year}/{location}/{session_type}/{driver}")
def get_telemetry(year: int, location: str, session_type: str, driver: str):
    try:
        session = fastf1.get_session(year, location, session_type)
        # Load the session (this takes a few seconds the first time)
        session.load(telemetry=True, weather=False, messages=False)

        # 1. Get ALL laps for the driver (No more .pick_fastest()!)
        driver_laps = session.laps.pick_driver(driver)
        
        if len(driver_laps) == 0:
            return {"error": "No laps recorded for this driver."}

        # 2. Extract telemetry for the entire session
        telemetry = driver_laps.get_telemetry()

        # We added RPM to the extraction list!
        df = telemetry[['Time', 'Distance', 'Speed', 'Throttle', 'Brake', 'nGear', 'RPM', 'X', 'Y']].copy()
        
        # 🏎️ 4. DOWNSAMPLING (The Memory Saver)
        # Using [::4] means we only keep every 4th row of data. 
        # This reduces a 50,000 array down to a safe 12,500 array.
        df = df.iloc[::4, :] 

        # 5. Convert Time to seconds and clean up any NaNs
        df['Time'] = df['Time'].dt.total_seconds()
        df = df.fillna(0)

        return df.to_dict(orient="records")
        
    except Exception as e:
        return {"error": f"Backend Error: {str(e)}"}
    
from fastf1.ergast import Ergast

# Initialize the Ergast API interface
ergast = Ergast()

@app.get("/api/standings/{year}")
def get_season_standings(year: int):
    try:
        # Fetch driver standings
        driver_standings = ergast.get_driver_standings(season=year)
        # Fetch constructor standings
        team_standings = ergast.get_constructor_standings(season=year)
        
        # FastF1 returns a complex object; we extract the actual DataFrame and convert to dict
        drivers_df = driver_standings.content[0]
        teams_df = team_standings.content[0]
        
        return {
            "drivers": drivers_df.fillna('').to_dict(orient="records"),
            "constructors": teams_df.fillna('').to_dict(orient="records")
        }
    except Exception as e:
        return {"error": f"Failed to fetch standings: {str(e)}"}