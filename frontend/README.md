# F1 Analytics Hub

A full-stack F1 data analytics platform using FastF1, FastAPI, and React.

## 🚀 How to Run the Project (Daily Use)

You will need two separate terminal windows to run the backend and frontend simultaneously.

### 1. Start the Backend (Python/FastAPI)
Open your first terminal and run the following commands:
cd backend
source venv/bin/activate
uvicorn main:app --reload

*(The API will now be running on http://127.0.0.1:8000)*

### 2. Start the Frontend (React/Vite)
Open a second terminal and run the following commands:
cd frontend
npm run dev

*(The web app will now be running on http://localhost:5173)*

---

## 🛠️ First-Time Setup (New Machine)

If you are setting this up for the first time on a new computer, run these commands first to install the dependencies.

### Backend Setup:
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

### Frontend Setup:
cd frontend
npm install