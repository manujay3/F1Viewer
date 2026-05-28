import fastf1
import json
import redis 
import gc

# 1. Connect directly to your Upstash Cloud Database
REDIS_URL = "rediss://default:gQAAAAAAAWqZAAIgcDE3OGNhZTJkYzMxNzE0ZGYwYmE3ZDM1NTFjMmM3Mjc5NA@major-barnacle-92825.upstash.io:6379"
redis_client = redis.from_url(REDIS_URL, decode_responses=True, ssl_cert_reqs="none")

def seed_optimized_season(year):
    print("🧹 Wiping the bloated data from the database...")
    redis_client.flushdb() # This gives us a totally clean slate
    
    print(f"🏆 Starting Optimized Data Upload for {year}...")
    fastf1.Cache.enable_cache('cache')
    schedule = fastf1.get_event_schedule(year)
    races = schedule[schedule['RoundNumber'] > 0]

    for index, event in races.iterrows():
        location = event['Location']
        
        for session_type in ['Q', 'R']:
            cache_key = f"grid_{year}_{location}_{session_type}"
            print(f"⚙️ Crunching {cache_key}...")
            
            try:
                session = fastf1.get_session(year, location, session_type)
                session.load(telemetry=True, weather=False, messages=False)

                grid_data = {}
                for driver in session.results['Abbreviation']:
                    laps = session.laps.pick_driver(driver)
                    if len(laps) == 0: continue
                    
                    # 🛡️ THE FIX: Only grab the absolute fastest lap for the 3D visualizer
                    try:
                        fastest_lap = laps.pick_fastest()
                        telemetry = fastest_lap.get_telemetry()
                    except:
                        # If a driver crashed on Lap 1 and has no valid laps, we skip them safely
                        continue 
                        
                    df = telemetry[['Time', 'Distance', 'Speed', 'Throttle', 'Brake', 'nGear', 'RPM', 'X', 'Y']].copy()
                    
                    # We can use a much lighter downsample now because the data is so small!
                    df = df.iloc[::3, :] 
                    df['Time'] = df['Time'].dt.total_seconds()
                    df = df.fillna(0)
                    
                    grid_data[driver] = df.to_dict(orient="records")

                    del telemetry
                    del df
                    gc.collect()

                # Upload the ultra-lightweight JSON to Upstash
                redis_client.set(cache_key, json.dumps(grid_data))
                print(f"✅ SUCCESS: {cache_key} uploaded!")
                
            except Exception as e:
                print(f"❌ Failed to process {cache_key}: {e}")

# Launch it!
seed_optimized_season(2023)