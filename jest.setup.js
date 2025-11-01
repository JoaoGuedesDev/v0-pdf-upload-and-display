// Jest setup file
import '@testing-library/jest-dom';

// Mock jsPDF
jest.mock('jspdf', () => {
  const mockJsPDF = jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn().mockReturnThis(),
    setFont: jest.fn().mockReturnThis(),
    setTextColor: jest.fn().mockReturnThis(),
    setFillColor: jest.fn().mockReturnThis(),
    setDrawColor: jest.fn().mockReturnThis(),
    setLineWidth: jest.fn().mockReturnThis(),
    setProperties: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    textWithLink: jest.fn().mockReturnThis(),
    splitTextToSize: jest.fn().mockImplementation((text) => [text]), // Return array with single line
    rect: jest.fn().mockReturnThis(),
    roundedRect: jest.fn().mockReturnThis(),
    line: jest.fn().mockReturnThis(),
    link: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    setPage: jest.fn().mockReturnThis(),
    getNumberOfPages: jest.fn().mockReturnValue(1),
    internal: {
      pageSize: {
        width: 210,
        height: 297,
        getWidth: jest.fn().mockReturnValue(210),
        getHeight: jest.fn().mockReturnValue(297)
      }
    },
    output: jest.fn().mockReturnValue(new Uint8Array([37, 80, 68, 70])) // Mock PDF header
  }));
  
  return {
    __esModule: true,
    default: mockJsPDF
  };
});

// Mock chroma-js with all required methods
const mockChromaInstance = {
  brighten: jest.fn().mockReturnThis(),
  darken: jest.fn().mockReturnThis(),
  hex: jest.fn().mockReturnValue('#000000'),
  css: jest.fn().mockImplementation((format) => {
    if (format === 'hsl') return 'hsl(0, 0%, 0%)';
    return 'rgb(0, 0, 0)';
  })
};

const mockChroma = jest.fn().mockImplementation(() => mockChromaInstance);

// Add static methods to the mock function
mockChroma.contrast = jest.fn().mockReturnValue(4.5);
mockChroma.valid = jest.fn().mockReturnValue(true);
mockChroma.scale = jest.fn().mockReturnValue({
  colors: jest.fn().mockReturnValue(['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'])
});

jest.mock('chroma-js', () => ({
  __esModule: true,
  default: mockChroma
}));

// Mock browser APIs
global.URL = {
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn()
};

global.window = {
  ...global.window,
  open: jest.fn()
};

// Mock Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content ? content.length : 0,
  type: options?.type || ''
}));