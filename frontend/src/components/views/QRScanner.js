import React, { useState } from 'react';
import QrScanner from 'react-qr-scanner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const QRScanner = ({ onScan }) => {
  const [error, setError] = useState(null);

  const handleScan = async (data) => {
    if (data) {
      try {
        const scannedData = JSON.parse(data.text);
        
        // Verify the QR code against Firebase
        const wheelchairDoc = doc(db, 'wheelchairs', scannedData.wheelchairId);
        const wheelchairData = await getDoc(wheelchairDoc);
        
        if (wheelchairData.exists()) {
          const wheelchair = wheelchairData.data();
          
          if (wheelchair.currentBookingId === scannedData.bookingId) {
            onScan(scannedData);
          } else {
            setError('Invalid or expired QR code');
          }
        } else {
          setError('Wheelchair not found');
        }
      } catch (err) {
        setError('Invalid QR code format');
        console.error('QR Scan Error:', err);
      }
    }
  };

  const handleError = (err) => {
    setError('Error scanning QR code');
    console.error("QR Scan Error:", err);
  };

  return (
    <div className="p-4 text-center">
      <h2 className="text-lg font-semibold mb-4">Scan the QR Code to Start Your Trip</h2>
      <div className="flex justify-center">
        <QrScanner
          delay={300}
          style={{ height: 240, width: 320 }}
          onError={handleError}
          onScan={handleScan}
        />
      </div>
      {error && (
        <div className="mt-4 text-red-500">
          {error}
        </div>
      )}
    </div>
  );
};

export default QRScanner;