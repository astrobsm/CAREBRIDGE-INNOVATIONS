/**
 * Booking Share & QR Code Page
 * 
 * Admin page to share booking links and QR codes with patients.
 * Allows easy sharing via WhatsApp and other channels.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, 
  Share2, 
  Copy, 
  Download,
  Building2,
  ExternalLink,
  Check,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';
import { CLINIC_LOCATIONS, formatTime12Hour } from '../../../../data/clinicLocations';
import type { ClinicLocationConfig } from '../../../../types';
import toast from 'react-hot-toast';

// QR Code API URL (using free QR code API)
const getQRCodeUrl = (data: string, size: number = 300): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
};

const BookingSharePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClinic, setSelectedClinic] = useState<ClinicLocationConfig | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Get the base URL
  const baseUrl = window.location.origin;
  
  // Generate booking link
  const getBookingLink = (clinic?: ClinicLocationConfig): string => {
    if (clinic) {
      return `${baseUrl}/book-appointment?hospital=${clinic.hospitalCode}`;
    }
    return `${baseUrl}/book-appointment`;
  };
  
  // Copy link to clipboard
  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };
  
  // Share via WhatsApp
  const handleShareWhatsApp = (clinic?: ClinicLocationConfig) => {
    const link = getBookingLink(clinic);
    let message = '📅 Book your clinic appointment online!\n\n';
    
    if (clinic) {
      message += `🏥 ${clinic.hospitalName}\n`;
      message += `📆 ${clinic.dayName}s\n`;
      message += `🕐 ${formatTime12Hour(clinic.startTime)} - ${formatTime12Hour(clinic.endTime)}\n\n`;
    } else {
      message += 'Select your preferred hospital and time slot.\n\n';
    }
    
    message += `👉 Book Now: ${link}\n\n`;
    message += 'CareBridge Health';
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };
  
  // Download QR code
  const handleDownloadQR = async (clinic?: ClinicLocationConfig) => {
    const link = getBookingLink(clinic);
    const qrUrl = getQRCodeUrl(link, 500);
    
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = clinic 
        ? `booking-qr-${clinic.hospitalCode.toLowerCase()}.png`
        : 'booking-qr-all.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('QR code downloaded!');
    } catch (error) {
      toast.error('Failed to download QR code');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-primary mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <QrCode className="h-8 w-8 text-primary" />
            Share Booking Links
          </h1>
          <p className="text-gray-600 mt-2">
            Generate QR codes and shareable links for patients to book appointments
          </p>
        </div>
        
        {/* Universal Booking Link */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Universal Booking Link (All Clinics)
          </h2>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* QR Code */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-xl p-2">
                <img
                  src={getQRCodeUrl(getBookingLink())}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            
            {/* Link and Actions */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Booking URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={getBookingLink()}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={() => handleCopyLink(getBookingLink())}
                    className={`p-2 rounded-lg transition-all ${
                      copiedLink 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {copiedLink ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleShareWhatsApp()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <MessageCircle className="h-5 w-5" />
                  Share via WhatsApp
                </button>
                
                <button
                  onClick={() => handleDownloadQR()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Download className="h-5 w-5" />
                  Download QR Code
                </button>
                
                <button
                  onClick={() => window.open(getBookingLink(), '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <ExternalLink className="h-5 w-5" />
                  Open Page
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Hospital-Specific Links */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Hospital-Specific Links
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          {CLINIC_LOCATIONS.filter(c => c.isActive).map(clinic => (
            <div key={clinic.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{clinic.hospitalName}</h3>
                  <p className="text-sm text-gray-600">
                    {clinic.dayName} • {formatTime12Hour(clinic.startTime)} - {formatTime12Hour(clinic.endTime)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Mini QR */}
                <div className="w-24 h-24 bg-white border border-gray-200 rounded-lg p-1 flex-shrink-0">
                  <img
                    src={getQRCodeUrl(getBookingLink(clinic), 200)}
                    alt={`QR Code for ${clinic.hospitalName}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {/* Actions */}
                <div className="flex-1 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCopyLink(getBookingLink(clinic))}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </button>
                  
                  <button
                    onClick={() => handleShareWhatsApp(clinic)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </button>
                  
                  <button
                    onClick={() => handleDownloadQR(clinic)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-3">How to Use</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Download the QR code and print it to display in your clinic or waiting area.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Share the booking link via WhatsApp to patients who call for appointments.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Use hospital-specific links to pre-select the clinic location for patients.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Patients can scan the QR code or click the link to book without logging in.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BookingSharePage;
