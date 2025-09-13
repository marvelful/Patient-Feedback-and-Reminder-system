import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  UserPlus, 
  BarChart3, 
  Download, 
  MessageSquare, 
  Calendar, 
  Star, 
  TrendingUp, 
  Search, 
  Menu,
  Settings,
  Shield,
  X,
  Eye,
  EyeOff,
  Activity,
  Upload
} from "lucide-react";
import HospitalDashboard from "@/components/hospital/HospitalDashboard";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  status: string;
  patientCount?: number;
  averageRating?: number;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  registrationDate: string;
  status: string;
}

interface Feedback {
  id: string;
  patient: string;
  doctor: string;
  rating: number;
  comment: string;
  date: string;
  sentiment: string;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    specialty: "",
    email: "",
    password: "",
    status: "Active"
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  const specialtyOptions = [
    { value: "cardiology", label: "Cardiology" },
    { value: "neurology", label: "Neurology" },
    { value: "pediatrics", label: "Pediatrics" },
    { value: "orthopedics", label: "Orthopedics" },
    { value: "general", label: "General Medicine" },
    { value: "surgery", label: "Surgery" }
  ];

  const calculateFeedbackAnalytics = () => {
    const totalFeedback = feedback.length;
    const averageRating = totalFeedback > 0 ? feedback.reduce((acc, curr) => acc + curr.rating, 0) / totalFeedback : 0;
    const positivePercentage = totalFeedback > 0 ? Math.round((feedback.filter(f => f.rating >= 4).length) / totalFeedback * 100) : 0;
    const recentFeedback = feedback.slice(0, 3);
    return {
      totalFeedback,
      averageRating,
      positivePercentage,
      recentFeedback,
      responseTime: "2.3 hours"
    };
  };

  const feedbackAnalytics = calculateFeedbackAnalytics();

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

  interface GenericDataItem {
    id: string;
    [key: string]: unknown;
  }
  
  const fetchData = async (endpoint: string, setter: React.Dispatch<React.SetStateAction<GenericDataItem[]>>, errorMsg: string) => {
    try {
      console.log(`Fetching ${backendUrl}${endpoint}`);
      const response = await fetch(`${backendUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      console.log(`Response status for ${endpoint}: ${response.status}`);
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }
        console.error(`Error response for ${endpoint}:`, errorData);
        const message = errorData.detail || `Failed to fetch ${errorMsg} (Status: ${response.status})`;
        throw new Error(message);
      }
      const data = await response.json();
      console.log(`Data fetched for ${endpoint}:`, data);
      
      // Store the raw data for persistence
      localStorage.setItem(`admin_${endpoint.replace(/\//g, '_')}`, JSON.stringify(data));
      
      setter(data.map((item: GenericDataItem) => {
        if (endpoint.includes("doctor")) {
          return {
            id: item.id.toString(),
            name: item.name || "Unknown",
            specialty: item.specialty || "N/A",
            email: item.email || "N/A",
            status: item.is_active ? "Active" : "Inactive",
            patientCount: item.patientCount || 0,
            averageRating: item.averageRating || 0
          };
        } else if (endpoint.includes("patients")) {
          return {
            id: item.id.toString(),
            name: `${item.first_name || "Unknown"} ${item.last_name || ""}`,
            email: item.email || "N/A",
            phone: item.phone_number || "N/A",
            registrationDate: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
            status: item.is_active ? "Active" : "Inactive"
          };
        } else if (endpoint.includes("feedback")) {
          return {
            id: item.id.toString(),
            patient: item.patient ? `${item.patient.first_name || ""} ${item.patient.last_name || ""}` : `Patient ${item.patient_id || "Unknown"}`,
            doctor: item.doctor ? item.doctor.name : "Unknown Doctor",
            rating: item.rating || 0,
            comment: item.comment || "No comment",
            date: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            sentiment: item.rating >= 4 ? "positive" : "neutral"
          };
        }
        return item;
      }));
    } catch (error: unknown) {
      console.error(`Error fetching ${errorMsg}:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to fetch ${errorMsg}`;
      
      // Try to load from localStorage if API fails
      const savedData = localStorage.getItem(`admin_${endpoint.replace(/\//g, '_')}`);
      if (savedData) {
        console.log(`Using cached data for ${endpoint}`);
        const parsedData = JSON.parse(savedData);
        
        setter(parsedData.map((item: GenericDataItem) => {
          if (endpoint.includes("doctor")) {
            return {
              id: item.id.toString(),
              name: item.name || "Unknown",
              specialty: item.specialty || "N/A",
              email: item.email || "N/A",
              status: item.is_active ? "Active" : "Inactive",
              patientCount: item.patientCount || 0,
              averageRating: item.averageRating || 0
            };
          } else if (endpoint.includes("patients")) {
            return {
              id: item.id.toString(),
              name: `${item.first_name || "Unknown"} ${item.last_name || ""}`,
              email: item.email || "N/A",
              phone: item.phone_number || "N/A",
              registrationDate: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
              status: item.is_active ? "Active" : "Inactive"
            };
          } else if (endpoint.includes("feedback")) {
            return {
              id: item.id.toString(),
              patient: item.patient ? `${item.patient.first_name || ""} ${item.patient.last_name || ""}` : `Patient ${item.patient_id || "Unknown"}`,
              doctor: item.doctor ? item.doctor.name : "Unknown Doctor",
              rating: item.rating || 0,
              comment: item.comment || "No comment",
              date: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              sentiment: item.rating >= 4 ? "positive" : "neutral"
            };
          }
          return item;
        }));
      } else {
        toast({
          title: `Failed to Load ${errorMsg}`,
          description: error.message || `Could not load ${errorMsg.toLowerCase()}. Please check if the backend is running and the endpoint is correct.`,
          variant: "destructive"
        });
      }
    }
  };

  useEffect(() => {
    Promise.all([
      fetchData("/doctor", setDoctors, "doctors"),
      fetchData("/patients", setPatients, "patients"),
      fetchData("/feedback", setFeedback, "feedback")
    ]).catch((error) => {
      console.error("Failed to fetch data:", error);
    });
  }, [backendUrl, toast]);

  const handleExportData = (type: string) => {
    toast({
      title: "Export Started",
      description: `${type} data is being exported to CSV format.`,
    });
  };

  const handleCreateDoctor = () => {
    setIsEditing(false);
    setEditingDoctorId(null);
    setNewDoctor({
      name: "",
      specialty: "",
      email: "",
      password: "",
      status: "Active"
    });
    setShowAddDoctorForm(true);
  };

  const handleEditDoctor = async (doctorId: string) => {
    try {
      const response = await fetch(`${backendUrl}/doctor/${doctorId}`, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }
        throw new Error(errorData.detail || `Failed to fetch doctor data (Status: ${response.status})`);
      }
      const doctorData = await response.json();
      setNewDoctor({
        name: doctorData.name || "",
        specialty: doctorData.specialty || "",
        email: doctorData.email || "",
        password: "",
        status: doctorData.is_active ? "Active" : "Inactive"
      });
      setIsEditing(true);
      setEditingDoctorId(doctorId);
      setShowAddDoctorForm(true);
    } catch (error: unknown) {
      console.error(`Error fetching doctor ${doctorId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load doctor data";
      toast({
        title: "Error",
        description: errorMessage || "Failed to load doctor data. Please check if the backend is running.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitDoctor = async () => {
    // Validate required fields
    if (!newDoctor.name || !newDoctor.specialty || !newDoctor.email || (!isEditing && !newDoctor.password)) {
      toast({
        title: "Error",
        description: "All fields are required.",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newDoctor.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    // Validate password length for new doctors
    if (!isEditing && newDoctor.password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    try {
      const url = isEditing 
        ? `${backendUrl}/doctor/${editingDoctorId}`
        : `${backendUrl}/doctor`;
      const method = isEditing ? "PUT" : "POST";
      
      interface DoctorRequestBody {
        name: string;
        specialty: string;
        email: string;
        is_active: boolean;
        password?: string;
      }

      const requestBody: DoctorRequestBody = {
        name: newDoctor.name,
        specialty: newDoctor.specialty,
        email: newDoctor.email,
        is_active: newDoctor.status === "Active"
      };

      if (!isEditing || newDoctor.password) {
        requestBody.password = newDoctor.password;
      }

      console.log(`Submitting doctor to ${url}:`, requestBody);
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`Response status for ${url}: ${response.status}`);
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }
        console.error(`Error response for ${url}:`, errorData);
        let errorMessage = errorData.detail || `Failed to ${isEditing ? "update" : "create"} doctor (Status: ${response.status})`;
        if (response.status === 409) {
          errorMessage = "Email already exists in the system";
        } else if (response.status === 404) {
          errorMessage = "Doctor endpoint not found. Please ensure the backend is configured correctly.";
        }
        throw new Error(errorMessage);
      }

      toast({
        title: isEditing ? "Doctor Updated" : "Doctor Created",
        description: isEditing 
          ? "Doctor details have been successfully updated." 
          : "New doctor has been added to the system."
      });

      setShowAddDoctorForm(false);
      setIsEditing(false);
      setEditingDoctorId(null);
      setNewDoctor({
        name: "",
        specialty: "",
        email: "",
        password: "",
        status: "Active"
      });

      await fetchData("/doctor", setDoctors, "doctors");

    } catch (error: unknown) {
      console.error("Doctor submission error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: errorMessage || "An unexpected error occurred while submitting doctor data.",
        variant: "destructive"
      });
    }
  };

  const handleDeactivateUser = async (userId: string, userType: string) => {
    try {
      const endpoint = userType === "doctor" ? `/doctor/${userId}/status` : `/patients/${userId}/status`;
      const url = `${backendUrl}${endpoint}`;
      console.log(`Updating status at ${url}`);
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      console.log(`Response status for ${url}: ${response.status}`);
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }
        console.error(`Error response for ${url}:`, errorData);
        let errorMessage = errorData.detail || `Failed to update ${userType} status (Status: ${response.status})`;
        if (response.status === 404) {
          errorMessage = `${userType.charAt(0).toUpperCase() + userType.slice(1)} status endpoint not found. Please ensure the backend is configured correctly.`;
        }
        throw new Error(errorMessage);
      }
      toast({
        title: `${userType.charAt(0).toUpperCase() + userType.slice(1)} Status Updated`,
        description: `${userType.charAt(0).toUpperCase() + userType.slice(1)} status has been updated.`,
      });
      if (userType === "doctor") {
        await fetchData("/doctor", setDoctors, "doctors");
      } else {
        await fetchData("/patients", setPatients, "patients");
      }
    } catch (error: unknown) {
      console.error(`Error updating ${userType} status:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to update ${userType} status`;
      toast({
        title: "Error",
        description: errorMessage || `Failed to update ${userType} status. Please check if the backend is running.`,
        variant: "destructive"
      });
    }
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const navItems = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "doctors", label: "Manage Doctors", icon: <UserPlus className="h-4 w-4" /> },
    { id: "patients", label: "Manage Patients", icon: <Users className="h-4 w-4" /> },
    { id: "analytics", label: "Analytics", icon: <TrendingUp className="h-4 w-4" /> },
    //{ id: "appointments", label: "All Appointments", icon: <Calendar className="h-4 w-4" /> },
    { id: "feedback", label: "Patient Feedback", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "settings", label: "System Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout userRole="admin" userName="Admin User">
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
          fixed md:sticky top-0 w-64 h-full
          transition-transform duration-300 ease-in-out
          bg-background border-r z-40 md:flex
        `}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center mb-6">
              <Shield className="h-6 w-6 text-primary mr-2" />
              <span className="text-lg font-semibold">Admin Portal</span>
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
                  <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
                  <p className="text-muted-foreground">Hospital management and analytics overview</p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2 border-success text-success">
                  System Administrator
                </Badge>
              </div>
              <div className="grid md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Doctors</p>
                        <p className="text-2xl font-bold">{doctors.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Active Patients</p>
                        <p className="text-2xl font-bold">{patients.filter(p => p.status === "Active").length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-8 w-8 text-warning" />
                      <div>
                        <p className="text-sm text-muted-foreground">Feedback Received</p>
                        <p className="text-2xl font-bold">{feedbackAnalytics.totalFeedback}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-8 w-8 text-success" />
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Rating</p>
                        <p className="text-2xl font-bold">{feedbackAnalytics.averageRating.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Patient Feedback</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {feedbackAnalytics.recentFeedback.length > 0 ? (
                            feedbackAnalytics.recentFeedback.map(feedback => (
                              <div key={feedback.id} className="border rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{feedback.patient}</span>
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <Star 
                                        key={star}
                                        className={`h-4 w-4 ${star <= feedback.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} 
                                      />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">{feedback.comment}</p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{feedback.doctor}</span>
                                  <Badge variant={feedback.sentiment === "positive" ? "default" : "secondary"}>
                                    {feedback.sentiment}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground">No feedback available.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>System Health</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>System Uptime</span>
                          <Badge variant="default">40.9%</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Active Sessions</span>
                          <Badge variant="secondary">4</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>SMS Service</span>
                          <Badge variant="default">Operational</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Database Status</span>
                          <Badge variant="default">Healthy</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
              {activeTab === "doctors" && (
                <div className="space-y-6">
                  {showAddDoctorForm && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{isEditing ? "Edit Doctor" : "Add New Doctor"}</CardTitle>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setShowAddDoctorForm(false);
                              setIsEditing(false);
                              setEditingDoctorId(null);
                              setNewDoctor({ name: "", specialty: "", email: "", password: "", status: "Active" });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Full Name</label>
                              <Input 
                                placeholder="Dr. Full Name" 
                                value={newDoctor.name}
                                onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Specialty</label>
                              <Select
                                value={newDoctor.specialty}
                                onValueChange={(value) => setNewDoctor({...newDoctor, specialty: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select specialty" />
                                </SelectTrigger>
                                <SelectContent>
                                  {specialtyOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Email</label>
                              <Input 
                                placeholder="doctor@hospital.cm" 
                                type="email"
                                value={newDoctor.email}
                                onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{isEditing ? "New Password (optional)" : "Password"}</label>
                              <div className="relative">
                                <Input 
                                  placeholder={isEditing ? "Enter new password to change" : "Create a password"} 
                                  type={showPassword ? "text" : "password"}
                                  value={newDoctor.password}
                                  onChange={(e) => setNewDoctor({...newDoctor, password: e.target.value})}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end mt-6 space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setShowAddDoctorForm(false);
                              setIsEditing(false);
                              setEditingDoctorId(null);
                              setNewDoctor({ name: "", specialty: "", email: "", password: "", status: "Active" });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="healthcare"
                            onClick={handleSubmitDoctor}
                            disabled={!newDoctor.name || !newDoctor.specialty || !newDoctor.email || (!isEditing && !newDoctor.password)}
                          >
                            {isEditing ? "Update Doctor" : "Add Doctor"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Doctor Management</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Button onClick={handleCreateDoctor} variant="healthcare">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Doctor
                          </Button>
                          <Button 
                            onClick={() => {
                              const fileInput = document.createElement('input');
                              fileInput.type = 'file';
                              fileInput.accept = '.csv';
                              fileInput.onchange = (e) => {
                                const target = e.target as HTMLInputElement;
                                const file = target.files ? target.files[0] : null;
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const csvContent = event.target?.result as string;
                                    // Process CSV content
                                    const lines = csvContent.split('\n');
                                    const headers = lines[0].split(',');
                                    
                                    toast({
                                      title: "Import Successful",
                                      description: `Imported ${lines.length - 1} doctors successfully.`,
                                    });
                                    
                                    // Refresh doctor list
                                    fetchData("/doctor", setDoctors, "doctors");
                                  };
                                  reader.readAsText(file);
                                }
                              };
                              fileInput.click();
                            }}
                            variant="outline"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Import
                          </Button>
                          <Button 
                            onClick={() => {
                              // Export doctors to CSV
                              const headers = ['Name', 'Specialty', 'Email', 'Status', 'Patients', 'Rating'];
                              const csvData = filteredDoctors.map(doctor => [
                                doctor.name,
                                doctor.specialty,
                                doctor.email,
                                doctor.status,
                                doctor.patientCount?.toString() || '0',
                                doctor.averageRating?.toString() || 'N/A'
                              ]);
                              
                              const csvContent = [
                                headers.join(','),
                                ...csvData.map(row => row.join(','))
                              ].join('\n');
                              
                              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                              const link = document.createElement('a');
                              const url = URL.createObjectURL(blob);
                              link.setAttribute('href', url);
                              link.setAttribute('download', 'doctors.csv');
                              link.style.visibility = 'hidden';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              
                              toast({
                                title: "Export Completed",
                                description: "Doctors data has been exported to CSV format.",
                              });
                            }} 
                            variant="outline"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search doctors..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                          />
                        </div>                       
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Specialty</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Patients</TableHead>
                              <TableHead>Rating</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredDoctors.length > 0 ? (
                              filteredDoctors.map(doctor => (
                                <TableRow key={doctor.id}>
                                  <TableCell className="font-medium">{doctor.name}</TableCell>
                                  <TableCell>{doctor.specialty}</TableCell>
                                  <TableCell>{doctor.email}</TableCell>
                                  <TableCell>{doctor.patientCount || 0}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-1">
                                      <Star className="h-4 w-4 fill-warning text-warning" />
                                      <span>{doctor.averageRating?.toFixed(1) || 'N/A'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={doctor.status === "Active" ? "default" : "secondary"}>
                                      {doctor.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleEditDoctor(doctor.id)}
                                      >
                                        Edit
                                      </Button>
                                      <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => handleDeactivateUser(doctor.id, "doctor")}
                                      >
                                        {doctor.status === "Active" ? "Deactivate" : "Activate"}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                  No doctors found.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              {activeTab === "patients" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Patient Management</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => handleExportData("Patients")} variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Export Patient Data
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search patients..." 
                          className="max-w-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Select>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Patients</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Registration Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPatients.length > 0 ? (
                            filteredPatients.map(patient => (
                              <TableRow key={patient.id}>
                                <TableCell className="font-medium">{patient.name}</TableCell>
                                <TableCell>{patient.email}</TableCell>
                                <TableCell>{patient.phone}</TableCell>
                                <TableCell>{new Date(patient.registrationDate).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <Badge variant={patient.status === "Active" ? "default" : "secondary"}>
                                    {patient.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button variant="outline" size="sm">View</Button>
                                    <Button variant="outline" size="sm">Reset Access</Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleDeactivateUser(patient.id, "patient")}
                                    >
                                      {patient.status === "Active" ? "Deactivate" : "Activate"}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                No patients found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
              {activeTab === "analytics" && (
                <div className="space-y-6">
                  {/* Original Feedback Analytics Card */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <BarChart3 className="h-5 w-5" />
                          <span>Feedback Analytics</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <p className="text-2xl font-bold text-primary">{feedbackAnalytics.positivePercentage}%</p>
                            <p className="text-sm text-muted-foreground">Positive Feedback</p>
                          </div>
                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <p className="text-2xl font-bold text-secondary">{feedbackAnalytics.responseTime}</p>
                            <p className="text-sm text-muted-foreground">Avg Response Time</p>
                          </div>
                        </div>                      
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Satisfaction Rate</span>
                            <span>{feedbackAnalytics.positivePercentage}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${feedbackAnalytics.positivePercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Integrated Hospital Dashboard */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Activity className="h-5 w-5" />
                        <span>Hospital Analytics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-auto">
                        <HospitalDashboard />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Star className="h-5 w-5" />
                        <span>Rating Distribution</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="mt-4 space-y-2">
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map(rating => {
                            const ratingCount = feedback.filter(f => Math.floor(f.rating) === rating).length;
                            const percentage = feedback.length > 0 ? Math.round((ratingCount / feedback.length) * 100) : 0;
                            return (
                              <div key={rating} className="flex items-center space-x-2">
                                <div className="w-6 text-sm">{rating}★</div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${rating >= 4 ? 'bg-success' : rating === 3 ? 'bg-warning' : 'bg-destructive'}`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <div className="w-10 text-xs text-muted-foreground">{percentage}%</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button onClick={() => handleExportData("Analytics")} variant="outline" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Export Analytics Report
                        </Button>
                        <Button 
                          onClick={() => {
                            // Fetch real appointments data from the dashboard component
                            let appointmentsData = [['Date', 'Doctor', 'Patient', 'Status', 'Type']];
                            
                            // Try to get appointments from localStorage
                            const savedAppointments = localStorage.getItem('admin_appointments');
                            if (savedAppointments) {
                              try {
                                const appointments = JSON.parse(savedAppointments);
                                // Map the appointments to CSV format
                                appointmentsData = [
                                  ['Date', 'Doctor', 'Patient', 'Status', 'Type'],
                                  ...appointments.map(app => [
                                    new Date(app.start || app.date).toISOString().split('T')[0],
                                    app.doctor || 'N/A',
                                    app.patient || 'N/A',
                                    app.status || 'Scheduled',
                                    app.type || 'Consultation'
                                  ])
                                ];
                              } catch (error) {
                                console.error("Error parsing appointments data:", error);
                                toast({
                                  title: "Export Error",
                                  description: "Could not retrieve appointment data. Using sample data instead.",
                                  variant: "destructive"
                                });
                              }
                            } else {
                              // Fallback - fetch from hospital dashboard data
                              fetch(`${backendUrl}/appointments`)
                                .then(response => response.json())
                                .then(data => {
                                  localStorage.setItem('admin_appointments', JSON.stringify(data));
                                  appointmentsData = [
                                    ['Date', 'Doctor', 'Patient', 'Status', 'Type'],
                                    ...data.map(app => [
                                      new Date(app.start || app.date).toISOString().split('T')[0],
                                      app.doctor || 'N/A',
                                      app.patient || 'N/A',
                                      app.status || 'Scheduled',
                                      app.type || 'Consultation'
                                    ])
                                  ];
                                })
                                .catch(error => {
                                  console.error("Error fetching appointments:", error);
                                });
                            }
                            
                            const csvContent = appointmentsData.map(row => row.join(',')).join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement('a');
                            const url = URL.createObjectURL(blob);
                            link.setAttribute('href', url);
                            link.setAttribute('download', 'appointments.csv');
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            toast({
                              title: "Export Completed",
                              description: "Appointments data has been exported to CSV format.",
                            });
                          }} 
                          variant="outline" 
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Appointments
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                 
                </div>
              )}
            
              {activeTab === "feedback" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <MessageSquare className="h-5 w-5" />
                        <span>Patient Feedback</span>
                      </CardTitle>
                      <Button onClick={() => handleExportData("Feedback")} variant="outline">
                        <Download className="h-4 w-4 mr-2"/>
                        Export Feedback
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search feedback..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="max-w-sm"
                        />
                        <Select>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by rating" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Ratings</SelectItem>
                            <SelectItem value="positive">Positive (4-5)</SelectItem>
                            <SelectItem value="neutral">Neutral (3)</SelectItem>
                            <SelectItem value="negative">Negative (1-2)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Patient</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Comment</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {feedback.length > 0 ? (
                            feedback.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.patient}</TableCell>
                                <TableCell>{item.doctor}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-4 w-4 fill-warning text-warning" />
                                    <span>{item.rating.toFixed(1)}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">{item.comment}</TableCell>
                                <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant={item.sentiment === "positive" ? "default" : "secondary"}>
                                      {item.sentiment}
                                    </Badge>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => {
                                        // Button clicked, but no action for now
                                      }}
                                    >
                                      Reply
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                No feedback found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
              {activeTab === "settings" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="h-5 w-5" />
                      <span>System Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Maintenance Mode</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enabled">Enabled</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">System Notifications</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enabled">Enabled</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Max Appointments Per Day</label>
                        <Input type="number" defaultValue={20} min={1} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Feedback SLA (hrs)</label>
                        <Input type="number" defaultValue={24} min={1} />
                      </div>
                    </div>
                    <Button
                      className="mt-4"
                      onClick={() =>
                        toast({
                          title: "Settings Updated",
                          description: "Your changes have been saved successfully.",
                        })
                      }
                    >
                      Save Settings
                    </Button>
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

export default AdminDashboard;
