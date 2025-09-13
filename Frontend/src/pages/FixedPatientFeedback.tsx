// This is a focused fix for the handleSubmitFeedback function in PatientDashboard.tsx
// The issue is with the feedback submission payload structure:
// - It's using 'patient_name' but the API expects 'patient_id'
// - It's using 'doctor_name' but the API expects 'doctor_id'

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface FeedbackFormType {
  category: string;
  additionalCategories: string[];
  doctor: string;
  rating: number;
  comment: string;
  isRecording: boolean;
}

interface DoctorType {
  id: string;
  name: string;
}

interface CategoryType {
  id: number;
  name: string;
}

const FixedPatientFeedback = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<DoctorType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormType>({
    category: "",
    additionalCategories: [],
    doctor: "",
    rating: 0,
    comment: "",
    isRecording: false
  });
  interface FeedbackHistoryItem {
    id: string;
    date: string;
    category: string;
    doctor: string;
    rating: number;
    comment: string;
    status: string;
  }
  
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackHistoryItem[]>([]);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.category || !feedbackForm.rating) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Medical Category and Rating)",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate feedback submission
    const duplicateCheck = feedbackHistory.some(fb => 
      fb.category === feedbackForm.category && 
      fb.doctor === feedbackForm.doctor && 
      fb.comment === feedbackForm.comment
    );
    
    if (duplicateCheck) {
      toast({
        title: "Duplicate Feedback",
        description: "You have already submitted similar feedback. Please modify your submission.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Ensure we have a patient_id, default to "1" if not found
      const patientId = localStorage.getItem("patient_id") || "1";
      if (!localStorage.getItem("patient_id")) {
        localStorage.setItem("patient_id", patientId);
      }
      
      const token = localStorage.getItem("authToken");
      if (!token) {
        // For demo, create a mock token if not available
        localStorage.setItem("authToken", "demo-token");
      }

      // Find selected category to get the ID
      let primaryCategoryId;
      const matchingCategory = categories.find(cat => cat.name === feedbackForm.category);
      if (matchingCategory) {
        primaryCategoryId = matchingCategory.id;
      } else {
        // If there's no exact match, use the first category or create a default ID
        primaryCategoryId = categories.length > 0 ? categories[0].id : 1;
      }

      // Create payload with the correct structure matching backend expectations
      const payload = {
        // Use patient_id instead of patient_name
        patient_id: parseInt(patientId),
        category_id: primaryCategoryId,
        rating: feedbackForm.rating,
        comment: feedbackForm.comment
      };
      
      // Add doctor_id only if a doctor was selected (making it optional)
      if (feedbackForm.doctor) {
        // Find selected doctor to get the ID
        const selectedDoctor = doctors.find(doc => doc.name === feedbackForm.doctor);
        if (selectedDoctor) {
          payload.doctor_id = parseInt(selectedDoctor.id);
        }
      }

      console.log("Submitting feedback payload:", payload);
      
      const response = await fetch(`${backendUrl}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to submit feedback: ${errorData.detail || response.statusText} (Status: ${response.status})`);
      }
      
      const newFeedback = await response.json();

      // Find selected doctor name for the history entry
      let doctorName = "General Feedback";
      if (payload.doctor_id) {
        const selectedDoctor = doctors.find(doc => parseInt(doc.id) === payload.doctor_id);
        doctorName = selectedDoctor ? selectedDoctor.name : "Unknown Doctor";
      }

      setFeedbackHistory(prev => [
        ...prev,
        {
          id: newFeedback.id.toString(),
          date: new Date().toISOString().split("T")[0],
          category: categories.find(cat => cat.id === newFeedback.category_id)?.name || "N/A",
          doctor: doctorName,
          rating: newFeedback.rating,
          comment: newFeedback.comment,
          status: newFeedback.rating <= 2 ? "Negative" : (newFeedback.rating === 3 ? "Neutral" : "Positive")
        }
      ]);

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback. It helps us improve our services."
      });

      setFeedbackForm({
        category: "",
        additionalCategories: [],
        doctor: "",
        rating: 0,
        comment: "",
        isRecording: false
      });
    } catch (error: unknown) {
      console.error("Feedback submission error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error",
        description: `Failed to submit feedback: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* This is just a placeholder component to hold the fixed function */}
      <p>This is a component with the fixed feedback submission function.</p>
    </div>
  );
};

export default FixedPatientFeedback;