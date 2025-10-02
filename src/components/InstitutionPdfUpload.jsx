import React, { useState, useRef } from 'react';

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js`;

export default function InstitutionPdfUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const canvasRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setResponse(null);
    setErrorMessage(null);
    setSelectedFile(file || null);
  };

  const handleProcessAndCreate = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a PDF file first.');
      return;
    }

    setIsProcessing(true);
    setResponse(null);
    setErrorMessage(null);

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          const page = await pdf.getPage(1);

          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = canvasRef.current;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const context = canvas.getContext('2d');
          await page.render({ canvasContext: context, viewport: viewport }).promise;

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = window.jsQR(imageData.data, imageData.width, imageData.height);

          if (!qrCode) {
            throw new Error('No QR code found in the PDF.');
          }

          let certificateData;
          try {
            certificateData = JSON.parse(qrCode.data);
          } catch (jsonError) {
            throw new Error('Invalid QR Code for creation. The QR code must contain raw certificate data in JSON format, not a URL or verification proof.');
          }
          
          if (!certificateData.studentName || !certificateData.courseName) {
            throw new Error('Invalid data format in QR Code. Required fields like "studentName" and "courseName" are missing.');
          }

          const res = await fetch('http://localhost:3000/api/certificates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(certificateData),
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);

          setResponse(data);
        } catch (err) {
            setErrorMessage(err.message);
        } finally {
            setIsProcessing(false);
        }
      };
      fileReader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      setErrorMessage(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h2>Create by Uploading Existing Certificate</h2>
      <p>1. Select a PDF that contains a QR code with the certificate's raw data.</p>
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      {selectedFile && (
        <div style={{ marginTop: '15px' }}>
          <p>2. Process the selected file: <strong>{selectedFile.name}</strong></p>
          <button onClick={handleProcessAndCreate} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Create Record from PDF'}
          </button>
        </div>
      )}
      
      {errorMessage && <p style={{ color: 'red', marginTop: '15px' }}>{errorMessage}</p>}
      
      {response && (
        <div style={{ marginTop: '20px', padding: '15px', border: '2px solid green', borderRadius: '8px' }}>
          <h3 style={{ color: 'green' }}>&#10004; Record Created Successfully!</h3>
          <p>Official QR Code:</p>
          <img src={response.qrCode} alt="Official CertiSure QR Code" />
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
}