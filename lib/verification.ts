import { z } from "zod";

export const VerificationSchema = z.object({
  phone: z
    .string()
    .refine((phone) => /^\+\d{10,15}$/.test(phone), "Invalid phone number"),
});

export const VerificationCodeSchema = z.object({
  phone: z
    .string()
    .refine((phone) => /^\+\d{10,15}$/.test(phone), "Invalid phone number"),
  code: z
    .string()
    .length(6, "Verification code must be 6 digits")
    .refine((code) => /^\d{6}$/.test(code), "Code must contain only digits"),
});