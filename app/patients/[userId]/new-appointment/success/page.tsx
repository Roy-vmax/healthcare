"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Doctors } from "@/constants";
import { getAppointment } from "@/lib/actions/appointment.actions";
import { formatDateTime } from "@/lib/utils";
import { useState, useEffect } from "react";

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

  const appointmentId = (searchParams?.appointmentId as string) || "";

  // Payment details
  const paymentDetails = {
    amount: "$15.00",
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
      // Create a simple receipt text
      const receiptContent = `
CarePulse Receipt
-----------------
Appointment ID: ${appointmentId}
Doctor: Dr. ${doctor?.name || "Unknown"}
Date: ${appointmentData ? formatDateTime(appointmentData.schedule).dateTime : ""}
Amount: ${paymentDetails.amount}
Payment ID: ${paymentDetails.paymentId}
Payment Date: ${paymentDetails.date}
Payment Method: ${paymentDetails.method}
Status: ${paymentDetails.status}
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
            src="/assets/gifs/success.gif"
            height={300}
            width={280}
            alt="success"
            className="mb-6"
          />
          <h2 className="text-3xl font-bold mb-6">
            Your <span className="text-green-400">appointment request</span> has
            been successfully submitted!
          </h2>
          <p className="text-lg text-gray-300">
            We'll be in touch shortly to confirm.
          </p>
        </section>

        <div className="flex flex-col md:flex-row w-full gap-8 mb-10">
          <section className="bg-gray-800 rounded-xl p-6 flex-1">
            <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
              Appointment Details
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
              <p className="text-lg">Dr. {doctor?.name || "Unknown"}</p>
            </div>
            <div className="flex gap-3 items-center">
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
          </section>

          <section className="bg-gray-800 rounded-xl p-6 flex-1">
            <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
              Payment Receipt
            </h3>
            <div className="grid grid-cols-2 gap-y-3 mb-6">
              <p className="text-gray-400">Amount:</p>
              <p className="font-medium">{paymentDetails.amount}</p>

              <p className="text-gray-400">Payment ID:</p>
              <p className="font-medium">{paymentDetails.paymentId}</p>

              <p className="text-gray-400">Date:</p>
              <p className="font-medium">{paymentDetails.date}</p>

              <p className="text-gray-400">Method:</p>
              <p className="font-medium">{paymentDetails.method}</p>

              <p className="text-gray-400">Status:</p>
              <p className="font-medium text-green-400">
                {paymentDetails.status}
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

        <div className="flex gap-4">
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
        </div>
      </div>

      <p className="mt-16 text-gray-400">© 2025 CarePulse</p>
    </div>
  );
}
