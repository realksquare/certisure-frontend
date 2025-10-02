import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import jsQR from 'jsqr';
import SHA256 from 'crypto-js/sha256';
import './UploadComponent.css';

// Set up the worker for react-pdf. This is the official, correct way.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
};

const UploadComponent = ({ title, userType }) => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');
    const [result, setResult] = useState(null);
    const [numPages, setNumPages] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStatus('');
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

    // This function will be called when the PDF page has rendered to a canvas
    const onRenderSuccess = useCallback((canvas) => {
        if (!canvas) return;
        
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
            const res = await fetch(`https://certisure-backend-omega.vercel.app${endpoint}`, {
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
            <form onSubmit={(e) => e.preventDefault()}>
                <input type="file" accept=".pdf" onChange={handleFileChange} />
            </form>
            {/* The Document component handles rendering. We hide it but use it to generate the canvas. */}
            {file && (
                 <div className="pdf-preview" style={{ display: 'none' }}>
                    <Document file={file} options={options}>
                        <Page pageNumber={1} onRenderSuccess={onRenderSuccess} />
                    </Document>
                </div>
            )}
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