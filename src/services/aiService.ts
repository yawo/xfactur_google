import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

async function convertPdfToImages(file: File): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: File[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // Scale for better quality
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    } as any;

    await page.render(renderContext).promise;
    
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });

    if (blob) {
      const imageFile = new File([blob], `${file.name}_page_${i}.jpg`, { type: 'image/jpeg' });
      images.push(imageFile);
    }
  }

  return images;
}

// AI Service to handle calls to various LLM providers via backend proxy
export const aiService = {
  async extractInvoice(file: File) {
    const formData = new FormData();
    
    if (file.type === 'application/pdf') {
      try {
        const imageFiles = await convertPdfToImages(file);
        imageFiles.forEach((imgFile) => {
          formData.append('files', imgFile);
        });
      } catch (error) {
        console.error("Error converting PDF to images:", error);
        // Fallback to sending the original file if conversion fails
        formData.append('files', file);
      }
    } else {
      formData.append('files', file);
    }
    
    const response = await axios.post('/api/ai/extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async extractBankStatement(csvText: string) {
    const response = await axios.post('/api/ai/extract-bank', { csvText });
    return response.data;
  },

  async checkConformity(invoiceData: any, rules?: string) {
    const response = await axios.post('/api/ai/conformity', { invoiceData, rules });
    return response.data;
  },

  async allocateAccounting(invoiceData: any, rules?: string) {
    const response = await axios.post('/api/ai/allocate', { invoiceData, rules });
    return response.data;
  },

  async reconcileBank(journalEntries: any[], bankStatements: any[], rules?: string) {
    const response = await axios.post('/api/ai/reconcile', { journalEntries, bankStatements, rules });
    return response.data;
  }
};
