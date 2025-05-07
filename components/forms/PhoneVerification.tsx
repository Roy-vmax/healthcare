"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { sendVerificationSMS, verifyCode } from "@/lib/actions/verification.actions";
import CustomFormField, { FormFieldType } from "@/components/CustomFormField";

// Define the validation schema
export const VerificationSchema = z.object({
  phone: z.string().min(3, "Please enter a phone number (can be fake)"),
});

export const VerificationCodeSchema = z.object({
  phone: z.string().min(3, "Please enter a phone number"),
  code: z.string().length(6, "Verification code must be 6 digits"),
});

interface PhoneVerificationProps {
  phone: string;
  onVerified: () => void;
}

const PhoneVerification = ({ phone, onVerified }: PhoneVerificationProps) => {
  const [step, setStep] = useState<"send" | "verify">("send");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationComplete, setVerificationComplete] = useState(false);
  
  // Form for sending code
  const sendForm = useForm<z.infer<typeof VerificationSchema>>({
    resolver: zodResolver(VerificationSchema),
    defaultValues: {
      phone,
    },
  });

  // Form for verifying code
  const verifyForm = useForm<z.infer<typeof VerificationCodeSchema>>({
    resolver: zodResolver(VerificationCodeSchema),
    defaultValues: {
      phone,
      code: "",
    },
  });

  // Send verification code
  const handleSendCode = async (values: z.infer<typeof VerificationSchema>) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await sendVerificationSMS(values.phone);

      if (result.success) {
        setStep("verify");
        setSuccessMessage("Verification code sent! Check the console output.");
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      console.error("Error sending verification code:", error);
      setErrorMessage("Failed to send verification code. Please try again.");
    }

    setIsLoading(false);
  };

  // Verify the code
  const handleVerifyCode = async (values: z.infer<typeof VerificationCodeSchema>) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await verifyCode(values.phone, values.code);

      if (result.success) {
        setSuccessMessage("Phone verified successfully!");
        setVerificationComplete(true);
        // Wait a moment before calling onVerified to show the success message
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      setErrorMessage("Failed to verify code. Please try again.");
    }

    setIsLoading(false);
  };

  // Resend code
  const handleResendCode = async () => {
    const values = verifyForm.getValues();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await sendVerificationSMS(values.phone);

      if (!result.success) {
        setErrorMessage(result.message);
      } else {
        setSuccessMessage("New verification code sent! Check the console output.");
      }
    } catch (error) {
      console.error("Error resending verification code:", error);
      setErrorMessage("Failed to resend verification code. Please try again.");
    }

    setIsLoading(false);
  };

  // Function to go back to send code step
  const handleBackToSend = () => {
    setStep("send");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Phone Verification</h2>
        <p className="text-dark-700">
          We need to verify your phone number for security purposes.
          <br />
          <span className="text-sm italic">(Using fake numbers for development - verification codes will appear in console)</span>
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {step === "send" ? (
        <Form {...sendForm}>
          <form onSubmit={sendForm.handleSubmit(handleSendCode)} className="space-y-4">
            <CustomFormField
              fieldType={FormFieldType.PHONE_INPUT}
              control={sendForm.control}
              name="phone"
              label="Phone Number (can be fake)"
              placeholder="(555) 123-4567"
              disabled={false} // Allow editing the phone number
            />

            <Button type="submit" className="w-full" disabled={isLoading || verificationComplete}>
              {isLoading ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...verifyForm}>
          <form onSubmit={verifyForm.handleSubmit(handleVerifyCode)} className="space-y-4">
            {/* Show phone number as readonly */}
            <CustomFormField
              fieldType={FormFieldType.PHONE_INPUT}
              control={verifyForm.control}
              name="phone"
              label="Phone Number"
              disabled
            />
            
            {/* Add proper code input field */}
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={verifyForm.control}
              name="code"
              label="Verification Code"
              placeholder="Enter 6-digit code from console"
            />

            <div className="text-sm text-dark-700">
              Didn't receive a code?{" "}
              <button
                type="button"
                className="text-primary-600 hover:underline"
                onClick={handleResendCode}
                disabled={isLoading || verificationComplete}
              >
                Resend
              </button>
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button 
                type="button" 
                className="w-full sm:w-1/3" 
                variant="outline" 
                onClick={handleBackToSend}
                disabled={isLoading || verificationComplete}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-2/3" 
                disabled={isLoading || verificationComplete}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default PhoneVerification;