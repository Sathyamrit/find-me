// src/components/CameraModal.jsx
import { useState, useRef, useEffect } from 'react';
import './CameraModal.css'; // We'll create this CSS file

const CameraModal = ({ isOpen, onClose, onCapture }) => {
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const startCamera = async () => {
      if (isOpen) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
          });
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          alert("Could not access camera. Please ensure you have given permission.");
          onClose(); // Close modal if camera access fails
        }
      }
    };

    startCamera();

    // Cleanup function to stop the camera stream
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]); // Effect runs when `isOpen` changes

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame onto the canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert the canvas image to a Blob
      canvas.toBlob((blob) => {
        // Create a File object from the Blob
        const fileName = `capture-${new Date().toISOString()}.jpeg`;
        const capturedFile = new File([blob], fileName, { type: 'image/jpeg' });
        
        // Pass the file back to the parent component
        onCapture(capturedFile);
        onClose();
      }, 'image/jpeg');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <video ref={videoRef} autoPlay playsInline className="video-feed"></video>
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        <div className="modal-actions">
          <button onClick={handleCapture} className="capture-btn">Take Photo</button>
          <button onClick={onClose} className="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CameraModal;