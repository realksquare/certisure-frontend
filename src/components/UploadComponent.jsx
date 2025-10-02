import React, { useState } from 'react';
import './UploadComponent.css';

// The CORRECT, Vite-compatible way to import ALL dependencies
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import jsQR from 'jsqr/dist/jsQR.js';
import SHA256 from 'crypto-js/esm/sha256.js';


const UploadComponent = ({ title, userType }) => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');
    const [result, setResult] = useState(null);

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

    const getQrDataFromPdf = async (file) => {
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            fileReader.onload = async (event) => {
                const data = new Uint8Array(event.target.result);
                try {
                    const pdf = await pdfjs.getDocument(data).promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 1.5 });

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport }).promise;
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        resolve(code.data);
                    } else {
                        reject(new Error('Could not find a QR code in the PDF.'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            fileReader.onerror = reject;
            fileReader.readAsArrayBuffer(file);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setStatus('Please select a file.');
            return;
        }

        setStatus('Processing PDF... Please wait.');

        try {
            const rawQrData = await getQrDataFromPdf(file);
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
            // MAKE SURE YOU HAVE YOUR REAL BACKEND URL HERE
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
            setStatus(`Error: ${error.message}`);
            setResult(null);
        }
    };

    return (
        <div className="upload-container">
            <h2>{title}</h2>
            <form onSubmit={handleSubmit}>
                <input type="file" accept=".pdf" onChange={handleFileChange} />
                <button type="submit">Upload & Process</button>
            </form>
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