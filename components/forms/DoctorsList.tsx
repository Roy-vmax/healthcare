"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Trash2, Edit, Plus, CreditCard, User } from "lucide-react";
import { getAllDoctors, deleteDoctor } from "@/lib/actions/doctor.actions";
import { AddDoctorForm } from "./AddDoctorForm";
import { PaymentForm } from "./PaymentForm";

interface Doctor {
  $id: string;
  name: string;
  specialization: string;
  experience: string;
  rate: number | string;
  availability: string; // Date string format
  availabilityEndTime: string; // Date string format
  availabilityDisplay: string; // Date string format
  image: string;
}

export const DoctorsList = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const doctorsList = await getAllDoctors();
      setDoctors(doctorsList || []); // Ensure we handle null/undefined response
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setDoctors([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleDeleteDoctor = async (doctorId: string) => {
    try {
      await deleteDoctor(doctorId);
      setDoctors(doctors.filter(doctor => doctor.$id !== doctorId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting doctor:", error);
    }
  };

  const confirmDelete = (doctorId: string) => {
    setDeleteConfirm(doctorId);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleBookAppointment = (doctor: Doctor) => {
    // Ensure we're using the actual doctor rate as a number
    const doctorRate = typeof doctor.rate === 'string' 
      ? parseFloat(doctor.rate) 
      : doctor.rate;
    
    // Make a clean copy of the doctor object with the proper rate type
    setSelectedDoctor({
      ...doctor,
      rate: doctorRate
    });
    setShowPaymentForm(true);
  };

  const handlePaymentComplete = () => {
    setShowPaymentForm(false);
    setSelectedDoctor(null);
    // You might want to show a success message or redirect
  };

  // Format the availability time for display
  const formatAvailability = (doctor: Doctor) => {
    // Format the availability times properly
    try {
      if (!doctor.availability || !doctor.availabilityEndTime) {
        return ["Available by appointment"];
      }
      
      const startDate = new Date(doctor.availability);
      const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const endDate = new Date(doctor.availabilityEndTime);
      const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return [`${startTime} - ${endTime}`];
    } catch (error) {
      // Fallback in case of invalid dates
      return ["Available by appointment"];
    }
  };

  const handleImageError = (doctorId: string) => {
    setImageError(prev => ({
      ...prev,
      [doctorId]: true
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Doctors Directory</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Doctor
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <AddDoctorForm onClose={() => {
              setShowAddForm(false);
              fetchDoctors(); // Refresh the list after adding
            }} />
          </div>
        </div>
      )}

      {showPaymentForm && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold">Complete Payment for Dr. {selectedDoctor.name}</h3>
              <button 
                onClick={() => setShowPaymentForm(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit size={16} />
              </button>
            </div>
            <div className="p-4">
              <PaymentForm 
                onPaymentComplete={handlePaymentComplete} 
                appointmentCost={Number(selectedDoctor.rate)} 
                doctorName={selectedDoctor.name}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {doctors && doctors.length > 0 ? (
            doctors.map((doctor) => (
              <div
                key={doctor.$id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 relative"
              >
                {deleteConfirm === doctor.$id ? (
                  <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center p-4 z-10">
                    <p className="text-center mb-4">Are you sure you want to delete <strong>{doctor.name}</strong>?</p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleDeleteDoctor(doctor.$id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={cancelDelete}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
                
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {!doctor.image || doctor.image === "" || imageError[doctor.$id] ? (
                      <User size={40} className="text-gray-400" />
                    ) : (
                      <div className="relative w-full h-full">
                        {/* Use an img tag instead of Next.js Image component for better error handling */}
                        <img
                          src={doctor.image}
                          alt={doctor.name || "Doctor"}
                          className="w-full h-full rounded-full object-cover"
                          onError={() => handleImageError(doctor.$id)}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg">{doctor.name || "Unnamed Doctor"}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmDelete(doctor.$id)}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors"
                          aria-label="Delete doctor"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-blue-600 dark:text-blue-400 font-medium">{doctor.specialization || "General"}</p>
                    
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Experience</p>
                        <p className="font-medium">{doctor.experience || "N/A"}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Rate</p>
                        <p className="font-medium">${doctor.rate || 0}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Availability</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formatAvailability(doctor).map((time, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-medium"
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => handleBookAppointment(doctor)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <CreditCard size={14} />
                        Book Appointment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">No doctors found. Add your first doctor to get started!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};