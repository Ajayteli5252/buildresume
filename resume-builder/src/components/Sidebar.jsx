import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import SaveShareResume from './SaveShareResume';
import UploadEnhanceResume from './UploadEnhanceResume';

const Sidebar = ({ setActiveSection, branding, handleBrandingToggle, resumeData, setResumeData }) => {
  const [currentSection, setCurrentSection] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSectionClick = (section) => {
    setCurrentSection(section);
    setActiveSection(section);
  };
  
  const downloadPDF = async () => {
    setIsDownloading(true);
    
    try {
      // Get the resume content element
      const resumeElement = document.querySelector('.max-w-3xl');
      
      if (!resumeElement) {
        alert('Resume content not found!');
        setIsDownloading(false);
        return;
      }
      
      // Create a clone of the resume element to avoid modifying the original
      const clone = resumeElement.cloneNode(true);

      // Hide all elements with the 'no-print' class in the clone
      const style = document.createElement('style');
      style.innerHTML = `.no-print { display: none !important; }`;
      clone.appendChild(style);
      clone.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');
      
      // Apply some styling to the clone for better PDF output
      clone.style.padding = '20px';
      clone.style.backgroundColor = 'white';
      clone.style.width = '800px';
      clone.style.margin = '0';
      
      // Temporarily append the clone to the body but make it invisible
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      document.body.appendChild(clone);
      
      // Generate canvas from the clone
      const canvas = await html2canvas(clone, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Remove the clone from the DOM
      document.body.removeChild(clone);
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Save the PDF
      pdf.save(`${resumeData.name.replace(/\s+/g, '_')}_Resume.pdf`);
      
      alert('Resume downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download resume. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-64 bg-gray-800 text-white p-4 h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Resume Builder</h2>
      
      <div className="mb-6">
        <h3 className="font-medium mb-2">Sections</h3>
        <ul className="space-y-1">
          <li>
            <button 
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-700 ${currentSection === 'summary' ? 'bg-blue-600' : ''}`}
              onClick={() => handleSectionClick('summary')}
            >
              Summary
            </button>
          </li>
          <li>
            <button 
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-700 ${currentSection === 'experience' ? 'bg-blue-600' : ''}`}
              onClick={() => handleSectionClick('experience')}
            >
              Experience
            </button>
          </li>
          <li>
            <button 
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-700 ${currentSection === 'education' ? 'bg-blue-600' : ''}`}
              onClick={() => handleSectionClick('education')}
            >
              Education
            </button>
          </li>
          <li>
            <button 
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-700 ${currentSection === 'skills' ? 'bg-blue-600' : ''}`}
              onClick={() => handleSectionClick('skills')}
            >
              Skills
            </button>
          </li>
          <li>
            <button 
              className={`w-full text-left px-2 py-1 rounded hover:bg-gray-700 ${currentSection === 'languages' ? 'bg-blue-600' : ''}`}
              onClick={() => handleSectionClick('languages')}
            >
              Languages
            </button>
          </li>
        </ul>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium mb-2">Settings</h3>
        <div className="flex items-center mb-2">
          <input 
            type="checkbox" 
            id="branding" 
            checked={branding} 
            onChange={handleBrandingToggle}
            className="mr-2"
          />
          <label htmlFor="branding">Show Branding</label>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium mb-2">Resume Actions</h3>
        
        {/* Download PDF Button */}
        <button 
          className={`w-full mb-4 ${isDownloading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 px-4 rounded flex items-center justify-center`}
          onClick={downloadPDF}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Download Resume '
          )}
        </button>
        
        {/* Save & Share Resume Component */}
        {/* Optionally, you can comment out or update SaveShareResume if it allows non-PDF formats */}
        <SaveShareResume resumeData={resumeData} />
        
        {/* Upload & Enhance Resume Component */}
        <UploadEnhanceResume onResumeLoad={(newResumeData) => setResumeData(newResumeData)} />
        <div className="text-xs text-gray-400 mt-2">You can only upload and download resumes in PDF format.</div>
      </div>
    </div>
  );
};

export default Sidebar;