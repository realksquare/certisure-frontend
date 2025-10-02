import React, { useState, useRef } from 'react';

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js`;

export default function PdfScanner() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setResult(null);
    setSelectedFile(file || null);
  };

  const handleProcessAndVerify = async () => {
    if (!selectedFile) {
        setResult({ status: 'error', message: 'Please select a PDF file first.' });
        return;
    }
    setIsProcessing(true);
    setResult(null);
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

          // FINAL LOGIC FIX FOR VERIFIER SIDE
          let qrPayload;
          try {
            qrPayload = JSON.parse(qrCode.data);
          } catch (jsonError) {
            throw new Error('Invalid QR Code for verification. The QR code must contain a CertiSure verification proof (ID and hash), not raw data.');
          }

          if (!qrPayload.id || !qrPayload.hash) {
            throw new Error('Invalid proof format in QR Code. Required fields "id" and "hash" are missing.');
          }

          const { id, hash: qrHash } = qrPayload;
          const res = await fetch(`http://localhost:3000/api/certificates/${id}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);
          const dbCertificate = data.certificate;
          if (qrHash === dbCertificate.dataHash) {
              setResult({ status: 'success', data: dbCertificate });
          } else {
              throw new Error('Verification Failed: Hashes do not match. The certificate may have been altered.');
          }
        } catch (err) {
            setResult({ status: 'error', message: err.message });
        } finally {
            setIsProcessing(false);
        }
      };
      fileReader.readAsArrayBuffer(selectedFile);
    } catch (err) {
        setResult({ status: 'error', message: err.message });
        setIsProcessing(false);
    }
  };

  return (
    <div>
      <h2>Verify by Uploading Certificate PDF</h2>
      <p>1. Select the certificate PDF to verify.</p>
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      
      {selectedFile && (
        <div style={{ marginTop: '15px' }}>
            <p>2. Verify the selected file: <strong>{selectedFile.name}</strong></p>
            <button onClick={handleProcessAndVerify} disabled={isProcessing}>
                {isProcessing ? 'Verifying...' : 'Verify from PDF'}
            </button>
        </div>
      )}
      
      {result && result.status === 'error' && <p style={{ color: 'red', marginTop: '15px' }}>{result.message}</p>}
      
      {result && result.status === 'success' && (
        <div style={{ marginTop: '20px', padding: '15px', border: '2px solid green', borderRadius: '8px' }}>
          <h3 style={{ color: 'green' }}>&#10004; Certificate Verified</h3>
          <p><strong>Student Name:</strong> {result.data.studentName}</p>
          <p><strong>Course Name:</strong> {result.data.courseName}</p>
          <p><strong>Issuing Institution:</strong> {result.data.issuingInstitution}</p>
          <p><strong>Issue Date:</strong> {result.data.issueDate}</p>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
}