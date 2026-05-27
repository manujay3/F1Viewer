import fastf1
import json
import redis # type: ignore
import gc

# 1. Connect directly to your Upstash Cloud Database
REDIS_URL = "rediss://default:gQAAAAAAAWqZAAIgcDE3OGNhZTJkYzMxNzE0ZGYwYmE3ZDM1NTFjMmM3Mjc5NA@major-barnacle-92825.upstash.io:6379"
redis_client = redis.from_url(REDIS_URL, decode_responses=True, ssl_cert_reqs="none")

def seed_entire_season(year):
    print(f"🏆 Starting Mass Data Upload for the {year} Season...")
    fastf1.Cache.enable_cache('cache')
    
    # 1. Grab the official schedule for the year
    schedule = fastf1.get_event_schedule(year)
    
    # Filter out pre-season testing (Round 0)
    races = schedule[schedule['RoundNumber'] > 0]

    # 2. Loop through every single location on the calendar
    for index, event in races.iterrows():
        location = event['Location']
        
        # 3. Process BOTH Qualifying ('Q') and the Sunday Race ('R')
        for session_type in ['Q', 'R']:
            cache_key = f"grid_{year}_{location}_{session_type}"
            
            # Smart Check: If we already uploaded this race, skip it to save time!
            if redis_client.exists(cache_key):
                print(f"{cache_key} already in database. Skipping...")
                continue
            
            print(f"⚙️ Crunching {cache_key}...")
            
            try:
                session = fastf1.get_session(year, location, session_type)
                session.load(telemetry=True, weather=False, messages=False)

                grid_data = {}
                for driver in session.results['Abbreviation']:
                    laps = session.laps.pick_driver(driver)
                    if len(laps) == 0: continue
                    
                    telemetry = laps.get_telemetry()
                    df = telemetry[['Time', 'Distance', 'Speed', 'Throttle', 'Brake', 'nGear', 'RPM', 'X', 'Y']].copy()
                    
                    df = df.iloc[::6, :] 
                    df['Time'] = df['Time'].dt.total_seconds()
                    df = df.fillna(0)
                    
                    grid_data[driver] = df.to_dict(orient="records")

                    del telemetry
                    del df
                    gc.collect()

                # Upload to Upstash
                redis_client.set(cache_key, json.dumps(grid_data))
                print(f"SUCCESS: {cache_key} uploaded!")
                
            except Exception as e:
                print(f"Failed to process {cache_key}: {e}")

# 🚀 Launch the mass upload!
seed_entire_season(2023)