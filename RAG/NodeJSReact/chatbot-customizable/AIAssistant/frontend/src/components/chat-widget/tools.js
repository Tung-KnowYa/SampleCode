import { LayoutTemplate, BarChart2, Lightbulb, FileText, FileType, Presentation, Sheet } from 'lucide-react';

export const REPORT_FORMAT_TOOLS = [
  { name: 'Table Report', icon: LayoutTemplate },
  //{ name: 'Chart Report', icon: BarChart2 },
  { name: 'Insights Report', icon: Lightbulb },
];

/** Tool `name` values must match Chatbot/backend/server.js and lib/exportDocuments.js */
export const FILE_EXPORT_TOOLS = [
  { name: 'Word document', icon: FileText, label: 'Word (.docx)' },
  { name: 'PDF document', icon: FileType, label: 'PDF' },
  { name: 'PowerPoint', icon: Presentation, label: 'PowerPoint (.pptx)' },
  { name: 'Excel workbook', icon: Sheet, label: 'Excel (.xlsx)' },
];
