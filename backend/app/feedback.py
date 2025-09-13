from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import SessionLocal
from db.models import Feedback, FeedbackCategory, Doctor, Patient
from app.schemas import FeedbackResponse, FeedbackBase, FeedbackCategoryResponse, DoctorResponse, PatientResponse
from app.auth import get_current_user
from pydantic import BaseModel
import traceback
from datetime import datetime
router = APIRouter(redirect_slashes=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class FeedbackBase(BaseModel):
    patient_id: int
    doctor_id: int
    category_id: int
    rating: int
    comment: str


class FeedbackResponse(FeedbackBase):
    id: int
    created_at: str
    category: FeedbackCategoryResponse
    doctor: DoctorResponse
    class Config:
        from_attributes = True

@router.get("/feedback_categories", response_model=list[FeedbackCategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """Return a list of feedback categories"""
    categories = db.query(FeedbackCategory).all()
    if not categories:
        raise HTTPException(status_code=404, detail="No categories found")
    return [
        FeedbackCategoryResponse(
            id=cat.id,
            name=cat.name
        )
        for cat in categories
    ]

@router.get("/", response_model=list[FeedbackResponse])
def list_feedback(doctor_id: int = None, patient_id: int = None, db: Session = Depends(get_db)):
    """Return a list of feedback, optionally filtered by doctor_id or patient_id"""
    query = db.query(Feedback)
    
    # Apply filters
    if doctor_id:
        query = query.filter(Feedback.doctor_id == doctor_id)
    if patient_id:
        query = query.filter(Feedback.patient_id == patient_id)
    
    feedback = query.all()
    if not feedback:
        # Don't raise 404 error, just return empty list
        return []
    return [
        FeedbackResponse(
            id=fb.id,
            patient_id=fb.patient_id,
            doctor_id=fb.doctor_id,
            category_id=fb.category_id,
            rating=fb.rating,
            comment=fb.comment,
            created_at=fb.created_at.isoformat(),
            category=FeedbackCategoryResponse(id=fb.category.id, name=fb.category.name),
            doctor=DoctorResponse(
                id=fb.doctor.id,
                name=fb.doctor.name or "Unknown",
                specialty=fb.doctor.specialty or "N/A",
                email=fb.doctor.email or "N/A",
                is_active=fb.doctor.is_active if fb.doctor.is_active is not None else True,
                patientCount=0,
                averageRating=0.0
            ),
            patient=PatientResponse(
                id=fb.patient.id,
                first_name=fb.patient.first_name or "Unknown",
                last_name=fb.patient.last_name or "Unknown",
                email=fb.patient.email or "N/A",
                phone_number=fb.patient.phone_number or "N/A",
                created_at=fb.patient.created_at.isoformat() if fb.patient.created_at else datetime.utcnow().isoformat(),
                is_active=fb.patient.is_active if fb.patient.is_active is not None else True
            )
        )
        for fb in feedback
    ]



@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(data: FeedbackBase, db: Session = Depends(get_db)):
    """Create a new feedback entry"""
    # Validate doctor_id
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Validate patient_id
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")


    # Validate category_id
    category = db.query(FeedbackCategory).filter(FeedbackCategory.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Feedback category not found")

    # Create feedback
    new_feedback = Feedback(
    patient_id=data.patient_id,
    doctor_id=data.doctor_id,
    category_id=data.category_id,
    rating=data.rating,
    comment=data.comment
    )
    try:
        db.add(new_feedback)
        db.commit()
        db.refresh(new_feedback)
    except Exception as e:
        db.rollback()
        # Log the full stack trace for debugging
        print("Error creating feedback:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to create feedback: {str(e)}") 
    return FeedbackResponse(
        id=new_feedback.id,
        patient_id=new_feedback.patient_id,
        doctor_id=new_feedback.doctor_id,
        category_id=new_feedback.category_id,
        rating=new_feedback.rating,
        comment=new_feedback.comment,
        created_at=new_feedback.created_at.isoformat(),
        category=FeedbackCategoryResponse(id=category.id, name=category.name),
        doctor=DoctorResponse(
            id=doctor.id,
            name=doctor.name or "Unknown",
            specialty=doctor.specialty or "N/A",
            email=doctor.email or "N/A",
            is_active=doctor.is_active if doctor.is_active is not None else True,
            patientCount=0,
            averageRating=0.0
        ),
        patient=PatientResponse(
            id=patient.id,
            first_name=patient.first_name or "Unknown",
            last_name=patient.last_name or "Unknown",
            email=patient.email or "N/A",
            phone_number=patient.phone_number or "N/A",
            created_at=patient.created_at.isoformat() if patient.created_at else datetime.utcnow().isoformat(),
            is_active=patient.is_active if patient.is_active is not None else True
        )
    )