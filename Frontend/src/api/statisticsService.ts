// API service for statistics data
const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const fetchDepartmentStats = async () => {
  try {
    const response = await fetch(`${API_URL}/statistics/departments`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch department statistics');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching department statistics:', error);
    throw error;
  }
};

export const fetchHospitalStats = async () => {
  try {
    const response = await fetch(`${API_URL}/statistics/hospital`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch hospital statistics');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching hospital statistics:', error);
    throw error;
  }
};

export const fetchDoctorStats = async () => {
  try {
    const response = await fetch(`${API_URL}/statistics/doctors`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch doctor statistics');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching doctor statistics:', error);
    throw error;
  }
};

export const fetchTreatmentOutcomes = async () => {
  try {
    const response = await fetch(`${API_URL}/statistics/treatment-outcomes`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch treatment outcomes');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching treatment outcomes:', error);
    throw error;
  }
};

export const fetchPatientAdmissions = async () => {
  try {
    const response = await fetch(`${API_URL}/statistics/patient-admissions`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch patient admissions data');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching patient admissions data:', error);
    throw error;
  }
};

export const fetchFeedbackData = async () => {
  try {
    const response = await fetch(`${API_URL}/feedback/`);
    if (!response.ok) {
      throw new Error('Failed to fetch feedback data');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching feedback data:', error);
    throw error;
  }
};

export const fetchAppointments = async () => {
  try {
    const response = await fetch(`${API_URL}/appointments/public/`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};