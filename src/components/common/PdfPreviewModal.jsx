import React from 'react';
import { X, Download, FileText } from 'lucide-react';

export default function PdfPreviewModal({
  open,
  pdfUrl,
  title = "Xem trước báo cáo",
  filename,
  onClose,
  onDownload
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border shadow-2xl rounded-2xl w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 text-foreground">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base sm:text-lg tracking-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body (PDF Viewer) */}
        <div className="flex-1 bg-muted/10 relative p-0 sm:p-2">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title={title}
              className="w-full h-full border-0 rounded-lg shadow-inner bg-white"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Đang tải bản xem trước...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border transition-colors"
          >
            Đóng
          </button>
          
          <button
            onClick={onDownload}
            disabled={!pdfUrl}
            className="px-4 py-2 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Xuất PDF
          </button>
        </div>
        
      </div>
    </div>
  );
}
