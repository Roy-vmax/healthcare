// PaymentForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form } from "@/components/ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Create different validation schemas based on payment method
const createPaymentSchema = (paymentMethod: string) => {
  const baseSchema = {
    paymentMethod: z.string().min(1, "Payment method is required"),
    saveCard: z.boolean().optional(),
  };

  if (paymentMethod === "card") {
    return z.object({
      ...baseSchema,
      cardholderName: z.string().min(1, "Cardholder name is required"),
      cardNumber: z
        .string()
        .min(13, "Card number must be at least 13 digits")
        .max(19, "Card number cannot exceed 19 digits")
        .regex(/^[0-9\s]+$/, "Card number must contain only digits and spaces"),
      expiryDate: z
        .string()
        .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, "Please use MM/YY format"),
      cvv: z
        .string()
        .min(3, "CVV must be at least 3 digits")
        .max(4, "CVV cannot exceed 4 digits")
        .regex(/^[0-9]+$/, "CVV must contain only digits"),
    });
  } else if (paymentMethod === "insurance") {
    return z.object({
      ...baseSchema,
      insuranceProvider: z.string().min(1, "Insurance provider is required"),
      insurancePolicyNumber: z.string().min(1, "Policy number is required"),
    });
  } else {
    // PayPal or other methods don't need additional validation
    return z.object({
      ...baseSchema,
    });
  }
};

const paymentMethods = [
  {
    name: "Credit/Debit Card",
    value: "card",
    icon: "/assets/icons/credit-card.svg",
  },
  {
    name: "PayPal",
    value: "paypal",
    icon: "/assets/icons/paypal.svg",
  },
  {
    name: "Insurance Copay",
    value: "insurance",
    icon: "/assets/icons/insurance.svg",
  },
];

interface PaymentFormProps {
  onPaymentComplete: () => void;
  appointmentCost: number;
}

export const PaymentForm = ({
  onPaymentComplete,
  appointmentCost = 50,
}: PaymentFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card");

  const PaymentFormValidation = createPaymentSchema(selectedPaymentMethod);

  const form = useForm<any>({
    resolver: zodResolver(PaymentFormValidation as any),
    defaultValues: {
      cardholderName: "",
      cardNumber: "",
      expiryDate: "",
      cvv: "",
      paymentMethod: "card",
      saveCard: false,
      insuranceProvider: "",
      insurancePolicyNumber: "",
    },
  });

  // Watch for payment method changes from the form
  const paymentMethodValue = form.watch("paymentMethod");

  // Update the selected payment method when form value changes
  useEffect(() => {
    if (paymentMethodValue && paymentMethodValue !== selectedPaymentMethod) {
      setSelectedPaymentMethod(paymentMethodValue);
    }
  }, [paymentMethodValue, selectedPaymentMethod]);

  const onSubmit = async (values: any) => {
    setIsLoading(true);

    // Simulating payment processing
    setTimeout(() => {
      setIsLoading(false);
      onPaymentComplete();
    }, 1500);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
        <section className="mb-8 space-y-4">
          <h1 className="header">Payment Details</h1>
          <p className="text-dark-700">
            Please provide your payment information to complete your appointment
            request.
          </p>
        </section>

        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-70 p-4">
          <div className="flex justify-between">
            <p className="text-sm text-dark-700">Appointment Fee:</p>
            <p className="font-medium">${appointmentCost.toFixed(2)}</p>
          </div>
        </div>

        <CustomFormField
          fieldType={FormFieldType.SELECT}
          control={form.control}
          name="paymentMethod"
          label="Payment Method"
          placeholder="Select payment method"
        >
          {paymentMethods.map((method) => (
            <SelectItem key={method.value} value={method.value}>
              <div className="flex cursor-pointer items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <Image
                    src={method.icon}
                    width={24}
                    height={24}
                    alt={method.name}
                  />
                </div>
                <p>{method.name}</p>
              </div>
            </SelectItem>
          ))}
        </CustomFormField>

        {selectedPaymentMethod === "card" && (
          <>
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="cardholderName"
              label="Cardholder Name"
              placeholder="John Doe"
            />

            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="cardNumber"
              label="Card Number"
              placeholder="4242 4242 4242 4242"
            />

            <div className="flex flex-col gap-6 sm:flex-row">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="expiryDate"
                label="Expiry Date (MM/YY)"
                placeholder="05/25"
              />

              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="cvv"
                label="CVV"
                placeholder="123"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="saveCard"
                onCheckedChange={(checked) =>
                  form.setValue("saveCard", checked === true)
                }
              />
              <Label htmlFor="saveCard" className="cursor-pointer text-sm">
                Save this card for future payments
              </Label>
            </div>
          </>
        )}

        {selectedPaymentMethod === "paypal" && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
            <div className="mb-4 w-32 h-8 relative">
              <Image
                src="/api/placeholder/120/40"
                alt="PayPal"
                layout="fill"
                objectFit="contain"
              />
            </div>
            <p className="text-sm text-dark-700 mb-4 text-center">
              You will be redirected to PayPal to complete your payment after
              submission.
            </p>
          </div>
        )}

        {selectedPaymentMethod === "insurance" && (
          <div className="space-y-4">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="insuranceProvider"
              label="Insurance Provider"
              placeholder="BlueCross BlueShield"
            />
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="insurancePolicyNumber"
              label="Insurance Policy Number"
              placeholder="ABC123456789"
            />
          </div>
        )}

        <SubmitButton isLoading={isLoading} className="shad-primary-btn w-full">
          Pay ${appointmentCost.toFixed(2)} & Submit Appointment
        </SubmitButton>
      </form>
    </Form>
  );
};
