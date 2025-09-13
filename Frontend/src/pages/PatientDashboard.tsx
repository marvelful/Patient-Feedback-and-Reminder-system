import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Heart, MessageSquare, Calendar, Star, Mic, Send, Clock, User,
  Phone, History, Pill, Headphones, Menu, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useTranslation } from "@/context/TranslationContext";

interface FeedbackForm {
  category: string;
  additionalCategories: { id: number; name: string }[];
  doctor: string;
  rating: number;
  comment: string;
  isRecording: boolean;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

interface Feedback {
  id: string;
  date: string;
  category: string;
  doctor: string;
  rating: number;
  comment: string;
  status: string;
}

interface Category {
  id: number;
  name: string;
}

const PatientDashboard = () => {
  const { translate } = useTranslation();
  const [activeTab, setActiveTab] = useState("submit");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>({
    category: "",
    additionalCategories: [],
    doctor: "",
    rating: 0,
    comment: "",
    isRecording: false
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<Feedback[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [userName, setUserName] = useState("");
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      setSidebarOpen(!isMobileView);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${backendUrl}/feedback/feedback_categories`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
            "Accept": "application/json"
          }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to fetch categories: ${errorData.detail || response.statusText}`);
        }
        const data = await response.json();
        setCategories(data.map((cat: any) => ({
          id: cat.id,
          name: cat.name
        })));
      } catch (error: any) {
        console.error("Fetch categories error:", error);
        toast({
          title: "Error",
          description: `Failed to load categories: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [toast, backendUrl]);

  // Fetch doctors by specialty
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!feedbackForm.category) return;
      setLoading(true);
      try {
        const response = await fetch(`${backendUrl}/doctor?specialty=${encodeURIComponent(feedbackForm.category)}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
            "Accept": "application/json"
          }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to fetch doctors: ${errorData.detail || response.statusText}`);
        }
        const data = await response.json();
        setDoctors(data.map((doc: any) => ({
          id: doc.id.toString(),
          name: doc.name,
          specialty: doc.specialty
        })));
      } catch (error: any) {
        console.error("Fetch doctors error:", error);
        toast({
          title: "Error",
          description: `Failed to load doctors: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, [feedbackForm.category, toast, backendUrl]);

  // Fetch feedback history
  useEffect(() => {
    const fetchFeedbackHistory = async () => {
      setLoading(true);
      try {
        // Default to "1" if patient_id not found in localStorage
        const patientId = localStorage.getItem("patient_id") || "1";
        // Store the patient ID for future use if it's not already there
        if (!localStorage.getItem("patient_id")) {
          localStorage.setItem("patient_id", patientId);
        }
        
        try {
          // Make request with proper patient_id parameter - ensuring we only get this patient's feedback
          const response = await fetch(`${backendUrl}/feedback?patient_id=${patientId}`, {
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
              "Accept": "application/json"
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch feedback: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // Store the patientId-specific feedback key for better data isolation
          const storageKey = `feedbackHistory_${patientId}`;
          localStorage.setItem(storageKey, JSON.stringify(data));
          
          setFeedbackHistory(data.map((fb: any) => ({
            id: fb.id.toString(),
            date: fb.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
            category: fb.category?.name || "N/A",
            doctor: fb.doctor?.name || "Unknown",
            rating: fb.rating || 0,
            comment: fb.comment || "No comment",
            status: fb.rating <= 2 ? "Negative" : (fb.rating === 3 ? "Neutral" : "Positive")
          })));
        } catch (error) {
          console.warn("API request failed, checking localStorage for cached data");
          // Try to load from localStorage if API fails - using patient-specific key
          const storageKey = `feedbackHistory_${patientId}`;
          const savedFeedback = localStorage.getItem(storageKey);
          
          if (savedFeedback) {
            const parsedFeedback = JSON.parse(savedFeedback);
            setFeedbackHistory(parsedFeedback.map((fb: any) => ({
              id: fb.id.toString(),
              date: fb.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
              category: fb.category?.name || "N/A",
              doctor: fb.doctor?.name || "Unknown",
              rating: fb.rating || 0,
              comment: fb.comment || "No comment",
              status: fb.rating <= 2 ? "Negative" : (fb.rating === 3 ? "Neutral" : "Positive")
            })));
          } else {
            // If we have no cached data for this specific patient, start with empty array
            setFeedbackHistory([]);
          }
        }
      } catch (error: any) {
        console.error("Fetch feedback history error:", error);
        // Don't show toast for this error as it might be expected during initial setup
        setFeedbackHistory([]); // Set empty array instead of showing error
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbackHistory();
  }, [toast, backendUrl]);

  const staticCategories = [
    { value: "Cardiology", label: "Cardiology" },
    { value: "Neurology", label: "Neurology" },
    { value: "Pediatrics", label: "Pediatrics" },
    { value: "Orthopedics", label: "Orthopedics" },
    { value: "General Medicine", label: "General Medicine" },
    { value: "Surgery", label: "Surgery" }
  ];

  // Initialize with empty medications (will be populated from doctor-prescribed medications)
  const [medications, setMedications] = useState([]);

  // Fetch medications from the API
  useEffect(() => {
    const fetchMedications = async () => {
      // Get patient ID from localStorage
      const patientId = localStorage.getItem("patient_id");
      if (!patientId) return; // Exit if no patient ID
      
      setLoading(true);
      try {
        // Try to get medications from the API
        const response = await fetch(`${backendUrl}/medications?patient_id=${patientId}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
            "Accept": "application/json"
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setMedications(data);
            // Store in localStorage with patient-specific key
            localStorage.setItem(`medications_${patientId}`, JSON.stringify(data));
          }
        } else {
          throw new Error("API failed");
        }
      } catch (error) {
        console.error("Error fetching medications:", error);
        // Try to load from localStorage if API throws error
        const cachedMedications = localStorage.getItem(`medications_${patientId}`);
        
        // Check if there are any global medications (added by doctors)
        const globalMedications = JSON.parse(localStorage.getItem('medications') || '[]');
        const patientMedications = globalMedications.filter(med => med.patient_id == patientId);
        
        // Deduplicate medications by ID
        const existingMeds = cachedMedications ? JSON.parse(cachedMedications) : [];
        const allMeds = [...existingMeds, ...patientMedications];
        
        // Remove duplicates by creating a map with ID as key
        const uniqueMedsMap = new Map();
        allMeds.forEach(med => {
          uniqueMedsMap.set(med.id, med);
        });
        
        const uniqueMeds = Array.from(uniqueMedsMap.values());
        setMedications(uniqueMeds);
        
        // Update localStorage with deduplicated list
        localStorage.setItem(`medications_${patientId}`, JSON.stringify(uniqueMeds));
      } finally {
        setLoading(false);
      }
    };
    
    fetchMedications();
  }, [backendUrl]);

  // Initialize with empty appointments (will be populated from doctor-created appointments)
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  
  // Fetch appointments from the API
  useEffect(() => {
    const fetchAppointments = async () => {
      const patientId = localStorage.getItem("patient_id");
      if (!patientId) return; // Exit if no patient ID
      
      setLoading(true);
      try {
        const response = await fetch(`${backendUrl}/appointments?patient_id=${patientId}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
            "Accept": "application/json"
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setUpcomingAppointments(data);
            // Store in localStorage with patient-specific key
            localStorage.setItem(`appointments_${patientId}`, JSON.stringify(data));
          }
        } else {
          throw new Error("API failed");
        }
      } catch (error) {
        console.error("Error fetching appointments:", error);
        // Try to load from localStorage if API throws error
        const cachedAppointments = localStorage.getItem(`appointments_${patientId}`);
        
        // Check if there are any global appointments (added by doctors)
        const globalAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        const patientAppointments = globalAppointments.filter(apt => apt.patient_id == patientId);
        
        // Deduplicate appointments by ID
        const existingAppts = cachedAppointments ? JSON.parse(cachedAppointments) : [];
        const allAppts = [...existingAppts, ...patientAppointments];
        
        // Remove duplicates by creating a map with ID as key
        const uniqueApptsMap = new Map();
        allAppts.forEach(appt => {
          uniqueApptsMap.set(appt.id, appt);
        });
        
        const uniqueAppts = Array.from(uniqueApptsMap.values());
        setUpcomingAppointments(uniqueAppts);
        
        // Update localStorage with deduplicated list
        localStorage.setItem(`appointments_${patientId}`, JSON.stringify(uniqueAppts));
      } finally {
        setLoading(false);
      }
    };
    
    fetchAppointments();
  }, [backendUrl]);

  const handleRatingChange = (rating: number) => {
    setFeedbackForm(prev => ({ ...prev, rating }));
  };

  const handleVoiceRecording = () => {
    const isCurrentlyRecording = feedbackForm.isRecording;
    setFeedbackForm(prev => ({ ...prev, isRecording: !prev.isRecording }));
    
    if (!isCurrentlyRecording) {
      // Start recording
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({
          title: "Speech Recognition Not Available",
          description: "Your browser doesn't support speech recognition. Try using Chrome, Edge, or Safari.",
          variant: "destructive"
        });
        setFeedbackForm(prev => ({ ...prev, isRecording: false }));
        return;
      }
      
      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-US'; // Default language
      recognition.continuous = true;
      recognition.interimResults = true;
      
      let finalTranscript = feedbackForm.comment;
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update comment with transcribed text
        setFeedbackForm(prev => ({ 
          ...prev, 
          comment: finalTranscript + interimTranscript 
        }));
      };
      
      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        toast({
          title: "Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive"
        });
        setFeedbackForm(prev => ({ ...prev, isRecording: false }));
        recognition.stop();
      };
      
      recognition.onend = () => {
        if (feedbackForm.isRecording) {
          // If still in recording state but recognition ended, restart it
          recognition.start();
        }
      };
      
      // Start recognition
      recognition.start();
      
      // Store recognition instance in window to access it when stopping
      window.speechRecognition = recognition;
      
      toast({
        title: "Recording Started",
        description: "Speak your feedback now. Click again to stop recording."
      });
    } else {
      // Stop recording
      if (window.speechRecognition) {
        window.speechRecognition.stop();
        window.speechRecognition = null;
      }
      
      toast({
        title: "Recording Stopped",
        description: "Your speech has been converted to text."
      });
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    const selectedCategory = categories.find(cat => cat.id.toString() === categoryId);
    if (!selectedCategory) return;
    setFeedbackForm(prev => {
      if (prev.additionalCategories.some(cat => cat.id === selectedCategory.id)) {
        return {
          ...prev,
          additionalCategories: prev.additionalCategories.filter(cat => cat.id !== selectedCategory.id)
        };
      }
      return {
        ...prev,
        additionalCategories: [...prev.additionalCategories, selectedCategory]
      };
    });
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.rating) {
      toast({
        title: "Missing Information",
        description: "Please provide a rating",
        variant: "destructive"
      });
      return;
    }

    // Check if we have categories available to select from
    if (categories.length === 0) {
      toast({
        title: "System Error",
        description: "No feedback categories available. Please try again later.",
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
      } else if (feedbackForm.additionalCategories.length > 0) {
        // Use first additional category if no primary category
        primaryCategoryId = feedbackForm.additionalCategories[0].id;
      } else {
        // Default to first category in the database if available
        primaryCategoryId = categories.length > 0 ? categories[0].id : 1;
        
        // Log this for debugging
        console.log("Using default category ID:", primaryCategoryId);
      }

      // Create payload with the correct structure matching backend expectations
      const payload = {
        // Use patient_id as expected by the backend
        patient_id: parseInt(patientId),
        // Only include doctor_id if a doctor is selected, otherwise use default doctor ID 1
        doctor_id: feedbackForm.doctor ? 
          parseInt(doctors.find(doc => doc.name === feedbackForm.doctor)?.id || "1") : 
          1, // Default doctor ID instead of null
        category_id: primaryCategoryId,
        rating: feedbackForm.rating,
        comment: feedbackForm.comment,
        // Flag to indicate if this feedback is general (not for specific doctor)
        is_general: !feedbackForm.doctor
      };

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
        console.log("Error response from server details:", JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to submit feedback: ${JSON.stringify(errorData)} (Status: ${response.status})`);
      }
      
      const newFeedback = await response.json();
      console.log("Feedback submission successful:", newFeedback);

      // Add to feedback history with proper status based on rating (1-2 negative, 3 neutral, 4-5 positive)
      const feedbackStatus = newFeedback.rating <= 2 ? "Negative" : (newFeedback.rating === 3 ? "Neutral" : "Positive");

      setFeedbackHistory(prev => [
        ...prev,
        {
          id: newFeedback.id.toString(),
          date: new Date(newFeedback.created_at).toISOString().split("T")[0],
          category: categories.find(cat => cat.id === newFeedback.category_id)?.name || "N/A",
          doctor: feedbackForm.doctor || "General Feedback",
          rating: newFeedback.rating,
          comment: newFeedback.comment,
          status: feedbackStatus
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

      console.log("Feedback submitted successfully");
    } catch (error: any) {
      console.error("Feedback submission error:", error);
      toast({
        title: "Error",
        description: `Failed to submit feedback: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Reminders have been removed as patients shouldn't create reminders themselves
  // Reminders will be managed by doctors when prescribing medications

  const handleContactSupport = () => {
    toast({
      title: "Support Message Sent",
      description: "Our support team will respond within 24 hours."
    });
  };

  const navItems = [
    { id: "submit", label: "Submit Feedback", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "history", label: "Feedback History", icon: <History className="h-4 w-4" /> },
    { id: "appointments", label: "Appointments", icon: <Calendar className="h-4 w-4" /> },
    { id: "medications", label: "Medication", icon: <Pill className="h-4 w-4" /> },
    { id: "support", label: "Contact Support", icon: <Headphones className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout userRole="patient" userName={userName}>
      <div className="flex">
        <Button
          variant="ghost"
          className="md:hidden fixed top-20 left-4 z-50 p-2 rounded-full shadow-md bg-white dark:bg-gray-800"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>

        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
          fixed md:sticky
          top-0
          w-64 h-full
          transition-transform duration-300 ease-in-out
          bg-background border-r
          z-40
        `}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center mb-6 ">
              <Heart className="h-6 w-6 text-primary mr-2" />
              <span className="text-lg font-semibold">Patient Portal</span>
            </div>
            <div className="space-y-1 flex-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveTab(item.id);
                    if (isMobile) setSidebarOpen(false);
                  }}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {sidebarOpen && isMobile && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 transition-all duration-300">
          <div className="p-4 md:p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{translate("Patient Dashboard")}</h1>
                  <p className="text-muted-foreground">{translate("Manage your healthcare feedback and appointments")}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="h-8 w-8 text-primary" />
                  <span className="text-lg font-semibold">DGH Care</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">{translate("Total Feedback")}</p>
                        <p className="text-2xl font-bold">{feedbackHistory.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-8 w-8 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">{translate("Doctor Appointments")}</p>
                        <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <Pill className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Prescribed Medications</p>
                        <p className="text-2xl font-bold">{medications.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {activeTab === "submit" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5" />
                      <span>{translate("Submit Feedback")}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{translate("Medical Department")}</label>
                        <Select onValueChange={(value) => setFeedbackForm(prev => ({ ...prev, category: value, doctor: "" }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {staticCategories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">{translate("Feedback Category")}</label>
                        <Select onValueChange={handleCategoryChange} disabled={loading}>
                          <SelectTrigger>
                            <SelectValue placeholder={loading ? "Loading categories..." : "Select categories"} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {feedbackForm.additionalCategories.map(cat => (
                            <Badge
                              key={cat.id}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {cat.name}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                                onClick={() => handleCategoryChange(cat.id.toString())}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Doctor (Optional)</label>
                        <Select
                          onValueChange={(value) => setFeedbackForm(prev => ({ ...prev, doctor: value }))}
                          disabled={!feedbackForm.category || loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loading ? "Loading doctors..." : "Optional - Select doctor"} />
                          </SelectTrigger>
                          <SelectContent>
                            {doctors.map(doctor => (
                              <SelectItem key={doctor.id} value={doctor.name}>
                                {doctor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Leave empty for general feedback about the hospital/service
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">{translate("Rating")}</label>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Button
                            key={star}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRatingChange(star)}
                            className="p-1"
                          >
                            <Star
                              className={`h-6 w-6 ${star <= feedbackForm.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
                            />
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">{translate("Comments")}</label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleVoiceRecording}
                          className={feedbackForm.isRecording ? "text-destructive border-destructive" : ""}
                          disabled={loading}
                        >
                          <Mic className="h-4 w-4 mr-2" />
                          {feedbackForm.isRecording ? translate("Stop Recording") : translate("Voice Input")}
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Share your experience with the doctor and hospital services..."
                        value={feedbackForm.comment}
                        onChange={(e) => setFeedbackForm(prev => ({ ...prev, comment: e.target.value }))}
                        rows={4}
                        disabled={loading}
                      />
                    </div>

                    <Button onClick={handleSubmitFeedback} variant="healthcare" className="w-full" disabled={loading}>
                      <Send className="h-4 w-4 mr-2" />
                      {translate("Submit Feedback")}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeTab === "history" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Feedback History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {feedbackHistory.length > 0 ? (
                        feedbackHistory.map(feedback => (
                          <div key={feedback.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <User className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{feedback.doctor}</p>
                                  <p className="text-sm text-muted-foreground">{feedback.category}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex flex-col items-end">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <Star
                                        key={star}
                                        className={`h-4 w-4 ${star <= feedback.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
                                      />
                                    ))}
                                  </div>
                                  <span className={`text-xs font-medium ${
                                    feedback.rating <= 2 ? 'text-red-500' : 
                                    feedback.rating === 3 ? 'text-yellow-500' : 
                                    'text-green-500'
                                  }`}>
                                    {feedback.rating <= 2 ? 'Negative' : feedback.rating === 3 ? 'Neutral' : 'Positive'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-muted-foreground">{feedback.comment}</p>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{feedback.date}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">No feedback history available.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "appointments" && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Appointments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {upcomingAppointments.map(appointment => (
                          <div key={appointment.id} className="border rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {appointment.doctor_name || "Doctor"} 
                                {appointment.category && ` - ${appointment.category}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {appointment.date} at {appointment.time}
                              </p>
                              {appointment.description && (
                                <p className="text-sm italic mt-1">{appointment.description || appointment.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "medications" && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Medications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {medications.map(medication => (
                          <div key={medication.id} className="border rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{medication.medication} - {medication.dosage}</p>
                              <p className="text-sm text-muted-foreground">
                                {medication.frequency}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {medication.instructions}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Reminders tab has been removed as patients shouldn't create reminders themselves */}

              {activeTab === "support" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Phone className="h-5 w-5" />
                      <span>Contact Support</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Card className="p-4 bg-muted/30">
                        <div className="text-center space-y-2">
                          <Phone className="h-8 w-8 text-primary mx-auto" />
                          <h3 className="font-semibold">Emergency Hotline</h3>
                          <p className="text-muted-foreground">+237 233 40 10 00</p>
                        </div>
                      </Card>

                      <Card className="p-4 bg-muted/30">
                        <div className="text-center space-y-2">
                          <MessageSquare className="h-8 w-8 text-secondary mx-auto" />
                          <h3 className="font-semibold">General Support</h3>
                          <p className="text-muted-foreground">support@dghcare.cm</p>
                        </div>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Message</label>
                        <Textarea
                          placeholder="Describe your issue or question..."
                          rows={5}
                        />
                      </div>
                      <Button onClick={handleContactSupport} variant="healthcare" className="w-full">
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientDashboard;