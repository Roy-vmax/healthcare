"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Doctors } from "@/constants";
import { getAppointment, updateAppointment } from "@/lib/actions/appointment.actions";
import { formatDateTime } from "@/lib/utils";
import { useState, useEffect } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";

interface SearchParamProps {
  searchParams: {
    appointmentId?: string;
    [key: string]: string | string[] | undefined;
  };
  params: {
    userId: string;
  };
}

export default function RequestSuccess({
  searchParams,
  params: { userId },
}: SearchParamProps) {
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancelled, setIsCancelled] = useState(false);

  const appointmentId = (searchParams?.appointmentId as string) || "";

  // Payment details
  const paymentDetails = {
    amount: "50.00",
    paymentId: "PAY-" + appointmentId.substring(0, 8),
    date: new Date().toLocaleDateString(),
    method: "Credit Card (••••1234)",
    status: "Paid",
  };

  // Fetch appointment data on component mount
  useEffect(() => {
    async function loadAppointmentData() {
      try {
        setIsLoading(true);
        const data = await getAppointment(appointmentId);
        setAppointmentData(data);
        
        // Check if appointment is already cancelled
        if (data.status === "cancelled") {
          setIsCancelled(true);
        }

        // Get appointment cost based on doctor
        const doctorRates: Record<string, string> = {
          "Dr. Sarah Johnson": "75.00",
          "Dr. Michael Chen": "65.00",
          "Dr. Emily Rodriguez": "60.00",
        };
        
        // Update payment amount if doctor has a specific rate
        if (doctorRates[data.primaryPhysician]) {
          paymentDetails.amount = doctorRates[data.primaryPhysician];
        }

        const doctorData = Doctors.find(
          (doc) => doc.name === data.primaryPhysician
        );
        setDoctor(doctorData);
      } catch (error) {
        console.error("Error loading appointment data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (appointmentId) {
      loadAppointmentData();
    }
  }, [appointmentId]);

  const handleDownloadReceipt = () => {
    setIsDownloading(true);

    try {
      // Create a more detailed receipt text that includes reason and notes
      const receiptContent = `
CarePulse Receipt
-----------------
Appointment ID: ${appointmentId}
Doctor: ${appointmentData?.primaryPhysician || "Unknown"}
Date: ${appointmentData ? formatDateTime(appointmentData.schedule).dateTime : ""}
Reason: ${appointmentData?.reason || "Not specified"}
Notes: ${appointmentData?.note || "None"}
Status: ${isCancelled ? "Cancelled" : "Active"}

Payment Details:
Amount: $${paymentDetails.amount}
Payment ID: ${paymentDetails.paymentId}
Payment Date: ${paymentDetails.date}
Payment Method: ${paymentDetails.method}
Status: ${isCancelled ? "Refunded" : paymentDetails.status}
      `;

      // Create a Blob and download it
      const blob = new Blob([receiptContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${appointmentId.substring(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading receipt:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancellationReason.trim()) {
      Toast({
        title: "Cancellation reason required",
        content: "Please provide a reason for cancelling your appointment.",
        variant: "destructive",
      });
      return;
    }

    setIsCancelling(true);
    
    try {
      const appointmentToUpdate = {
        userId,
        appointmentId: appointmentId,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        appointment: {
          primaryPhysician: appointmentData.primaryPhysician,
          schedule: new Date(appointmentData.schedule),
          status: "cancelled" as "cancelled",
          cancellationReason: cancellationReason,
        },
        type: "cancel" as "cancel",
      };

      const updatedAppointment = await updateAppointment(appointmentToUpdate);

      if (updatedAppointment) {
        setIsCancelled(true);
        setShowCancelDialog(false);
        
        // Update local appointment data
        setAppointmentData({
          ...appointmentData,
          status: "cancelled",
          cancellationReason: cancellationReason
        });

        Toast({
          title: "Appointment Cancelled",
          content: "Your appointment has been successfully cancelled and a refund will be processed.",
        });
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      Toast({
        title: "Cancellation failed",
        content: "There was an error cancelling your appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Loading appointment details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white pt-10 pb-8 px-6">
      <Link href="/" className="mb-10">
        <Image
          src="/assets/icons/logo-full.svg"
          height={1000}
          width={1000}
          alt="logo"
          className="h-10 w-fit"
        />
      </Link>

      <div className="flex flex-col items-center max-w-4xl w-full">
        <section className="flex flex-col items-center mb-12 text-center">
          <Image
            src={isCancelled ? "/assets/gifs/cancelled.gif" : "/assets/gifs/success.gif"}
            height={300}
            width={280}
            alt={isCancelled ? "cancelled" : "success"}
            className="mb-6"
          />
          <h2 className="text-3xl font-bold mb-6">
            {isCancelled ? (
              <>Your appointment has been <span className="text-red-400">cancelled</span></>
            ) : (
              <>Your <span className="text-green-400">appointment request</span> has been successfully submitted and paid!</>
            )}
          </h2>
          <p className="text-lg text-gray-300">
            {isCancelled 
              ? "Your refund will be processed within 3-5 business days."
              : "We'll be in touch shortly to confirm."
            }
          </p>
        </section>

        <div className="flex flex-col md:flex-row w-full gap-8 mb-10">
          <section className="bg-gray-800 rounded-xl p-6 flex-1">
            <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
              Appointment Details {isCancelled && <span className="text-red-400 text-sm ml-2">Cancelled</span>}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-500 rounded-full p-2">
                <Image
                  src={doctor?.image || "/assets/icons/doctor-placeholder.svg"}
                  alt="doctor"
                  width={24}
                  height={24}
                  className="size-5"
                />
              </div>
              <p className="text-lg">{appointmentData?.primaryPhysician || "Unknown"}</p>
            </div>
            
            <div className="flex gap-3 items-center mb-4">
              <div className="bg-green-500 rounded-full p-2">
                <Image
                  src="/assets/icons/calendar.svg"
                  height={24}
                  width={24}
                  alt="calendar"
                  className="size-5"
                />
              </div>
              <p className="text-gray-200">
                {appointmentData
                  ? formatDateTime(appointmentData.schedule).dateTime
                  : "Loading..."}
              </p>
            </div>
            
            {/* Reason section */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-300 mb-2">Reason for Appointment:</h4>
              <div className="bg-gray-700 rounded-lg p-3 mb-4">
                <p className="text-gray-200">{appointmentData?.reason || "Not specified"}</p>
              </div>
            </div>
            
            {/* Notes section */}
            {appointmentData?.note && (
              <div>
                <h4 className="text-md font-medium text-gray-300 mb-2">Additional Notes:</h4>
                <div className="bg-gray-700 rounded-lg p-3">
                  <p className="text-gray-200">{appointmentData.note}</p>
                </div>
              </div>
            )}
            
            {/* Cancellation reason */}
            {isCancelled && appointmentData?.cancellationReason && (
              <div className="mt-4">
                <h4 className="text-md font-medium text-red-300 mb-2">Cancellation Reason:</h4>
                <div className="bg-gray-700 border border-red-800/30 rounded-lg p-3">
                  <p className="text-gray-200">{appointmentData.cancellationReason}</p>
                </div>
              </div>
            )}
          </section>

          <section className="bg-gray-800 rounded-xl p-6 flex-1">
            <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
              Payment Receipt
            </h3>
            <div className="grid grid-cols-2 gap-y-3 mb-6">
              <p className="text-gray-400">Amount:</p>
              <p className="font-medium">${paymentDetails.amount}</p>

              <p className="text-gray-400">Payment ID:</p>
              <p className="font-medium">{paymentDetails.paymentId}</p>

              <p className="text-gray-400">Date:</p>
              <p className="font-medium">{paymentDetails.date}</p>

              <p className="text-gray-400">Method:</p>
              <p className="font-medium">{paymentDetails.method}</p>

              <p className="text-gray-400">Status:</p>
              <p className={`font-medium ${isCancelled ? "text-orange-400" : "text-green-400"}`}>
                {isCancelled ? "Refunded" : paymentDetails.status}
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-white p-1 rounded-lg mb-2">
                <Image
                  src="/assets/images/qr2.png"
                  alt="Receipt QR Code"
                  width={150}
                  height={150}
                  className="rounded"
                />
              </div>
              <p className="text-sm text-gray-400">Scan to download receipt</p>
            </div>
          </section>
        </div>

        <div className="flex gap-4 flex-wrap justify-center">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            asChild
          >
            <Link href={`/patients/${userId}/new-appointment`}>
              New Appointment
            </Link>
          </Button>

          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
          >
            {isDownloading ? "Downloading..." : "Download Receipt"}
          </Button>
          
          {!isCancelled && (
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              onClick={() => setShowCancelDialog(true)}
            >
              Cancel Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Cancellation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Cancel Your Appointment</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to cancel your appointment with {appointmentData?.primaryPhysician} on {appointmentData ? formatDateTime(appointmentData.schedule).dateTime : ""}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium block mb-2">
              Please provide a reason for cancellation:
            </label>
            <Textarea
              className="bg-gray-700 border-gray-600 focus:border-purple-500 text-white"
              placeholder="E.g., Schedule conflict, feeling better, etc."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
          
          <DialogFooter className="flex space-x-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              Keep Appointment
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelAppointment}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="mt-16 text-gray-400">© 2025 CarePulse</p>
    </div>
  );
}