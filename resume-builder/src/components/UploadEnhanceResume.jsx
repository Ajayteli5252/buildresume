import React, { useState } from 'react';
import resumeService from '../services/resumeService';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Update worker URL to use the correct file format (.mjs instead of .min.js)
GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.mjs";

const UploadEnhanceResume = ({ onResumeLoad }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [uploadedResume, setUploadedResume] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [showEnhanceOptions, setShowEnhanceOptions] = useState(false);

  const defaultResume = {
    name: "",
    role: "",
    phone: "",
    email: "",
    linkedin: "",
    location: "",
    summary: "",
    experience: [],
    education: [],
    skills: [],
    languages: [],
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage('');

    if (file.type === 'application/pdf') {
      // PDF upload handling
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target.result);
          const pdf = await getDocument({ data: typedarray }).promise;
          let textContent = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            textContent += content.items.map(item => item.str).join(' ') + '\n';
          }
          // You can further process textContent to extract fields, for now set as summary
          const resumeData = { ...defaultResume, summary: textContent };
          setUploadedResume(resumeData);
          setStatusMessage('PDF resume uploaded! Text extracted to summary.');
          setMessageType('success');
          setShowEnhanceOptions(true);
        } catch (error) {
          console.error('Error reading PDF:', error); // Improved error logging
          setStatusMessage('Failed to read PDF. Please upload a valid PDF file.');
          setMessageType('error');
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setStatusMessage('Error reading file. Please try again.');
        setMessageType('error');
        setIsUploading(false);
      };
      reader.readAsArrayBuffer(file);
      return;
    } else {
      setStatusMessage('Only PDF files are supported.');
      setMessageType('error');
      setIsUploading(false);
      return;
    }
  };

  const handleManualEdit = () => {
    if (uploadedResume) {
      onResumeLoad(uploadedResume);
      setStatusMessage('Resume loaded for manual editing!');
      setMessageType('success');
      setShowEnhanceOptions(false);
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 3000);
    }
  };

  const handleAIEnhance = async () => {
    if (!uploadedResume) {
      setStatusMessage('No resume to enhance. Please upload a resume first.');
      setMessageType('error');
      return;
    }

    setIsEnhancing(true);
    setStatusMessage('');

    try {
      const response = await resumeService.autoEnhanceResume(uploadedResume);
      
      // Check if we got an error response
      if (response.error) {
        setStatusMessage(response.error);
        setMessageType('error');
        setIsEnhancing(false);
        return;
      }
      
      const { enhancedResume } = response;
      onResumeLoad(enhancedResume);
      setStatusMessage('Resume enhanced and loaded successfully!');
      setMessageType('success');
      setShowEnhanceOptions(false);
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error enhancing resume:', error);
      
      // Check if the error response contains our custom error message
      if (error.response && error.response.data) {
        const { error: errorMessage, aiUnavailable } = error.response.data;
        setStatusMessage(errorMessage || 'Failed to enhance resume. Please try again or use manual edit.');
        
        // If it's an API key issue, provide more specific guidance
        if (aiUnavailable) {
          setStatusMessage(`${errorMessage} Please use manual edit instead.`);
        }
      } else {
        setStatusMessage('Failed to enhance resume. Please try again or use manual edit.');
      }
      
      setMessageType('error');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Upload Resume Button */}
      <div className="relative">
        <input
          type="file"
          id="resume-upload"
          accept="application/pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        <button
          className={`w-full ${isUploading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 px-4 rounded flex items-center justify-center`}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            'Upload Resume (PDF Only)'
          )}
        </button>
      </div>

      {/* Enhance Options */}
      {showEnhanceOptions && (
        <div className="bg-white rounded-md shadow-md p-4 space-y-3">
          <h3 className="font-medium text-gray-900">Choose an Option</h3>
          <div className="flex space-x-2">
            <button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              onClick={handleManualEdit}
            >
              Manual Edit
            </button>
            <button
              className={`flex-1 ${isEnhancing ? 'bg-gray-500' : 'bg-indigo-600 hover:bg-indigo-700'} text-white py-2 px-4 rounded flex items-center justify-center`}
              onClick={handleAIEnhance}
              disabled={isEnhancing}
            >
              {isEnhancing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enhancing...
                </>
              ) : (
                'AI Enhance'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className={`p-2 rounded ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {statusMessage}
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 mt-2">
        <p>Upload your resume in PDF format to continue editing or enhance it with AI.</p>
        <p className="mt-1">You can only upload and download resumes in PDF format.</p>
      </div>
    </div>
  );
};

export default UploadEnhanceResume;