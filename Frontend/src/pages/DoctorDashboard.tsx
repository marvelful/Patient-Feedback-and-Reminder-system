import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar as CalendarIcon, 
  Star, 
  User, 
  Clock, 
  Pill, 
  MessageSquare, 
  Plus, 
  Search, 
  Send, 
  Phone,
  Menu,
  ClipboardList,
  Stethoscope
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

// Define TypeScript interfaces for our state data
interface Patient {
  id: string;
  name: string;
  email: string;
}

interface FeedbackItem {
  id: string;
  patient_name: string;
  category: string;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
}

interface Appointment {
  id: string;
  patient_id: number;
  doctor_id: number;
  patient_name: string;
  date: string;
  time: string;
  description: string;
  status: string;
}

interface Medication {
  id: string;
  patient_id?: number;
  doctor_id?: number;
  patient_name: string;
  medication: string;
  dosage: string;
  frequency: string;
  instructions: string;
}

interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
}

const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState("feedback");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [patientFeedback, setPatientFeedback] = useState<FeedbackItem[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointmentForm, setAppointmentForm] = useState({
    patientName: "",
    date: "",
    time: "",
    description: "",
    status: "Pending"
  });
  const [medicationForm, setMedicationForm] = useState({
    patientName: "",
    medication: "",
    dosage: "",
    frequency: "",
    instructions: ""
  });
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [medicationSearch, setMedicationSearch] = useState("");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({ id: "", name: "", specialty: "" });
  const [patients, setPatients] = useState<Patient[]>([]);
  const { toast } = useToast();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
  
  // Fetch patients list for the dropdown
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem("authToken") || "demo-token";
        const response = await fetch(`${backendUrl}/patients`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Store patients data for dropdowns
          setPatients(data.map((patient: { id: number | string; first_name?: string; last_name?: string; email: string }) => ({
            id: patient.id.toString(),
            name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || "Patient",
            email: patient.email
          })));
          localStorage.setItem("patientsList", JSON.stringify(data));
        } else {
          console.warn("Failed to fetch patients list, checking localStorage");
          // Try to get from localStorage
          const cachedPatients = localStorage.getItem("patientsList");
          if (cachedPatients) {
            const parsedPatients = JSON.parse(cachedPatients);
            setPatients(parsedPatients.map((patient: { id: number | string; first_name?: string; last_name?: string; email: string }) => ({
              id: patient.id.toString(),
              name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || "Patient",
              email: patient.email
            })));
          } else {
            // Default mock data
            setPatients([
              { id: "1", name: "John Smith", email: "john.smith@example.com" },
              { id: "2", name: "Maria Lopez", email: "maria.lopez@example.com" },
              { id: "3", name: "Alex Johnson", email: "alex.johnson@example.com" }
            ]);
          }
        }
      } catch (error) {
        console.error("Error fetching patients:", error);
        // Set some default data
        setPatients([
          { id: "1", name: "John Smith", email: "john.smith@example.com" },
          { id: "2", name: "Maria Lopez", email: "maria.lopez@example.com" },
          { id: "3", name: "Alex Johnson", email: "alex.johnson@example.com" }
        ]);
      }
    };
    
    fetchPatients();
  }, [backendUrl]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken");
        const doctorEmail = localStorage.getItem("doctorEmail");
        const doctorId = localStorage.getItem("doctorId");
        const doctorName = localStorage.getItem("doctorName");
        const doctorSpecialty = localStorage.getItem("doctorSpecialty");

        // First check if we have user data in the localStorage (from login)
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        // If we have user data from login and it's a doctor role
        if (storedUser && storedUser.id && storedUser.name && storedUser.role === 'doctor') {
          console.log("Using doctor data from login session:", storedUser);
          
          // Save doctor details in localStorage using the expected keys
          localStorage.setItem("doctorId", storedUser.id.toString());
          localStorage.setItem("doctorName", storedUser.name);
          localStorage.setItem("doctorSpecialty", storedUser.specialty || "General Medicine");
          
          // Update profile state
          setDoctorProfile({
            id: storedUser.id.toString(),
            name: storedUser.name,
            specialty: storedUser.specialty || "General Medicine"
          });
        }
        // If we don't have doctor info, use a fallback for demo
        else if (!doctorId || !doctorName || !doctorSpecialty) {
          console.log("Fetching doctor profile data from backend...");
          try {
            // Attempt to get doctor profile from server
            const profileRes = await fetch(`${backendUrl}/doctor/profile?email=${encodeURIComponent(doctorEmail || "doctor@example.com")}`, {
              headers: {
                "Accept": "application/json"
              }
            });
            
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              console.log("Fetched doctor profile:", profileData);
              
              // Save doctor details in localStorage
              localStorage.setItem("doctorId", profileData.id.toString());
              localStorage.setItem("doctorName", profileData.name);
              localStorage.setItem("doctorSpecialty", profileData.specialty);
              
              // Update profile state
              setDoctorProfile({
                id: profileData.id.toString(),
                name: profileData.name,
                specialty: profileData.specialty
              });
            } else {
              console.error("Failed to fetch doctor profile, using demo data");
              
              // Use demo data if profile fetch fails
              const demoId = doctorId || "1";
              const demoName = "Dr. Demo Account";
              const demoSpecialty = "General Medicine";
              
              localStorage.setItem("doctorId", demoId);
              localStorage.setItem("doctorName", demoName);
              localStorage.setItem("doctorSpecialty", demoSpecialty);
              
              setDoctorProfile({
                id: demoId,
                name: demoName,
                specialty: demoSpecialty
              });
            }
          } catch (error) {
            console.error("Error fetching doctor profile:", error);
            
            // Use demo data as fallback
            const demoId = doctorId || "1";
            const demoName = "Dr. Demo Account";
            const demoSpecialty = "General Medicine";
            
            localStorage.setItem("doctorId", demoId);
            localStorage.setItem("doctorName", demoName);
            localStorage.setItem("doctorSpecialty", demoSpecialty);
            
            setDoctorProfile({
              id: demoId,
              name: demoName,
              specialty: demoSpecialty
            });
          }
        } else {
          // Use existing data from localStorage
          setDoctorProfile({
            id: doctorId,
            name: doctorName,
            specialty: doctorSpecialty
          });
        }

        // Ensure we have a token
        if (!token) {
          localStorage.setItem("authToken", "demo-token");
        }

        // Get the doctor ID to use (now should be set either from localStorage or from API)
        const doctorIdToUse = localStorage.getItem("doctorId") || "1";
        
        // Doctor-specific storage key
        const storageKey = `doctorFeedback_${doctorIdToUse}`;

        // Fetch feedback filtered by doctor_id
        try {
          const feedbackRes = await fetch(`${backendUrl}/feedback?doctor_id=${doctorIdToUse}`, {
            headers: {
              "Authorization": `Bearer ${token || "demo-token"}`,
              "Accept": "application/json"
            }
          });
          
          if (feedbackRes.ok) {
            const feedbackData = await feedbackRes.json();
            console.log("Fetched feedback:", feedbackData);
            
            // Store feedback in localStorage for persistence with doctor-specific key
            localStorage.setItem(storageKey, JSON.stringify(feedbackData));
            
            if (feedbackData.length > 0) {
              setPatientFeedback(feedbackData.map((fb: { 
                id: string | number; 
                patient?: { 
                  first_name?: string; 
                  last_name?: string; 
                };
                category?: { 
                  name: string 
                };
                rating?: number;
                comment?: string;
                created_at?: string;
              }) => ({
                id: fb.id.toString(),
                patient_name: fb.patient ? `${fb.patient.first_name || ''} ${fb.patient.last_name || ''}`.trim() || "Anonymous Patient" : "Anonymous Patient",
                category: fb.category ? fb.category.name : "N/A",
                rating: fb.rating || 0,
                comment: fb.comment || "No comment",
                status: fb.rating >= 4 ? "Reviewed" : "Pending",
                created_at: fb.created_at?.split("T")[0] || new Date().toISOString().split("T")[0]
              })));
            } else {
              setPatientFeedback([]);
            }
          } else {
            throw new Error("Failed to fetch feedback from API");
          }
        } catch (error) {
          console.warn("API feedback request failed, checking localStorage", error);
          
          // Try to load from localStorage if API fails
          const savedFeedback = localStorage.getItem(storageKey);
          if (savedFeedback) {
            const parsedFeedback = JSON.parse(savedFeedback);
            if (parsedFeedback.length > 0) {
              setPatientFeedback(parsedFeedback.map((fb: { 
                id: string | number; 
                patient?: { 
                  first_name?: string; 
                  last_name?: string; 
                };
                category?: { 
                  name: string 
                };
                rating?: number;
                comment?: string;
                created_at?: string;
              }) => ({
                id: fb.id.toString(),
                patient_name: fb.patient ? `${fb.patient.first_name || ''} ${fb.patient.last_name || ''}`.trim() || "Anonymous Patient" : "Anonymous Patient",
                category: fb.category ? fb.category.name : "N/A",
                rating: fb.rating || 0,
                comment: fb.comment || "No comment",
                status: fb.rating >= 4 ? "Reviewed" : "Pending",
                created_at: fb.created_at?.split("T")[0] || new Date().toISOString().split("T")[0]
              })));
            } else {
              setPatientFeedback([]);
            }
          } else {
            // No feedback found in localStorage - start with empty array
            setPatientFeedback([]);
          }
        }

          try {
          // Try to fetch appointments and medications
          const [appointmentsRes, medsRes] = await Promise.all([
            fetch(`${backendUrl}/appointments?doctor_id=${doctorIdToUse}`, {
              headers: { 
                "Authorization": `Bearer ${token || "demo-token"}`, 
                "Accept": "application/json" 
              }
            }),
            fetch(`${backendUrl}/medications?doctor_id=${doctorIdToUse}`, {
              headers: { 
                "Authorization": `Bearer ${token || "demo-token"}`, 
                "Accept": "application/json" 
              }
            })
          ]);

          if (appointmentsRes.ok) {
            const appointmentsData = await appointmentsRes.json();
            setUpcomingAppointments(appointmentsData || []);
            localStorage.setItem("doctorAppointments", JSON.stringify(appointmentsData));
          } else {
            // Load from localStorage if API fails
            const savedAppointments = localStorage.getItem("doctorAppointments");
            if (savedAppointments) {
              setUpcomingAppointments(JSON.parse(savedAppointments));
            }
          }

          if (medsRes.ok) {
            const medsData = await medsRes.json();
            setMedications(medsData || []);
            localStorage.setItem("doctorMedications", JSON.stringify(medsData));
          } else {
            // Load from localStorage if API fails
            const savedMeds = localStorage.getItem("doctorMedications");
            if (savedMeds) {
              setMedications(JSON.parse(savedMeds));
            }
          }
        } catch (error) {
          console.warn("Error fetching appointments or medications:", error);
          // Default data will be used from state initialization
        }
      } catch (error: unknown) {
        console.error("API error:", error);
        toast({
          title: "API Error",
          description: "Failed to connect to backend services. Using demo data instead.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast, backendUrl]);

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

  const handleCreateAppointment = async () => {
    if (!appointmentForm.patientName || !appointmentForm.date || !appointmentForm.time || !appointmentForm.description || !appointmentForm.status) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const doctorId = localStorage.getItem("doctorId") || doctorProfile.id;
      
      if (!token) {
        localStorage.setItem("authToken", "demo-token");
      }

      // Find patient_id from selected patient name
      let patientId = "1"; // Default patient ID
      const selectedPatient = patients.find(p => p.name === appointmentForm.patientName);
      
      if (selectedPatient) {
        patientId = selectedPatient.id;
      } else {
        // If no match in dropdown, try to search by name as fallback
        try {
          const patientsRes = await fetch(`${backendUrl}/patients/search?name=${encodeURIComponent(appointmentForm.patientName)}`, {
            headers: {
              "Authorization": `Bearer ${token || "demo-token"}`,
              "Accept": "application/json"
            }
          });
          
          if (patientsRes.ok) {
            const patientData = await patientsRes.json();
            if (patientData && patientData.length > 0) {
              patientId = patientData[0].id.toString();
            }
          }
        } catch (error) {
          console.warn("Error searching for patient ID:", error);
          // Continue with default patient_id
        }
      }
      
      const payload = {
        patient_id: parseInt(patientId),
        doctor_id: parseInt(doctorId),
        patient_name: appointmentForm.patientName,
        date: appointmentForm.date,
        time: appointmentForm.time,
        description: appointmentForm.description,
        status: appointmentForm.status
      };
      
      try {
        const response = await fetch(`${backendUrl}/appointments/`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token || "demo-token"}`,
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const newAppointment = await response.json();
          // Update appointments list
          const updatedAppointments = [...upcomingAppointments, newAppointment];
          setUpcomingAppointments(updatedAppointments);
          
          // Save to localStorage for persistence
          localStorage.setItem("doctorAppointments", JSON.stringify(updatedAppointments));
          
          toast({
            title: "Appointment Created",
            description: `Appointment scheduled for ${appointmentForm.patientName} on ${appointmentForm.date}. SMS notification sent to patient.`
          });
        } else {
          throw new Error("API error");
        }
      } catch (error) {
        console.warn("API error, using local storage:", error);
        
        // Create a local appointment object with an ID
        const newAppointment = {
          id: Date.now().toString(),
          patient_id: parseInt(patientId),
          doctor_id: parseInt(doctorId),
          patient_name: appointmentForm.patientName,
          date: appointmentForm.date,
          time: appointmentForm.time,
          description: appointmentForm.description,
          status: appointmentForm.status
        };
        
        // Update appointments list
        const updatedAppointments = [...upcomingAppointments, newAppointment];
        setUpcomingAppointments(updatedAppointments);
        
        // Save to doctor-specific localStorage for persistence
        localStorage.setItem("doctorAppointments", JSON.stringify(updatedAppointments));
        
        // Also save to global appointments storage for patient to see
        const globalAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        globalAppointments.push(newAppointment);
        localStorage.setItem('appointments', JSON.stringify(globalAppointments));
        
        toast({
          title: "Appointment Created Locally",
          description: `Appointment scheduled for ${appointmentForm.patientName} on ${appointmentForm.date}. Could not send SMS notification.`
        });
      }
      
      // Reset the form
      setAppointmentForm({ patientName: "", date: "", time: "", description: "", status: "Pending" });
    } catch (error: unknown) {
      console.error("Appointment creation error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error",
        description: `Failed to create appointment: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = async () => {
    if (!medicationForm.patientName || !medicationForm.medication || !medicationForm.dosage || !medicationForm.frequency || !medicationForm.instructions) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const doctorId = localStorage.getItem("doctorId") || doctorProfile.id;
      
      if (!token) {
        localStorage.setItem("authToken", "demo-token");
      }

      // Find patient_id from selected patient name
      let patientId = "1"; // Default patient ID
      const selectedPatient = patients.find(p => p.name === medicationForm.patientName);
      
      if (selectedPatient) {
        patientId = selectedPatient.id;
      } else {
        // If no match in dropdown, try to search by name as fallback
        try {
          const patientsRes = await fetch(`${backendUrl}/patients/search?name=${encodeURIComponent(medicationForm.patientName)}`, {
            headers: {
              "Authorization": `Bearer ${token || "demo-token"}`,
              "Accept": "application/json"
            }
          });
          
          if (patientsRes.ok) {
            const patientData = await patientsRes.json();
            if (patientData && patientData.length > 0) {
              patientId = patientData[0].id.toString();
            }
          }
        } catch (error) {
          console.warn("Error searching for patient ID:", error);
          // Continue with default patient_id
        }
      }
      
      // Create medication payload with required IDs for proper database storage
      const medicationPayload = {
        patient_id: parseInt(patientId),
        doctor_id: parseInt(doctorId),
        patient_name: medicationForm.patientName,
        medication: medicationForm.medication,
        dosage: medicationForm.dosage,
        frequency: medicationForm.frequency,
        instructions: medicationForm.instructions
      };
      
      // Also create a reminder for the patient
      const reminderPayload = {
        patient_id: parseInt(patientId),
        medication: `${medicationForm.medication} ${medicationForm.dosage}`,
        time: "08:00", // Default time, in a real app this would be configurable
        frequency: medicationForm.frequency
      };
      
      try {
        // Try to add the medication first
        const response = await fetch(`${backendUrl}/medications/`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token || "demo-token"}`,
            "Accept": "application/json"
          },
          body: JSON.stringify(medicationPayload)
        });
        
        if (!response.ok) {
          throw new Error("Failed to add medication");
        }
        
        const newMedication = await response.json();
        
        // Then try to create a reminder with Twilio
        let reminderSuccessful = false;
        try {
          const reminderResponse = await fetch(`${backendUrl}/reminders`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token || "demo-token"}`,
              "Accept": "application/json"
            },
            body: JSON.stringify(reminderPayload)
          });
          
          if (reminderResponse.ok) {
            reminderSuccessful = true;
            console.log("SMS reminder created successfully");
          } else {
            console.warn("Failed to create SMS reminder, but medication was added");
          }
        } catch (reminderError) {
          console.warn("Twilio reminder error:", reminderError);
        }
        
        // Update medications list
        const updatedMedications = [...medications, newMedication];
        setMedications(updatedMedications);
        
        // Save to localStorage for persistence
        localStorage.setItem("doctorMedications", JSON.stringify(updatedMedications));
        
        toast({
          title: "Medication Added",
          description: reminderSuccessful 
            ? `Prescription added for ${medicationForm.patientName} with SMS reminder set.`
            : `Prescription added for ${medicationForm.patientName}. SMS reminder could not be set, but medication will be visible to the patient.`
        });
        
      } catch (error) {
        console.warn("API error, using local storage:", error);
        
        // Create a local medication object with an ID
        const newMedication = {
          id: Date.now().toString(),
          patient_id: parseInt(patientId),
          doctor_id: parseInt(doctorId),
          patient_name: medicationForm.patientName,
          medication: medicationForm.medication,
          dosage: medicationForm.dosage,
          frequency: medicationForm.frequency,
          instructions: medicationForm.instructions
        };
        
        // Update medications list
        const updatedMedications = [...medications, newMedication];
        setMedications(updatedMedications);
        
        // Save to doctor-specific localStorage for persistence
        localStorage.setItem("doctorMedications", JSON.stringify(updatedMedications));
        
        // Also save to global medications storage for patient to see
        const globalMedications = JSON.parse(localStorage.getItem('medications') || '[]');
        globalMedications.push(newMedication);
        localStorage.setItem('medications', JSON.stringify(globalMedications));
        
        toast({
          title: "Medication Added Locally",
          description: `Prescription added for ${medicationForm.patientName}. Could not set reminder.`
        });
      }
      
      // Reset the form
      setMedicationForm({ patientName: "", medication: "", dosage: "", frequency: "", instructions: "" });
    } catch (error: unknown) {
      console.error("Medication creation error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error",
        description: `Failed to add medication: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    toast({
      title: "Support Message Sent",
      description: "Our support team will respond within 24 hours."
    });
  };

  const navItems = [
    { id: "feedback", label: "Patient Feedback", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "appointments", label: "Manage Appointments", icon: <CalendarIcon className="h-4 w-4" /> },
    { id: "medications", label: "Patient Medications", icon: <Pill className="h-4 w-4" /> },
    { id: "support", label: "Contact Support", icon: <Phone className="h-4 w-4" /> },
  ];

  const filteredFeedback = patientFeedback.filter(feedback =>
    feedback?.patient_name?.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
    feedback?.comment?.toLowerCase().includes(feedbackSearch.toLowerCase())
  ).filter(feedback => {
    if (feedbackFilter === "all") return true;
    return feedback?.rating === parseInt(feedbackFilter);
  });

  interface AppointmentGroups {
    [key: string]: Appointment[];
  }
  
  const groupedAppointments = upcomingAppointments.reduce<AppointmentGroups>((groups, appointment) => {
    const date = appointment?.date;
    if (date && !groups[date]) groups[date] = [];
    if (date) groups[date].push(appointment);
    return groups;
  }, {});
  const appointmentDates = Object.keys(groupedAppointments).sort();

  interface MedicationGroups {
    [key: string]: Medication[];
  }
  
  const groupedMedications = medications.reduce<MedicationGroups>((groups, med) => {
    const patient = med?.patient_name;
    if (patient && !groups[patient]) groups[patient] = [];
    if (patient) groups[patient].push(med);
    return groups;
  }, {});
  const medicationPatients = Object.keys(groupedMedications).sort();

  const filteredAppointments = appointmentDates.reduce<AppointmentGroups>((filtered, date) => {
    const appointmentsForDate = groupedAppointments[date]?.filter(appointment =>
      appointment?.patient_name?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      appointment?.date?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      appointment?.time?.toLowerCase().includes(appointmentSearch.toLowerCase())
    ) || [];
    if (appointmentsForDate.length > 0) filtered[date] = appointmentsForDate;
    return filtered;
  }, {});

  const filteredMedications = medicationPatients.reduce<MedicationGroups>((filtered, patient) => {
    const medsForPatient = groupedMedications[patient]?.filter(med =>
      med?.patient_name?.toLowerCase().includes(medicationSearch.toLowerCase()) ||
      med?.medication?.toLowerCase().includes(medicationSearch.toLowerCase()) ||
      med?.dosage?.toLowerCase().includes(medicationSearch.toLowerCase())
    ) || [];
    if (medsForPatient.length > 0) filtered[patient] = medsForPatient;
    return filtered;
  }, {});

  return (
    <DashboardLayout userRole="doctor" userName={doctorProfile.name}>
      <div className="flex relative min-h-screen">
        <Button
          variant="ghost"
          className="md:hidden fixed top-20 left-4 z-50 p-2 rounded-full shadow-md bg-white dark:bg-gray-800"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          fixed md:sticky
          top-0
          w-64 h-full
          transition-transform duration-300 ease-in-out
          bg-background border-r
          z-40
          md:flex
        `}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center mb-6">
              <Stethoscope className="h-6 w-6 text-primary mr-2" />
              <span className="text-lg font-semibold">Doctor Portal</span>
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
          <div className="p-4 md:p-8 pt-20 md:pt-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Doctor Dashboard</h1>
                  <p className="text-muted-foreground">{doctorProfile.name} - Create appointments and prescribe medications for your patients</p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {doctorProfile.specialty || "Specialty Not Set"}
                </Badge>
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">New Feedback</p>
                        <p className="text-2xl font-bold">{patientFeedback.filter(f => f?.status === "Pending").length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="h-8 w-8 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Today's Appointments</p>
                        <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <Star className="h-8 w-8 text-warning" />
                      <div>
                        <p className="text-sm text-muted-foreground">Average Rating</p>
                        <p className="text-2xl font-bold">
                          {patientFeedback.length > 0 ? (patientFeedback.reduce((sum, f) => sum + (f?.rating || 0), 0) / patientFeedback.length).toFixed(1) : "0.0"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <User className="h-8 w-8 text-success" />
                      <div>
                        <p className="text-sm text-muted-foreground">Active Patients</p>
                        <p className="text-2xl font-bold">{[...new Set([...patientFeedback, ...upcomingAppointments, ...medications].map(item => item?.patient_name))].length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {activeTab === "feedback" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-3">
                          <MessageSquare className="h-5 w-5" />
                          <span>Patient Feedback for Dr. {doctorProfile.name.split(' ')[doctorProfile.name.split(' ').length-1]}</span>
                        </CardTitle>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search feedback..."
                              value={feedbackSearch}
                              onChange={(e) => setFeedbackSearch(e.target.value)}
                              className="w-64"
                            />
                          </div>
                          <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Filter by Stars" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Ratings</SelectItem>
                              <SelectItem value="5">5 Stars</SelectItem>
                              <SelectItem value="4">4 Stars</SelectItem>
                              <SelectItem value="3">3 Stars</SelectItem>
                              <SelectItem value="2">2 Stars</SelectItem>
                              <SelectItem value="1">1 Star</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="max-h-96 overflow-y-auto">
                      <div className="space-y-4">
                        {filteredFeedback.length > 0 ? (
                          filteredFeedback.map(feedback => (
                            <div key={feedback.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{feedback.patient_name || "Unknown"}</p>
                                    <p className="text-sm text-muted-foreground">{feedback.category || "N/A"}</p>
                                  </div>
                                </div>
                                <div className="text-right space-y-2">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <Star 
                                        key={star}
                                        className={`h-4 w-4 ${star <= (feedback.rating || 0) ? 'fill-warning text-warning' : 'text-muted-foreground'}`} 
                                      />
                                    ))}
                                  </div>
                                  <Badge variant={feedback.status === "Pending" ? "destructive" : "default"}>
                                    {feedback.status || "N/A"}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-muted-foreground">{feedback.comment || "No comment"}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>{feedback.created_at || "N/A"}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground">No feedback available or failed to load.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "appointments" && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Plus className="h-5 w-5" />
                        <span>Schedule Appointment For Patient</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Patient</label>
                        <Select 
                          onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, patientName: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a patient" />
                          </SelectTrigger>
                          <SelectContent>
                            {patients.map((patient) => (
                              <SelectItem key={patient.id} value={patient.name}>
                                {patient.name} ({patient.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date</label>
                          <Input
                            type="date"
                            value={appointmentForm.date}
                            onChange={(e) => setAppointmentForm(prev => ({ ...prev, date: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]} // Prevent selecting past dates
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Time</label>
                          <Input
                            type="time"
                            value={appointmentForm.time}
                            onChange={(e) => setAppointmentForm(prev => ({ ...prev, time: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={appointmentForm.description}
                          onChange={(e) => setAppointmentForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Appointment details..."
                          rows={3}
                        />
                      </div>

                      <Button onClick={handleCreateAppointment} variant="healthcare" className="w-full" disabled={loading}>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Create & Send SMS Reminder
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 mb-4">
                        <ClipboardList className="h-5 w-5" />
                        <span>Upcoming Appointments</span>
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search appointments..."
                          value={appointmentSearch}
                          onChange={(e) => setAppointmentSearch(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="max-h-96 overflow-y-auto">
                      {appointmentDates.length > 0 ? (
                        appointmentDates.map(date => (
                          filteredAppointments[date] && (
                            <div key={date} className="mb-4">
                              <h3 className="text-lg font-semibold mb-2">{date}</h3>
                              <div className="space-y-3">
                                {filteredAppointments[date].map(appointment => (
                                  <div key={appointment.id} className="border rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">{appointment.patient_name || "Unknown"}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {appointment.time || "N/A"} - {appointment.description || "No description"}
                                      </p>
                                    </div>
                                    <Badge variant={appointment.status === "Confirmed" ? "default" : "secondary"}>
                                      {appointment.status || "N/A"}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))
                      ) : (
                        <p className="text-muted-foreground">No appointments available or failed to load.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "medications" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Pill className="h-5 w-5" />
                      <span>Prescribe Medications For Patients</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Patient</label>
                        <Select 
                          onValueChange={(value) => setMedicationForm(prev => ({ ...prev, patientName: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a patient" />
                          </SelectTrigger>
                          <SelectContent>
                            {patients.map((patient) => (
                              <SelectItem key={patient.id} value={patient.name}>
                                {patient.name} ({patient.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Medication</label>
                        <Input
                          value={medicationForm.medication}
                          onChange={(e) => setMedicationForm(prev => ({ ...prev, medication: e.target.value }))}
                          placeholder="Enter medication name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dosage</label>
                        <Input
                          value={medicationForm.dosage}
                          onChange={(e) => setMedicationForm(prev => ({ ...prev, dosage: e.target.value }))}
                          placeholder="e.g., 500mg"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Frequency</label>
                        <Select onValueChange={(value) => setMedicationForm(prev => ({ ...prev, frequency: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once-daily">Once daily</SelectItem>
                            <SelectItem value="twice-daily">Twice daily</SelectItem>
                            <SelectItem value="three-times">Three times daily</SelectItem>
                            <SelectItem value="as-needed">As needed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Special Instructions</label>
                      <Textarea
                        value={medicationForm.instructions}
                        onChange={(e) => setMedicationForm(prev => ({ ...prev, instructions: e.target.value }))}
                        placeholder="Additional instructions for the patient..."
                        rows={3}
                      />
                    </div>

                    <Button onClick={handleAddMedication} variant="healthcare" className="w-full" disabled={loading}>
                      <Pill className="h-4 w-4 mr-2" />
                      Add Prescription & Create Patient Reminders
                    </Button>

                    <CardTitle className="flex items-center space-x-2">
                      <Pill className="h-5 w-5" />
                      <span>Patient Medications</span>
                    </CardTitle>

                    <div className="flex items-center space-x-2 mb-4">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search medications..."
                        value={medicationSearch}
                        onChange={(e) => setMedicationSearch(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {medicationPatients.length > 0 ? (
                        medicationPatients.map(patient => (
                          filteredMedications[patient] && (
                            <div key={patient} className="mb-4">
                              <h3 className="text-lg font-semibold mb-2">{patient}</h3>
                              <div className="space-y-3">
                                {filteredMedications[patient].map(med => (
                                  <div key={med.id} className="border rounded-lg p-3">
                                    <p><strong>Medication:</strong> {med.medication || "N/A"}</p>
                                    <p><strong>Dosage:</strong> {med.dosage || "N/A"}</p>
                                    <p><strong>Frequency:</strong> {med.frequency || "N/A"}</p>
                                    <p><strong>Instructions:</strong> {med.instructions || "N/A"}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))
                      ) : (
                        <p className="text-muted-foreground">No medications available or failed to load.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                          <h3 className="font-semibold">IT Support</h3>
                          <p className="text-muted-foreground">+237 233 40 10 01</p>
                        </div>
                      </Card>
                      
                      <Card className="p-4 bg-muted/30">
                        <div className="text-center space-y-2">
                          <MessageSquare className="h-8 w-8 text-secondary mx-auto" />
                          <h3 className="font-semibold">Medical Support</h3>
                          <p className="text-muted-foreground">medical@dghcare.cm</p>
                        </div>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Message</label>
                        <Textarea
                          placeholder="Describe your technical issue or question..."
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

export default DoctorDashboard;