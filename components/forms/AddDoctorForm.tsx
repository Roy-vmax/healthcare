"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { X, Upload, User } from "lucide-react";

import { Form } from "@/components/ui/form";
import CustomFormField, { FormFieldType } from "@/components/CustomFormField";
import SubmitButton from "@/components/SubmitButton";
import { createDoctor } from "@/lib/actions/doctor.actions";

const doctorSchema = z.object({
  name: z.string().min(1, "Doctor name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  specialization: z.string().min(1, "Specialization is required"),
  experience: z.string().min(1, "Experience is required"),
  rate: z.string().min(1, "Rate is required"),
  availabilityStart: z.string().min(1, "Start time is required"),
  availabilityEnd: z.string().min(1, "End time is required"),
  image: z.any().optional()
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

export const AddDoctorForm = ({ onClose }: { onClose: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState(false);

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      specialization: "",
      experience: "",
      rate: "50",
      availabilityStart: "09:00",
      availabilityEnd: "17:00"
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setImageError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: DoctorFormValues) => {
    setIsLoading(true);
    
    try {
      // Create FormData if there's an image
      let formData = null;
      if (formFile) {
        formData = new FormData();
        formData.append("doctorImage", formFile);
        formData.append("fileName", formFile.name);
      }
      
      // Process availability times into a formatted array
      const availability = [
        `${values.availabilityStart} - ${values.availabilityEnd}`
      ];
      
      // Create the doctor record
      await createDoctor({
        name: values.name,
        email: values.email,
        phone: values.phone,
        specialization: values.specialization,
        experience: values.experience,
        rate: values.rate,
        availability,
        image: formData
      });
      
      // Close the form and reset
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error adding doctor:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormFile(null);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Add New Doctor</h2>
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            {/* Doctor Profile Image */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                  {imagePreview && !imageError ? (
                    <Image 
                      src={imagePreview}
                      alt="Doctor profile" 
                      width={96} 
                      height={96}
                      className="object-cover w-full h-full"
                      onError={handleImageError}
                    />
                  ) : (
                    <User size={40} className="text-gray-400" />
                  )}
                </div>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    aria-label="Remove image"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <div>
                <label 
                  htmlFor="doctor-image" 
                  className="cursor-pointer flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <Upload size={16} />
                  {imagePreview ? "Change Image" : "Upload Image"}
                </label>
                <input
                  id="doctor-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="name"
                label="Doctor Name"
                placeholder="Dr. Full Name"
              />
              
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="specialization"
                label="Specialization"
                placeholder="Cardiology, Pediatrics, etc."
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="email"
                label="Email Address"
                placeholder="doctor@example.com"
              />
              
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="phone"
                label="Phone Number"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="experience"
                label="Experience"
                placeholder="10 years"
              />
              
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="rate"
                label="Consultation Rate ($)"
                placeholder="75"
              />
            </div>

            {/* Availability Times */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Availability Hours</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="availabilityStart" className="text-sm font-medium">Start Time</label>
                  <input
                    id="availabilityStart"
                    type="time"
                    {...form.register("availabilityStart")}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  {form.formState.errors.availabilityStart && (
                    <p className="text-sm text-red-500">{form.formState.errors.availabilityStart.message}</p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="availabilityEnd" className="text-sm font-medium">End Time</label>
                  <input
                    id="availabilityEnd"
                    type="time"
                    {...form.register("availabilityEnd")}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  {form.formState.errors.availabilityEnd && (
                    <p className="text-sm text-red-500">{form.formState.errors.availabilityEnd.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <SubmitButton
            isLoading={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Add Doctor
          </SubmitButton>
        </form>
      </Form>
    </div>
  );
};