"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import "react-datepicker/dist/react-datepicker.css";

import { getAppointmentSchema } from "@/lib/validation";
import { 
  createAppointment, 
  updateAppointment 
} from "@/lib/actions/appointment.actions";
import { getAllDoctors } from "@/lib/actions/doctor.actions";
import { Appointment } from "@/types/appwrite.types";

import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { PaymentForm } from "./PaymentForm";
import { Search, Calendar, FileText, Clock, X } from "lucide-react";

// Type definitions
type Status = "pending" | "scheduled" | "cancelled";

interface Doctor {
  $id: string;
  name: string;
  image: string;
  experience?: string;
  specialization?: string;
  rate?: number;
  availability?: string;
  availabilityEndTime?: string;
}

export const AppointmentForm = ({
  userId,
  patientId,
  type = "create",
  appointment,
  setOpen,
}: {
  userId: string;
  patientId: string;
  type: "create" | "schedule" | "cancel";
  appointment?: Appointment;
  setOpen?: Dispatch<SetStateAction<boolean>>;
}) => {
  const router = useRouter();
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>(
    appointment ? appointment?.primaryPhysician : ""
  );
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  // Form setup
  const AppointmentFormValidation = getAppointmentSchema(type);
  const form = useForm<z.infer<typeof AppointmentFormValidation>>({
    resolver: zodResolver(AppointmentFormValidation),
    defaultValues: {
      primaryPhysician: appointment ? appointment?.primaryPhysician : "",
      schedule: appointment
        ? new Date(appointment?.schedule!)
        : new Date(Date.now()),
      reason: appointment ? appointment.reason : "",
      note: appointment?.note || "",
      cancellationReason: appointment?.cancellationReason || "",
    },
  });

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      setIsLoadingDoctors(true);
      try {
        const doctorsList = await getAllDoctors();
        setDoctors(doctorsList || []);
        setFilteredDoctors(doctorsList || []);
      } catch (error) {
        console.error("Error fetching doctors:", error);
        setDoctors([]);
        setFilteredDoctors([]);
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, []);

  // Handler functions
  const handleDoctorSelect = (doctorName: string) => {
    setSelectedDoctor(doctorName);
    form.setValue("primaryPhysician", doctorName);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (query.trim() === "") {
      setFilteredDoctors(doctors);
    } else {
      const filtered = doctors.filter(doctor => 
        doctor.name.toLowerCase().includes(query) || 
        (doctor.specialization || "").toLowerCase().includes(query)
      );
      setFilteredDoctors(filtered);
    }
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    setFilteredDoctors(doctors);
  };

  const handleManualDoctorEntry = () => {
    if (searchQuery && !filteredDoctors.some(d => d.name === searchQuery)) {
      handleDoctorSelect(searchQuery);
    }
  };

  const handleAppointmentSubmit = async (
    values: z.infer<typeof AppointmentFormValidation>
  ) => {
    let status: Status;
    switch (type) {
      case "schedule":
        status = "scheduled";
        break;
      case "cancel":
        status = "cancelled";
        break;
      default:
        status = "pending";
    }

    if (type === "create" && patientId) {
      const appointmentInfo = {
        userId,
        patient: patientId,
        primaryPhysician: values.primaryPhysician,
        schedule: new Date(values.schedule),
        reason: values.reason!,
        status,
        note: values.note,
      };
      
      setAppointmentData(appointmentInfo);
      setShowPaymentStep(true);
    } else {
      setIsLoading(true);
      const appointmentToUpdate = {
        userId,
        appointmentId: appointment?.$id!,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        appointment: {
          primaryPhysician: values.primaryPhysician,
          schedule: new Date(values.schedule),
          status,
          cancellationReason: values.cancellationReason,
        },
        type,
      };

      const updatedAppointment = await updateAppointment(appointmentToUpdate);

      if (updatedAppointment) {
        setOpen && setOpen(false);
        form.reset();
      }
      setIsLoading(false);
    }
  };

  const handlePaymentComplete = async () => {
    setIsLoading(true);
    
    try {
      const newAppointment = await createAppointment(appointmentData);

      if (newAppointment) {
        form.reset();
        router.push(
          `/patients/${userId}/new-appointment/success?appointmentId=${newAppointment.$id}`
        );
      }
    } catch (error) {
      console.log(error);
    }
    
    setIsLoading(false);
  };

  // Helper functions
  const calculateAppointmentCost = () => {
    const selectedDoctorName = form.watch("primaryPhysician");
    if (!selectedDoctorName) return 50; // Default rate
    
    const selectedDoc = doctors.find(doc => doc.name === selectedDoctorName);
    const baseRate = 50;
    
    const rate = selectedDoc?.rate;
    return typeof rate === 'number' ? rate : baseRate;
  };

  const formatAvailability = (doctor: Doctor) => {
    if (!doctor.availability || !doctor.availabilityEndTime) {
      return ["Contact for availability"];
    }
    
    try {
      const startDate = new Date(doctor.availability);
      const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const endDate = new Date(doctor.availabilityEndTime);
      const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return [`${startTime} - ${endTime}`];
    } catch (error) {
      return ["Available by appointment"];
    }
  };

  // UI text
  const buttonLabel = (() => {
    switch (type) {
      case "cancel": return "Cancel Appointment";
      case "schedule": return "Schedule Appointment";
      default: return "Continue to Payment";
    }
  })();

  // Payment step
  if (showPaymentStep) {
    return (
      <PaymentForm 
        onPaymentComplete={handlePaymentComplete} 
        appointmentCost={calculateAppointmentCost()}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleAppointmentSubmit)} className="flex-1 space-y-6">
        {type === "create" && (
          <section className="mb-8 space-y-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Appointment</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Request a new appointment in 10 seconds.
            </p>
          </section>
        )}

        {type !== "cancel" && (
          <>
            {/* Doctor search and selection */}
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Find a Doctor
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search by name or specialization"
                    className="w-full rounded-lg border border-gray-300 p-3 pl-10 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                  {searchQuery && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <button
                        type="button"
                        onClick={handleSearchClear}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {searchQuery && !filteredDoctors.some(d => d.name === searchQuery) && (
                  <button
                    type="button"
                    onClick={handleManualDoctorEntry}
                    className="self-end text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Use "{searchQuery}" as doctor name
                  </button>
                )}
              </div>

              {isLoadingDoctors ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filteredDoctors && filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doctor) => (
                      <div 
                        key={doctor.$id} 
                        className={`rounded-lg border p-4 shadow-sm transition-all hover:shadow-md cursor-pointer
                          ${selectedDoctor === doctor.name 
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-900" 
                            : "border-gray-200 bg-white hover:border-blue-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-700"}
                        `}
                        onClick={() => handleDoctorSelect(doctor.name)}
                      >
                        <div className="flex items-start gap-4">
                          {doctor.image && (
                            <div className="relative flex-shrink-0">
                              <div className="rounded-full border border-gray-200 overflow-hidden dark:border-gray-700" style={{width: 60, height: 60}}>
                                <Image
                                  src={doctor.image}
                                  width={60}
                                  height={60}
                                  alt={doctor.name}
                                  className="object-cover"
                                />
                              </div>
                              {selectedDoctor === doctor.name && (
                                <div className="absolute -right-1 -top-1 rounded-full bg-green-500 p-1 border-2 border-white dark:border-gray-800">
                                  <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h3 className="font-medium text-gray-900 dark:text-white">{doctor.name}</h3>
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                ${doctor.rate || 50}
                              </span>
                            </div>
                            
                            <div className="mt-1 flex items-center">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {doctor.specialization || "General Practice"}
                              </span>
                              {doctor.experience && (
                                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {doctor.experience}
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <div className="flex items-center text-xs font-medium text-green-600 dark:text-green-300">
                                <Clock className="mr-1 h-3 w-3" />
                                Available:
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {formatAvailability(doctor).map((time, index) => (
                                  <span 
                                    key={index} 
                                    className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                  >
                                    {time}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:bg-gray-800 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400">No doctors found matching "{searchQuery}"</p>
                      {searchQuery && (
                        <button 
                          type="button"
                          onClick={() => handleDoctorSelect(searchQuery)}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Add "{searchQuery}" as doctor
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {selectedDoctor && !doctors.some(d => d.name === selectedDoctor) && (
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Using custom doctor: <strong>{selectedDoctor}</strong>
                  </p>
                </div>
              )}
              
              {form.formState.errors.primaryPhysician && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.primaryPhysician.message}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <h3 className="mb-3 font-medium flex items-center text-gray-900 dark:text-white">
                <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                Appointment Details
              </h3>
              
              <CustomFormField
                fieldType={FormFieldType.DATE_PICKER}
                control={form.control}
                name="schedule"
                label="Appointment date and time"
                showTimeSelect
                dateFormat="MM/dd/yyyy  -  h:mm aa"
              />

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-blue-500" />
                    <CustomFormField
                      fieldType={FormFieldType.TEXTAREA}
                      control={form.control}
                      name="reason"
                      label="Appointment reason"
                      placeholder="Annual checkup, follow-up visit, etc."
                      disabled={type === "schedule"}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-blue-500" />
                    <CustomFormField
                      fieldType={FormFieldType.TEXTAREA}
                      control={form.control}
                      name="note"
                      label="Additional notes"
                      placeholder="Any special requirements or information"
                      disabled={type === "schedule"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {type === "cancel" && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 shadow-sm dark:bg-red-900/20 dark:border-red-900/30">
            <h3 className="mb-3 font-medium text-red-800 dark:text-red-200 flex items-center">
              <X className="mr-2 h-4 w-4" />
              Cancel Appointment
            </h3>
            <p className="mb-4 text-sm text-red-700 dark:text-red-300">
              Please provide a reason for cancelling this appointment.
            </p>
            
            <CustomFormField
              fieldType={FormFieldType.TEXTAREA}
              control={form.control}
              name="cancellationReason"
              label="Reason for cancellation"
              placeholder="Schedule conflict, feeling better, etc."
            />
          </div>
        )}

        <div className="mt-6 space-y-4">
          {type === "create" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Cost</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Subject to insurance coverage
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${calculateAppointmentCost().toFixed(2)}
                  </p>
                  {selectedDoctor && doctors.find(d => d.name === selectedDoctor)?.rate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Standard rate for {selectedDoctor}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <SubmitButton
            isLoading={isLoading}
            className={`w-full py-3 shadow-sm hover:shadow-md transition-all ${
              type === "cancel" 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {buttonLabel}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};