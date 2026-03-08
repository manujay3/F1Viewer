import fastf1
import os

# Setup cache
if not os.path.exists('cache'):
    os.makedirs('cache')

fastf1.Cache.enable_cache('cache')

print("🏎️  Downloading 2023 Bahrain GP data...")

# Load the session
session = fastf1.get_session(2023, 'Bahrain', 'Q')
session.load()

print(f"✅ Success! Pole Position time: {session.results.iloc[0]['Q3']}")
