from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from db.models import Doctor
from db.database import SessionLocal
from pydantic import BaseModel
from passlib.context import CryptContext
from typing import Optional, List
from app.schemas import DoctorCreate, DoctorResponse

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Routes
@router.get("/profile", response_model=DoctorResponse, status_code=status.HTTP_200_OK)
def get_doctor_profile(email: str, db: Session = Depends(get_db)):
    """Return the profile of the doctor with the specified email"""
    if not email:
        raise HTTPException(status_code=400, detail="Email query parameter is required")
    doctor = db.query(Doctor).filter(Doctor.email == email.lower()).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return DoctorResponse(
        id=doctor.id,
        name=doctor.name,
        specialty=doctor.specialty,
        email=doctor.email,
        is_active=doctor.is_active,
        patientCount=0,
        averageRating=0.0
    )

@router.get("", response_model=List[DoctorResponse], status_code=status.HTTP_200_OK)
def get_all_doctors(specialty: Optional[str] = None, db: Session = Depends(get_db)):
    """Return a list of all doctors, optionally filtered by specialty"""
    try:
        query = db.query(Doctor)
        if specialty:
            query = query.filter(Doctor.specialty.ilike(specialty))
        doctors = query.all()
        return [
            DoctorResponse(
                id=doctor.id,
                name=doctor.name or "Unknown",
                specialty=doctor.specialty or "N/A",
                email=doctor.email or "N/A",
                is_active=doctor.is_active if doctor.is_active is not None else True,
                patientCount=doctor.patientCount if hasattr(doctor, 'patientCount') else 0,
                averageRating=doctor.averageRating if hasattr(doctor, 'averageRating') else 0.0
            )
            for doctor in doctors
        ]
    except Exception as e:
        print(f"Error fetching doctors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch doctors: {str(e)}")

@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(data: DoctorCreate, db: Session = Depends(get_db)):
    """Create a new doctor"""
    existing = db.query(Doctor).filter_by(email=data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed_password = pwd_context.hash(data.password) if data.password else None

    new_doctor = Doctor(
        name=data.name,
        specialty=data.specialty,
        email=data.email,
        password=hashed_password,
        is_active=True
    )

    try:
        db.add(new_doctor)
        db.commit()
        db.refresh(new_doctor)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error during doctor creation")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    return DoctorResponse(
        id=new_doctor.id,
        name=new_doctor.name,
        specialty=new_doctor.specialty,
        email=new_doctor.email,
        is_active=new_doctor.is_active,
        patientCount=0,
        averageRating=0.0
    )

@router.get("/{doctor_id}", response_model=DoctorResponse, status_code=status.HTTP_200_OK)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    """Return the doctor with the specified ID"""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return DoctorResponse(
        id=doctor.id,
        name=doctor.name,
        specialty=doctor.specialty,
        email=doctor.email,
        is_active=doctor.is_active if doctor.is_active is not None else True,
        patientCount=0,
        averageRating=0.0
    )

@router.put("/{doctor_id}", response_model=DoctorResponse, status_code=status.HTTP_200_OK)
def update_doctor(doctor_id: int, data: DoctorCreate, db: Session = Depends(get_db)):
    """Update an existing doctor"""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    existing = db.query(Doctor).filter(Doctor.email == data.email, Doctor.id != doctor_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    doctor.name = data.name
    doctor.specialty = data.specialty
    doctor.email = data.email
    doctor.is_active = True
    if data.password:
        doctor.password = pwd_context.hash(data.password)

    try:
        db.commit()
        db.refresh(doctor)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error during doctor update")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    return DoctorResponse(
        id=doctor.id,
        name=doctor.name,
        specialty=doctor.specialty,
        email=doctor.email,
        is_active=doctor.is_active if doctor.is_active is not None else True,
        patientCount=0,
        averageRating=0.0
    )

@router.patch("/{doctor_id}/status", response_model=DoctorResponse, status_code=status.HTTP_200_OK)
def update_doctor_status(doctor_id: int, db: Session = Depends(get_db)):
    """Toggle the active status of a doctor"""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doctor.is_active = not doctor.is_active
    try:
        db.commit()
        db.refresh(doctor)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error during status update")

    return DoctorResponse(
        id=doctor.id,
        name=doctor.name,
        specialty=doctor.specialty,
        email=doctor.email,
        is_active=doctor.is_active if doctor.is_active is not None else True,
        patientCount=0,
        averageRating=0.0
    )