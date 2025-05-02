"use server";

import { ID, Query, Models } from "node-appwrite";
import twilio from "twilio";

import {
  DATABASE_ID,
  databases,
} from "../appwrite.config";
import { parseStringify } from "../utils";

// Define collection ID (was missing from the config)
const VERIFICATION_COLLECTION_ID = process.env.VERIFICATION_COLLECTION_ID || "verification";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Generate a random 6-digit code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification SMS
export const sendVerificationSMS = async (phone: string) => {
  try {
    // Check if a verification already exists and isn't expired
    const existingVerifications = await databases.listDocuments(
      DATABASE_ID!,
      VERIFICATION_COLLECTION_ID,
      [
        Query.equal("phone", [phone]),
        Query.greaterThan("expiresAt", new Date().toISOString()),
      ]
    );

    // Delete any existing verifications for this phone
    for (const doc of existingVerifications.documents) {
      await databases.deleteDocument(
        DATABASE_ID!,
        VERIFICATION_COLLECTION_ID,
        doc.$id
      );
    }

    // Generate a new code
    const code = generateVerificationCode();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // Create verification document in Appwrite
    await databases.createDocument(
      DATABASE_ID!,
      VERIFICATION_COLLECTION_ID,
      ID.unique(),
      {
        phone,
        code,
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        verified: false,
      }
    );

    // Send SMS via Twilio
    await twilioClient.messages.create({
      body: `Your MedConnect verification code is: ${code}. It expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return { success: true, message: "Verification code sent" };
  } catch (error) {
    console.error("Error sending verification SMS:", error);
    return { 
      success: false, 
      message: "Failed to send verification code. Please try again." 
    };
  }
};

// Verify code submitted by user
export const verifyCode = async (phone: string, code: string) => {
  try {
    // Find the verification document
    const verifications = await databases.listDocuments(
      DATABASE_ID!,
      VERIFICATION_COLLECTION_ID,
      [
        Query.equal("phone", [phone]),
        Query.greaterThan("expiresAt", new Date().toISOString()),
      ]
    );

    if (verifications.documents.length === 0) {
      return {
        success: false,
        message: "Verification code expired or not found. Please request a new code.",
      };
    }

    const verification = verifications.documents[0] as Models.Document & {
      verified: boolean;
      attempts: number;
      code: string;
    };
    
    // Check if already verified
    if (verification.verified) {
      return { success: true, message: "Phone already verified" };
    }

    // Increment attempts
    const attempts = verification.attempts + 1;
    
    // Check max attempts (5)
    if (attempts >= 5) {
      await databases.deleteDocument(
        DATABASE_ID!,
        VERIFICATION_COLLECTION_ID,
        verification.$id
      );
      
      return {
        success: false,
        message: "Too many failed attempts. Please request a new code.",
      };
    }

    // Update attempts
    await databases.updateDocument(
      DATABASE_ID!,
      VERIFICATION_COLLECTION_ID,
      verification.$id,
      { attempts }
    );

    // Check if code matches
    if (verification.code !== code) {
      return {
        success: false,
        message: `Invalid code. ${5 - attempts} attempts remaining.`,
      };
    }

    // Mark as verified
    await databases.updateDocument(
      DATABASE_ID!,
      VERIFICATION_COLLECTION_ID,
      verification.$id,
      { verified: true }
    );

    return { success: true, message: "Phone verified successfully" };
  } catch (error) {
    console.error("Error verifying code:", error);
    return {
      success: false,
      message: "Failed to verify code. Please try again.",
    };
  }
};

// Check if a phone is verified
export const isPhoneVerified = async (phone: string) => {
  try {
    const verifications = await databases.listDocuments(
      DATABASE_ID!,
      VERIFICATION_COLLECTION_ID,
      [
        Query.equal("phone", [phone]),
        Query.equal("verified", [true]),
        Query.greaterThan("expiresAt", new Date().toISOString()),
      ]
    );

    return verifications.documents.length > 0;
  } catch (error) {
    console.error("Error checking phone verification:", error);
    return false;
  }
};