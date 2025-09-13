import React, { useState, useEffect } from 'react';
import StatsCard from './StatsCard';
import { Activity, Users, Clock, BedDouble, LineChart } from 'lucide-react';
import DepartmentPerformance from './DepartmentPerformance';
import BarChartComponent from './BarChartComponent';
import FeedbackAnalytics from './FeedbackAnalytics';
import AppointmentCalendar from './AppointmentCalendar';
import { 
  fetchDepartmentStats, 
  fetchHospitalStats, 
  fetchDoctorStats, 
  fetchPatientAdmissions, 
  fetchFeedbackData, 
  fetchAppointments 
} from '@/api/statisticsService';

const HospitalDashboard: React.FC = () => {
  const [departmentStats, setDepartmentStats] = useState<any[]>([]);
  const [hospitalStats, setHospitalStats] = useState<any[]>([]);
  const [doctorStats, setDoctorStats] = useState<any>({});
  const [patientAdmissionsData, setPatientAdmissionsData] = useState<any[]>([]);
  const [feedbackData, setFeedbackData] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load all data in parallel
        const [
          departmentStatsData,
          hospitalStatsData,
          doctorStatsData,
          patientAdmissionsData,
          feedbackData,
          appointmentsData
        ] = await Promise.all([
          fetchDepartmentStats(),
          fetchHospitalStats(),
          fetchDoctorStats(),
          fetchPatientAdmissions(),
          fetchFeedbackData(),
          fetchAppointments()
        ]);
        
        setDepartmentStats(departmentStatsData);
        setHospitalStats(hospitalStatsData);
        setDoctorStats(doctorStatsData);
        setPatientAdmissionsData(patientAdmissionsData);
        setFeedbackData(feedbackData);
        setAppointments(appointmentsData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Transform feedback data for the FeedbackAnalytics component
  const transformFeedbackData = () => {
    if (feedbackData.length === 0) return null;
    
    const totalFeedback = feedbackData.length;
    const averageRating = feedbackData.reduce((sum, item) => sum + item.rating, 0) / totalFeedback;
    
    // Calculate rating distribution
    const ratings: { rating: number; percentage: number }[] = [];
    for (let i = 1; i <= 5; i++) {
      const count = feedbackData.filter(item => Math.round(item.rating) === i).length;
      ratings.push({
        rating: i,
        percentage: totalFeedback > 0 ? Math.round((count / totalFeedback) * 100) : 0
      });
    }
    
    // Get recent feedback (last 3)
    const recentFeedback = feedbackData
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .map(item => ({
        id: item.id,
        patient: item.patient ? `${item.patient.first_name} ${item.patient.last_name}` : "Unknown Patient",
        rating: item.rating,
        comment: item.comment,
        date: item.created_at.split('T')[0]
      }));
    
    return {
      totalFeedback,
      averageRating: Math.round(averageRating * 10) / 10,
      positivePercentage: ratings.slice(3).reduce((sum, r) => sum + r.percentage, 0),
      ratings,
      recentFeedback
    };
  };

  // Transform doctor data for the doctor performance chart
  const transformDoctorData = () => {
    if (!doctorStats.topPerformers || doctorStats.topPerformers.length === 0) return [];
    
    return doctorStats.topPerformers.map((doctor: any) => ({
      name: doctor.name,
      patients: Math.floor(Math.random() * 50) + 20, // Mock patient count for now
      rating: doctor.rating
    }));
  };

  // Transform appointment data for the calendar
  const transformAppointmentData = () => {
    return appointments.map(appointment => ({
      id: appointment.id,
      patient: appointment.patient_name || "Unknown Patient",
      doctor: appointment.doctor_name || "Unknown Doctor",
      type: appointment.category || 'Consultation',
      status: appointment.status || 'scheduled',
      dateTime: `${appointment.date}T${appointment.time}`
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const feedbackStats = transformFeedbackData();
  const doctorPerformanceData = transformDoctorData();
  const appointmentData = transformAppointmentData();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Hospital Analytics Dashboard</h2>
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {hospitalStats.map((stat, index) => (
          <StatsCard 
            key={index}
            title={stat.title}
            value={parseFloat(stat.value.replace(/,/g, ''))}
            unit={stat.title.includes('Satisfaction') ? '%' : stat.title.includes('Stay') ? 'days' : undefined}
            icon={
              stat.icon.bgColor === 'bg-blue-500' ? <Users className="h-5 w-5" /> :
              stat.icon.bgColor === 'bg-green-500' ? <Activity className="h-5 w-5" /> :
              stat.icon.bgColor === 'bg-purple-500' ? <Clock className="h-5 w-5" /> :
              <BedDouble className="h-5 w-5" />
            }
            trend={{ 
              value: parseFloat(stat.change.replace(/[+%]/g, '')), 
              isUpward: stat.trend === 'up' 
            }}
          />
        ))}
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Volume Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-4">Monthly Patient Volume</h3>
            <BarChartComponent 
              data={patientAdmissionsData} 
              dataKey="emergency" 
              nameKey="name" 
              color="#3b82f6" 
              secondaryDataKey="scheduled"
              secondaryColor="#10b981"
              unit=""
            />
          </div>
        </div>
        
        {/* Department Performance */}
        <div className="lg:col-span-1">
          <DepartmentPerformance departments={departmentStats} />
        </div>
      </div>
      
      {/* Doctor Performance and Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctor Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-medium mb-4">Doctor Performance</h3>
          <BarChartComponent 
            data={doctorPerformanceData} 
            dataKey="patients" 
            nameKey="name" 
            color="#10b981" 
            secondaryDataKey="rating" 
            secondaryColor="#f59e0b"
            unit=""
          />
        </div>
        
        {/* Feedback Analytics */}
        {feedbackStats && (
          <FeedbackAnalytics data={feedbackStats} />
        )}
      </div>
      
      {/* Appointment Calendar */}
      <AppointmentCalendar appointments={appointmentData} />
    </div>
  );
};

export default HospitalDashboard;