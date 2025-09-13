from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Doctor, Patient, Appointment, Feedback
from typing import List, Dict
from pydantic import BaseModel
from sqlalchemy import func

router = APIRouter(prefix="/statistics", tags=["Statistics"])

class DepartmentStats(BaseModel):
    name: str
    avgRating: float
    patients: int
    doctors: int

class HospitalStats(BaseModel):
    title: str
    value: str
    change: str
    trend: str
    icon: Dict

class DoctorStats(BaseModel):
    totalDoctors: int
    averageRating: float
    topPerformers: List[Dict]
    specialties: List[Dict]

class TreatmentOutcomes(BaseModel):
    name: str
    value: int

class PatientAdmissionsData(BaseModel):
    name: str
    emergency: int
    scheduled: int

@router.get("/departments", response_model=List[DepartmentStats])
def get_department_stats(db: Session = Depends(get_db)):
    """Get department performance statistics"""
    # Get all doctors grouped by specialty
    specialties = db.query(Doctor.specialty, func.count(Doctor.id)).group_by(Doctor.specialty).all()
    
    # For now, we'll create mock data based on specialties since we don't have a departments table
    departments = []
    for specialty, count in specialties:
        # Get average rating for doctors in this specialty from feedback
        avg_rating = db.query(func.avg(Feedback.rating)).join(Doctor).filter(Doctor.specialty == specialty).scalar()
        if avg_rating is None:
            avg_rating = 0.0
        else:
            avg_rating = float(avg_rating)
        
        # Get number of patients who had appointments with doctors in this specialty
        patient_count = db.query(func.count(Appointment.patient_id.distinct())).join(Doctor).filter(Doctor.specialty == specialty).scalar()
        
        departments.append({
            "name": specialty,
            "avgRating": round(avg_rating, 1),
            "patients": patient_count,
            "doctors": count
        })
    
    return departments

@router.get("/hospital", response_model=List[HospitalStats])
def get_hospital_stats(db: Session = Depends(get_db)):
    """Get overall hospital statistics"""
    # Get total patients
    total_patients = db.query(func.count(Patient.id)).scalar()
    
    # Get total appointments
    total_appointments = db.query(func.count(Appointment.id)).scalar()
    
    # Get average feedback rating
    avg_rating = db.query(func.avg(Feedback.rating)).scalar()
    if avg_rating is None:
        avg_rating = 0.0
    else:
        avg_rating = float(avg_rating)
    
    stats = [
        {
            "title": "Total Patients",
            "value": f"{total_patients:,}",
            "change": "+0%",
            "trend": "up",
            "icon": {
                "path": "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
                "bgColor": "bg-blue-500"
            }
        },
        {
            "title": "Appointments",
            "value": f"{total_appointments:,}",
            "change": "+0%",
            "trend": "up",
            "icon": {
                "path": "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
                "bgColor": "bg-green-500"
            }
        },
        {
            "title": "Average Stay",
            "value": "3.2 days",
            "change": "-0.5 days",
            "trend": "up",
            "icon": {
                "path": "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                "bgColor": "bg-purple-500"
            }
        },
        {
            "title": "Patient Satisfaction",
            "value": f"{round(avg_rating * 20, 1)}%",  # Convert 5-point scale to percentage
            "change": "+0%",
            "trend": "up",
            "icon": {
                "path": "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                "bgColor": "bg-indigo-500"
            }
        }
    ]
    
    return stats

@router.get("/doctors", response_model=DoctorStats)
def get_doctor_stats(db: Session = Depends(get_db)):
    """Get doctor statistics"""
    # Get total doctors
    total_doctors = db.query(func.count(Doctor.id)).scalar()
    
    # Get average rating from feedback
    avg_rating = db.query(func.avg(Feedback.rating)).scalar()
    if avg_rating is None:
        avg_rating = 0.0
    else:
        avg_rating = float(avg_rating)
    
    # Get top performers (doctors with highest average ratings)
    top_performers_query = db.query(
        Doctor.name,
        Doctor.specialty,
        func.avg(Feedback.rating).label('avg_rating')
    ).join(Feedback, Feedback.doctor_id == Doctor.id).group_by(Doctor.id).order_by(func.avg(Feedback.rating).desc()).limit(3)
    
    top_performers = []
    for doctor in top_performers_query:
        top_performers.append({
            "name": doctor.name,
            "specialty": doctor.specialty,
            "rating": round(float(doctor.avg_rating), 1)
        })
    
    # Get specialties count
    specialties_query = db.query(Doctor.specialty, func.count(Doctor.id)).group_by(Doctor.specialty).all()
    specialties = [{"name": specialty, "count": count} for specialty, count in specialties_query]
    
    return {
        "totalDoctors": total_doctors,
        "averageRating": round(avg_rating, 1),
        "topPerformers": top_performers,
        "specialties": specialties
    }

@router.get("/treatment-outcomes", response_model=List[TreatmentOutcomes])
def get_treatment_outcomes(db: Session = Depends(get_db)):
    """Get treatment outcomes statistics"""
    # For now, we'll create mock data since we don't have treatment outcome tracking
    outcomes = [
        {"name": "Successful", "value": 76},
        {"name": "Partial Improvement", "value": 15},
        {"name": "No Change", "value": 6},
        {"name": "Complications", "value": 3}
    ]
    
    return outcomes

@router.get("/patient-admissions", response_model=List[PatientAdmissionsData])
def get_patient_admissions(db: Session = Depends(get_db)):
    """Get patient admissions data"""
    # For now, we'll create mock data since we don't have monthly admission tracking
    admissions_data = [
        {"name": "Jan", "emergency": 124, "scheduled": 185},
        {"name": "Feb", "emergency": 115, "scheduled": 178},
        {"name": "Mar", "emergency": 135, "scheduled": 189},
        {"name": "Apr", "emergency": 128, "scheduled": 195},
        {"name": "May", "emergency": 144, "scheduled": 203},
        {"name": "Jun", "emergency": 155, "scheduled": 211},
        {"name": "Jul", "emergency": 138, "scheduled": 204}
    ]
    
    return admissions_data