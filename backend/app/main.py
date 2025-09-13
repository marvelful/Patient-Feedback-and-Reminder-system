from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from db.database import Base, engine, SessionLocal
from db.models import FeedbackCategory
from app.doctor import router as doctor_router
from app.patient import router as patient_router
from app.feedback import router as feedback_router
from app.auth import router as auth_router
from app.reminders import router as reminders_router
from app.appointments import router as appointments_router, public_router as appointments_public_router
from app.medications import router as medications_router
from app.statistics import router as statistics_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        # Initialize feedback categories only if none exist
        existing_categories = db.query(FeedbackCategory).count()
        if existing_categories == 0:
            categories = ["Service Quality", "Doctor Consultation", "Wait Time", "Staff Behavior", "Facilities", "Overall Experience"]
            for name in categories:
                db.add(FeedbackCategory(name=name))
            db.commit()
        yield
    finally:
        db.close()

app = FastAPI(title="DGH Care API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.1.186:3000", "http://localhost:3000","*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)

app.include_router(doctor_router, prefix="/doctor", tags=["Doctors"])
app.include_router(patient_router, prefix="/patients", tags=["Patients"])
app.include_router(feedback_router, prefix="/feedback", tags=["Feedback"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(reminders_router, prefix="/reminders", tags=["Reminders"])
app.include_router(appointments_router, prefix="/appointments", tags=["Appointments"])
app.include_router(appointments_public_router, prefix="/appointments/public", tags=["Appointments Public"])
app.include_router(medications_router, prefix="/medications", tags=["Medications"])
app.include_router(statistics_router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "DGH Care API"}