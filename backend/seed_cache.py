import fastf1
import json
import boto3 # type: ignore
import gc
import os
from dotenv import load_dotenv

# Load your secret keys from the hidden .env file
load_dotenv()

ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
SECRET_KEY = os.getenv("R2_SECRET_KEY")
BUCKET_NAME = "f1-telemetry"

# Initialize the S3 client pointing to Cloudflare R2
s3_client = boto3.client(
    's3',
    endpoint_url=ENDPOINT_URL,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY
)

def seed_season_to_r2(year):
    print(f"Starting Full-Race R2 Upload for the {year} Season...")
    fastf1.Cache.enable_cache('cache')
    schedule = fastf1.get_event_schedule(year)
    races = schedule[schedule['RoundNumber'] > 0]

    for index, event in races.iterrows():
        location = event['Location']
        
        for session_type in ['Q', 'R']:
            file_name = f"grid_{year}_{location}_{session_type}.json"
            print(f"⚙️ Crunching full 2-hour session: {file_name}...")
            
            try:
                session = fastf1.get_session(year, location, session_type)
                session.load(telemetry=True, weather=False, messages=False)

                grid_data = {}
                for driver in session.results['Abbreviation']:
                    laps = session.laps.pick_driver(driver)
                    if len(laps) == 0: continue
                    
                    # Grab the telemetry for the ENTIRE session
                    telemetry = laps.get_telemetry()
                        
                    df = telemetry[['Time', 'Distance', 'Speed', 'Throttle', 'Brake', 'nGear', 'RPM', 'X', 'Y']].copy()
                    
                    # Downsample 1 out of every 10 points for smooth 3D animation
                    df = df.iloc[::10, :] 
                    df['Time'] = df['Time'].dt.total_seconds()
                    df = df.fillna(0)
                    
                    grid_data[driver] = df.to_dict(orient="records")

                    del telemetry
                    del df
                    gc.collect()

                # Upload directly to your public Cloudflare R2 bucket
                s3_client.put_object(
                    Bucket=BUCKET_NAME,
                    Key=file_name,
                    Body=json.dumps(grid_data),
                    ContentType='application/json'
                )
                print(f"SUCCESS: {file_name} uploaded to Cloudflare R2!")
                
            except Exception as e:
                print(f"Failed to process {file_name}: {e}")

# Launch the pipeline!
seed_season_to_r2(2023)