import fastf1
import json
import redis # type: ignore
import gc

# 1. Connect directly to your Upstash Cloud Database
REDIS_URL = "rediss://default:********@major-barnacle-92825.upstash.io:6379" # <-- PASTE YOUR URL HERE
redis_client = redis.from_url(REDIS_URL, decode_responses=True, ssl_cert_reqs="none")

def seed_race_to_cloud(year, location, session_type):
    cache_key = f"grid_{year}_{location}_{session_type}"
    print(f"⚙️ Downloading and calculating {cache_key} on local machine...")

    fastf1.Cache.enable_cache('cache')
    session = fastf1.get_session(year, location, session_type)
    
    # Your laptop has enough RAM to handle this easily!
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

    # 2. Upload the processed JSON directly to the cloud
    # We remove the expiration so it stays in your database permanently
    redis_client.set(cache_key, json.dumps(grid_data))
    print(f"✅ SUCCESS: {cache_key} uploaded to Upstash!")

# 3. Run it for the race you are testing right now on Vercel
seed_race_to_cloud(2023, "Monaco", "Q")