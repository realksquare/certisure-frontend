import React, { useState, useCallback } from 'react';
import './UploadComponent.css';

// The CORRECT, Vite-compatible way to import ALL dependencies
import * as pdfjs from 'pdfjs-dist/build/pdf.js';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import jsQR from 'jsqr/dist/jsQR.js';
import SHA256 from 'crypto-js/esm/sha256.js';

const UploadComponent = ({ title, userType }) => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setStatus(selectedFile ? 'PDF selected. Click "Process PDF" to scan.' : '');
        setResult(null);
    };

    const createStableHash = (data) => {
        const sortObject = (obj) => {
            if (typeof obj !== 'object' || obj === null) return obj;
            return Object.keys(obj).sort().reduce((acc, key) => {
                acc[key] = sortObject(obj[key]);
                return acc;
            }, {});
        };
        const sortedData = sortObject(data);
        const stringToHash = JSON.stringify(sortedData);
        return SHA256(stringToHash).toString();
    };

    const handleProcessClick = () => {
        setStatus('Processing PDF... The page will render invisibly to be scanned.');
    };

    const onRenderSuccess = useCallback((canvas) => {
        if (!canvas) {
            setStatus('Error: PDF canvas could not be rendered.');
            return;
        }
        
        setStatus('PDF rendered, scanning for QR code...');
        try {
            const context = canvas.getContext('2d');
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (!code) {
                throw new Error('Could not find a QR code in the PDF.');
            }

            const rawQrData = code.data;
            handleVerification(rawQrData);

        } catch (error) {
             setStatus(`Error processing PDF: ${error.message}`);
        }
    }, [userType]);

    const handleVerification = async (rawQrData) => {
        try {
            const certificateData = JSON.parse(rawQrData);
            const dataHash = createStableHash(certificateData);

            let endpoint = '';
            let payload = {};

            if (userType === 'institution') {
                endpoint = '/api/create-record';
                payload = { certificateData, dataHash };
            } else {
                endpoint = '/api/verify-record';
                payload = { dataHash };
            }

            setStatus('Contacting server...');
            const res = await fetch(`https://certisure-backend.vercel.app${endpoint}`, { // Assuming your backend URL is this
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const resData = await res.json();

            if (!res.ok) {
                throw new Error(resData.message || 'An error occurred.');
            }

            setStatus(resData.message || 'Verification successful!');
            if (resData.verified) {
                setResult(resData.certificate);
            }
        } catch (error) {
             setStatus(`Error during verification: ${error.message}`);
        }
    };

    return (
        <div className="upload-container">
            <h2>{title}</h2>
            <div className="form-controls">
                <input type="file" accept=".pdf" onChange={handleFileChange} />
                <button onClick={handleProcessClick} disabled={!file}>Process PDF</button>
            </div>

            <div className="pdf-preview" style={{ display: 'none' }}>
                {file && (
                    <Document file={file}>
                        <Page pageNumber={1} onRenderSuccess={onRenderSuccess} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                )}
            </div>

            {status && <p className="status-message">{status}</p>}
            {result && (
                <div className="result-container">
                    <h3>Verified Certificate Details:</h3>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default UploadComponent;