import React, { useState, useEffect } from 'react';
import { MapPin, Battery, Clock, AlertCircle, ThumbsUp } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import { db } from '../firebaseConfig'; // Import the Firestore instance
import { collection, getDocs } from 'firebase/firestore';
import '../components/styles/global.css';
import WheelchairMap from '../components/views/WheelChairMap';
import { doc, updateDoc } from 'firebase/firestore';
import QRScanner from '../components/views/QRScanner';
import QRCode from 'qrcode';

const WheelPort = () => {
  const [view, setView] = useState('map');
  const [selectedChair, setSelectedChair] = useState(null);
  const [timer, setTimer] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [wheelchairs, setWheelchairs] = useState([]); // State to store data from Firebase

  useEffect(() => {
    // Fetch wheelchair data from Firebase Firestore
    const fetchWheelchairs = async () => {
      const wheelchairCollection = collection(db, 'wheelchairs');
      const wheelchairSnapshot = await getDocs(wheelchairCollection);
      const wheelchairData = wheelchairSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWheelchairs(wheelchairData);
    };

    fetchWheelchairs();
  }, []);

  useEffect(() => {
    let interval;
    if (view === 'active') {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const MapView = () => (
    <div className="p-4 space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Current Location</h3>
              <p className="text-sm text-gray-500">Terminal 1 - Main Entrance</p>
            </div>
            <MapPin className="text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Available Wheelchairs</h2>
        {wheelchairs.map(chair => (
          <Card 
          key={chair.id}
          className={`cursor-pointer hover:shadow-md transition-shadow ${chair.status === 'in_use' ? 'opacity-50' : ''}`}
          onClick={() => {
            if (chair.status === 'available') {
              setSelectedChair(chair); // Set the selected wheelchair
              setView('booking');      // Go directly to the booking view
            }
          }}
          >        
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{chair.id}</h3>
                  <p className="text-sm text-gray-500">{chair.location}</p>
                  <p className="text-xs text-gray-400 mt-1">{chair.distance}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <Battery className="text-green-500" size={18} />
                    <span className="text-sm text-gray-600">{chair.battery}%</span>
                  </div>
                  <span className={`text-xs mt-1 ${
                    chair.status === 'available' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {chair.status === 'available' ? 'Available' : 'In Use'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const confirmBooking = async () => {
    if (selectedChair) {
      const wheelchairDoc = doc(db, 'wheelchairs', selectedChair.id);
      
      try {
        // Generate QR code content (you can customize this)
        const qrContent = `wheelchair:${selectedChair.id}`;
        const qrCodeDataURL = await QRCode.toDataURL(qrContent);
  
        // Update Firestore: status and QR code
        await updateDoc(wheelchairDoc, { 
          status: 'in_use',
          qrCode: qrCodeDataURL // Store the QR code data URL
        });
  
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setView('scanner'); // Navigate to scanner view
        }, 2000);
      } catch (error) {
        console.error('Error generating QR code:', error);
        alert('Failed to confirm booking. Please try again.');
      }
    }
  };
  
  const handleQRScan = (data) => {
    if (data) {
      setView('active');  // Go to Active Booking page upon scan
    }
  };
  
  const BookingView = () => (
    <div className="p-4 space-y-4">
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">Confirm Booking</h2>
          
          {/* Show the wheelchair map */}
          {selectedChair && (
            <WheelchairMap wheelchair={{
              name: selectedChair.id,
              status: selectedChair.status,
              distance: selectedChair.distance,
              estimatedTime: selectedChair.estimatedTime || 'N/A', // Ensure this data is in Firestore
              battery: selectedChair.battery,
            }} />
          )}
  
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">{selectedChair.id}</h3>
                <p className="text-sm text-gray-500">{selectedChair.location}</p>
              </div>
              <div className="flex items-center gap-1">
                <Battery className="text-green-500" size={18} />
                <span className="text-sm text-gray-600">{selectedChair.battery}%</span>
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Please ensure you've read the usage instructions on the wheelchair before proceeding.
              </AlertDescription>
            </Alert>
            <button
              onClick={confirmBooking}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600"
            >
              Confirm Booking
            </button>
            <button
              onClick={() => setView('map')}
              className="w-full border border-gray-300 py-3 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ActiveView = () => (
    <div className="p-4 space-y-4">
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">Active Booking</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">{selectedChair.id}</h3>
                <p className="text-sm text-gray-500">{selectedChair.location}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <Clock className="text-blue-500" size={18} />
                  <span className="text-sm text-gray-600">{formatTime(timer)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Battery className="text-green-500" size={18} />
                  <span className="text-sm text-gray-600">{selectedChair.battery}%</span>
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Need Help?</AlertTitle>
              <AlertDescription>
                Call support at 1-800-HELP for immediate assistance.
              </AlertDescription>
            </Alert>

            <button
              onClick={() => {
                setView('map');
                setSelectedChair(null);
                setTimer(0);
              }}
              className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600"
            >
              End Trip
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-xl font-bold text-center">WheelPort</h1>
      </div>
      {view === 'map' && <MapView />}
      {view === 'scanner' && <QRScanner onScan={handleQRScan} />}
      {view === 'booking' && <BookingView />}
      {view === 'active' && <ActiveView />}
      {showSuccess && (
        <div className="fixed bottom-4 left-4 right-4 bg-green-500 text-white p-4 rounded-lg flex items-center gap-2">
          <ThumbsUp size={20} />
          <span>Booking confirmed successfully!</span>
        </div>
      )}
    </div>
  );
};

export default WheelPort;