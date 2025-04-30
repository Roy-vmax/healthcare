"use server";

import { revalidatePath } from "next/cache";
import { ID, InputFile, Query, Models } from "node-appwrite";

import {
  BUCKET_ID,
  DATABASE_ID,
  ENDPOINT,
  DOCTOR_COLLECTION_ID,
  PROJECT_ID,
  databases,
  storage,
} from "../appwrite.config";
import { parseStringify } from "../utils";

interface CreateDoctorParams {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: string;
  rate: string;
  availability: string[];
  image?: FormData | null;
}

// Define the Doctor document structure
interface DoctorDocument extends Models.Document {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: string;
  rate: string | number;
  availability: string | Date;
  availabilityEndTime: string | Date;
  availabilityDisplay: string | Date;
  image: string;
}

// CREATE DOCTOR
export const createDoctor = async ({
  image,
  ...doctor
}: CreateDoctorParams) => {
  try {
    // Upload file if provided
    let fileId = null;
    if (image) {
      const inputFile = InputFile.fromBlob(
        image.get("doctorImage") as Blob,
        image.get("fileName") as string
      );

      const file = await storage.createFile(BUCKET_ID!, ID.unique(), inputFile);
      fileId = file.$id;
    }

    // Default image if none provided
    const imageUrl = fileId
      ? `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`
      : "/assets/icons/doctor-placeholder.svg";

    // Convert availability string array to a proper date object
    // We'll use the first element of the array as reference for the availability
    const availabilityRangeString = doctor.availability[0]; // Format: "09:00 - 17:00"
    const [startTime, endTime] = availabilityRangeString.split(" - ");
    
    // Create a date object for today
    const today = new Date();
    // Format the date to YYYY-MM-DD
    const dateString = today.toISOString().split('T')[0];
    
    // Create a full ISO datetime string for the availability
    const availabilityDateTime = new Date(`${dateString}T${startTime}`);
    
    // Create end time as a date object too
    const availabilityEndDateTime = new Date(`${dateString}T${endTime}`);
    
    // Create a clone of availabilityDateTime for the availabilityDisplay field
    const availabilityDisplayDateTime = new Date(availabilityDateTime);

    // Create new doctor document
    const newDoctor = await databases.createDocument(
      DATABASE_ID!,
      DOCTOR_COLLECTION_ID!,
      ID.unique(),
      {
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.specialization,
        experience: doctor.experience,
        rate: doctor.rate,
        availability: availabilityDateTime, // Send a proper date object
        availabilityEndTime: availabilityEndDateTime, // Store end time as a date object
        availabilityDisplay: availabilityDisplayDateTime, // Required field as DateTime
        image: imageUrl,
      }
    );

    revalidatePath("/admin");
    return parseStringify(newDoctor);
  } catch (error) {
    console.error("Error creating doctor:", error);
    throw error;
  }
};

// GET ALL DOCTORS
export const getAllDoctors = async () => {
  try {
    const doctors = await databases.listDocuments(
      DATABASE_ID!,
      DOCTOR_COLLECTION_ID!,
      [Query.orderDesc("$createdAt")]
    );

    return parseStringify(doctors.documents);
  } catch (error) {
    console.error("Error getting doctors:", error);
    throw error;
  }
};

// GET DOCTOR BY ID
export const getDoctorById = async (doctorId: string) => {
  try {
    const doctor = await databases.getDocument(
      DATABASE_ID!,
      DOCTOR_COLLECTION_ID!,
      doctorId
    );

    return parseStringify(doctor);
  } catch (error) {
    console.error("Error getting doctor:", error);
    throw error;
  }
};

// DELETE DOCTOR
export const deleteDoctor = async (doctorId: string) => {
  try {
    const doctor = await databases.getDocument(
      DATABASE_ID!,
      DOCTOR_COLLECTION_ID!,
      doctorId
    ) as DoctorDocument;
    
    // If the doctor has a custom image (not the default placeholder), delete it from storage
    if (doctor.image && !doctor.image.includes("/assets/icons/doctor-placeholder.svg")) {
      try {
        // Extract the file ID from the image URL
        const fileId = doctor.image.split("/files/")[1].split("/view")[0];
        await storage.deleteFile(BUCKET_ID!, fileId);
      } catch (error) {
        console.error("Error deleting doctor image:", error);
        // Continue with doctor deletion even if image deletion fails
      }
    }

    // Delete the doctor document
    await databases.deleteDocument(
      DATABASE_ID!,
      DOCTOR_COLLECTION_ID!,
      doctorId
    );

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error deleting doctor:", error);
    throw error;
  }
};