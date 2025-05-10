"use client";

import { useState, useEffect } from "react";
import { Trash2, Edit, Plus, CreditCard, User, Calendar, Clock, Star, Search, X } from "lucide-react";
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
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const doctorsList = await getAllDoctors();
      setDoctors(doctorsList || []);
      setFilteredDoctors(doctorsList || []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setDoctors([]);
      setFilteredDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    // Filter doctors based on search term and selected specialty
    const results = doctors.filter(doctor => {
      const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = !filter || doctor.specialization === filter;
      return matchesSearch && matchesFilter;
    });
    setFilteredDoctors(results);
  }, [searchTerm, filter, doctors]);

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

  const handlePaymentComplete = () => {
    setShowPaymentForm(false);
    setSelectedDoctor(null);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  const formatAvailability = (doctor: Doctor) => {
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
      return ["Available by appointment"];
    }
  };

  const handleImageError = (doctorId: string) => {
    setImageError(prev => ({
      ...prev,
      [doctorId]: true
    }));
  };

  // Get unique specializations for filtering
  const specializations = Array.from(new Set(doctors.map(doctor => doctor.specialization)))
    .filter(spec => spec && spec.trim() !== "");

  return (
    <div className="space-y-8">
      {/* Header with search and add button */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-0">Find Your Doctor</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Doctor
          </button>
        </div>
        
        {/* Search and filter bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search doctors by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X size={18} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
              </button>
            )}
          </div>
          
          <div className="flex-shrink-0 min-w-[200px]">
            <select
              value={filter || ""}
              onChange={(e) => setFilter(e.target.value || null)}
              className="w-full py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Specialties</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Success message */}
      {showSuccessMessage && (
        <div className="fixed top-6 right-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50 animate-fade-in-out">
          <div className="flex items-center">
            <div className="py-1 mr-2">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <p className="font-bold">Appointment Booked Successfully!</p>
              <p className="text-sm">You'll receive a confirmation email shortly.</p>
            </div>
          </div>
        </div>
      )}

      {/* Add doctor modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-xl">Add New Doctor</h3>
              <button 
                onClick={() => setShowAddForm(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <AddDoctorForm onClose={() => {
              setShowAddForm(false);
              fetchDoctors();
            }} />
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPaymentForm && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-xl">Book Appointment with Dr. {selectedDoctor.name}</h3>
              <button 
                onClick={() => setShowPaymentForm(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <PaymentForm 
                onPaymentComplete={handlePaymentComplete} 
                appointmentCost={Number(selectedDoctor.rate)} 
                doctorName={selectedDoctor.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-md">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading doctors...</p>
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="flex justify-between items-center px-1">
            <p className="text-gray-600 dark:text-gray-400">
              {filteredDoctors.length} {filteredDoctors.length === 1 ? 'doctor' : 'doctors'} found
              {filter && ` in ${filter}`}
              {searchTerm && ` for "${searchTerm}"`}
            </p>
            {(searchTerm || filter) && (
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setFilter(null);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
              >
                Clear filters <X size={14} />
              </button>
            )}
          </div>
          
          {/* Doctors grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.length > 0 ? (
              filteredDoctors.map((doctor) => (
                <div
                  key={doctor.$id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden relative"
                >
                  {deleteConfirm === doctor.$id ? (
                    <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-xl flex flex-col items-center justify-center p-6 z-10 animate-fade-in">
                      <p className="text-center mb-4 text-gray-800 dark:text-gray-200">Are you sure you want to delete <strong>{doctor.name}</strong>?</p>
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleDeleteDoctor(doctor.$id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors shadow-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                  
                  {/* Doctor header with specialization badge */}
                  <div className="relative p-6 pb-3">
                    <div className="absolute top-6 right-6">
                      <button
                        onClick={() => confirmDelete(doctor.$id)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors bg-white dark:bg-gray-700 rounded-full shadow-sm"
                        aria-label="Delete doctor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-4 border-white dark:border-gray-700 shadow-sm">
                        {!doctor.image || doctor.image === "" || imageError[doctor.$id] ? (
                          <User size={40} className="text-gray-400" />
                        ) : (
                          <img
                            src={doctor.image}
                            alt={doctor.name || "Doctor"}
                            className="w-full h-full rounded-full object-cover"
                            onError={() => handleImageError(doctor.$id)}
                          />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white">{doctor.name || "Unnamed Doctor"}</h3>
                        <div className="flex mt-1">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {doctor.specialization || "General Practice"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-6 py-3">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex flex-col">
                        <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
                          <Star size={16} className="mr-1" />
                          <span className="text-sm">Experience</span>
                        </div>
                        <p className="font-medium text-gray-800 dark:text-white">{doctor.experience || "N/A"}</p>
                      </div>
                      
                      <div className="flex flex-col">
                        <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
                          <CreditCard size={16} className="mr-1" />
                          <span className="text-sm">Rate</span>
                        </div>
                        <p className="font-medium text-gray-800 dark:text-white">${doctor.rate || 0}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
                        <Clock size={16} className="mr-1" />
                        <span className="text-sm">Availability</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formatAvailability(doctor).map((time, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full text-xs font-medium text-gray-800 dark:text-gray-200"
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center">
                <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <Search size={40} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No doctors found</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  {searchTerm || filter 
                    ? "Try adjusting your search or filters to find what you're looking for." 
                    : "Add your first doctor to get started!"}
                </p>
                {(searchTerm || filter) && (
                  <button 
                    onClick={() => {
                      setSearchTerm("");
                      setFilter(null);
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};