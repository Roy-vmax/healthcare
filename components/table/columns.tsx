"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

import { Doctors } from "@/constants";
import { formatDateTime } from "@/lib/utils";
import { Appointment } from "@/types/appwrite.types";

import { AppointmentModal } from "../AppointmentModal";
import { StatusBadge } from "../StatusBadge";

export const columns: ColumnDef<Appointment>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "patient",
    header: "Patient",
    cell: ({ row }) => {
      const appointment = row.original;
      // Add null check for patient object
      return <p className="text-14-medium">{appointment.patient?.name || "Unknown"}</p>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <div className="min-w-[115px]">
          <StatusBadge status={appointment.status} />
        </div>
      );
    },
  },
  {
    accessorKey: "schedule",
    header: "Appointment",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <p className="text-14-regular min-w-[100px]">
          {formatDateTime(appointment.schedule).dateTime}
        </p>
      );
    },
  },
  {
    accessorKey: "primaryPhysician",
    header: "Doctor",
    cell: ({ row }) => {
      const appointment = row.original;
      // More robust doctor finding - check for undefined and handle properly
      let doctorName = appointment.primaryPhysician;
      
      // Default placeholder image - this path should match your project structure
      let doctorImage = "/assets/icons/doctor-placeholder.svg";
      
      // Only look for the doctor in the Doctors array if primaryPhysician exists
      if (doctorName && Doctors && Doctors.length > 0) {
        const doctorFound = Doctors.find(
          (doc) => doc.name === doctorName
        );
        
        if (doctorFound) {
          doctorName = doctorFound.name;
          if (doctorFound.image) {
            // Ensure image path starts with "/" if it's not an absolute URL
            doctorImage = doctorFound.image.startsWith('http') 
              ? doctorFound.image 
              : doctorFound.image.startsWith('/') 
                ? doctorFound.image 
                : `/${doctorFound.image}`;
          }
        }
      }

      return (
        <div className="flex items-center gap-3">
          {/* Replace Next.js Image with a simple div with background color */}
          <div 
            className="size-8 bg-blue-600 flex items-center justify-center rounded-full text-white text-xs font-medium"
            aria-label="Doctor avatar"
          >
            {doctorName ? doctorName.charAt(0).toUpperCase() : "?"}
          </div>
          <p className="whitespace-nowrap">
            {doctorName ? `Dr. ${doctorName}` : "Dr. Unknown"}
          </p>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="pl-4">Actions</div>,
    cell: ({ row }) => {
      const appointment = row.original;

      return (
        <div className="flex gap-1">
          <AppointmentModal
            patientId={appointment.patient?.$id || ""}
            userId={appointment.userId}
            appointment={appointment}
            type="schedule"
            title="Schedule Appointment"
            description="Please confirm the following details to schedule."
          />
          <AppointmentModal
            patientId={appointment.patient?.$id || ""}
            userId={appointment.userId}
            appointment={appointment}
            type="cancel"
            title="Cancel Appointment"
            description="Are you sure you want to cancel your appointment?"
          />
        </div>
      );
    },
  },
];