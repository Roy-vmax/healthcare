"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SelectItem } from "@/components/ui/select";
import {
  createAppointment,
  updateAppointment,
} from "@/lib/actions/appointment.actions";
import { getAllDoctors } from "@/lib/actions/doctor.actions";
import { getAppointmentSchema } from "@/lib/validation";
import { Appointment } from "@/types/appwrite.types";

import "react-datepicker/dist/react-datepicker.css";

import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { Form } from "../ui/form";
import { PaymentForm } from "./PaymentForm";

// Define the Status type that was missing
type Status = "pending" | "scheduled" | "cancelled";

// Define Doctor interface
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

  // Fetch doctors from the database
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

  // Update the form value when a doctor is selected
  const handleDoctorSelect = (doctorName: string) => {
    setSelectedDoctor(doctorName);
    form.setValue("primaryPhysician", doctorName);
  };

  // Filter doctors based on search query
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

  // Calculate appointment cost based on doctor - FIXED FUNCTION
  const calculateAppointmentCost = () => {
    const selectedDoctorName = form.watch("primaryPhysician");
    if (!selectedDoctorName) return 50; // Return default rate if no doctor selected
    
    const selectedDoc = doctors.find(doc => doc.name === selectedDoctorName);
    const baseRate = 50; // Base appointment rate
    
    // Ensure we're returning a number
    const rate = selectedDoc?.rate;
    return typeof rate === 'number' ? rate : baseRate;
  };

  let buttonLabel;
  switch (type) {
    case "cancel":
      buttonLabel = "Cancel Appointment";
      break;
    case "schedule":
      buttonLabel = "Schedule Appointment";
      break;
    default:
      buttonLabel = "Continue to Payment";
  }

  // Allow manual entry of doctor if not found
  const handleManualDoctorEntry = () => {
    if (searchQuery && !filteredDoctors.some(d => d.name === searchQuery)) {
      handleDoctorSelect(searchQuery);
    }
  };

  // Format doctor availability for display
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
          <section className="mb-8 space-y-4">
            <h1 className="text-2xl font-bold">New Appointment</h1>
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
                <label className="text-sm font-medium">
                  Find a Doctor
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search by name or specialization"
                    className="w-full rounded-lg border border-gray-300 p-3 pr-10 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleManualDoctorEntry}
                      className="absolute right-3 top-3 text-xs text-blue-600 hover:text-blue-800"
                    >
                      Use "{searchQuery}"
                    </button>
                  )}
                </div>
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
                        className={`rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-gray-800 dark:border-gray-700 ${
                          selectedDoctor === doctor.name 
                            ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900" 
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                        onClick={() => handleDoctorSelect(doctor.name)}
                      >
                        <div className="flex items-start gap-4">
                          {doctor.image && (
                            <div className="relative">
                              <div className="rounded-full border border-gray-200 overflow-hidden" style={{width: 60, height: 60}}>
                                <Image
                                  src={doctor.image}
                                  width={60}
                                  height={60}
                                  alt={doctor.name}
                                  className="object-cover"
                                />
                              </div>
                              {selectedDoctor === doctor.name && (
                                <div className="absolute -right-1 -top-1 rounded-full bg-green-500 p-1">
                                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h3 className="font-medium">{doctor.name}</h3>
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                ${doctor.rate || 50}
                              </span>
                            </div>
                            
                            <div className="mt-1 flex items-center">
                              <span className="text-sm text-gray-500">
                                {doctor.specialization || "General Practice"}
                              </span>
                              {doctor.experience && (
                                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-green-800 dark:bg-blue-900 dark:text-blue-200">
                                  {doctor.experience}
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <p className="text-xs font-medium text-green-600 dark:text-green-300">Available:</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {formatAvailability(doctor).map((time, index) => (
                                  <span 
                                    key={index} 
                                    className="rounded bg-gray-100 px-2 py-1 text-xs font-medium dark:bg-gray-700"
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
                    <div className="col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:bg-gray-800 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400">No doctors found matching "{searchQuery}"</p>
                      {searchQuery && (
                        <button 
                          type="button"
                          onClick={() => handleDoctorSelect(searchQuery)}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
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

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="mb-3 font-medium">Appointment Details</h3>
              
              <CustomFormField
                fieldType={FormFieldType.DATE_PICKER}
                control={form.control}
                name="schedule"
                label="Appointment date and time"
                showTimeSelect
                dateFormat="MM/dd/yyyy  -  h:mm aa"
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <CustomFormField
                  fieldType={FormFieldType.TEXTAREA}
                  control={form.control}
                  name="reason"
                  label="Appointment reason"
                  placeholder="Annual checkup, follow-up visit, etc."
                  disabled={type === "schedule"}
                />

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
          </>
        )}

        {type === "cancel" && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 dark:bg-red-900/20 dark:border-red-900/30">
            <h3 className="mb-3 font-medium text-red-800 dark:text-red-200">Cancel Appointment</h3>
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
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex justify-between">
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
            className={`w-full py-3 ${
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