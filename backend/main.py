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
        
        # --- THIS IS THE FIX ---
        # We added 'Session4Date' (Quali) and 'Session5Date' (Race)
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
