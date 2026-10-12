import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { Download, FileText, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface DocExporterProps {
  onClose?: () => void;
}

export const DocExporter: React.FC<DocExporterProps> = ({ onClose }) => {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/docs/export');
      const data = await response.json();
      if (data.markdown) {
        setMarkdown(data.markdown);
        toast.success("System manual aggregated successfully");
      } else {
        toast.error("Failed to load documentation");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Network error during aggregation");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-[#050507] text-gray-400 font-sans p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-white tracking-tight">System Manual Exporter</h2>
            <p className="text-xs text-gray-500 font-mono">NEURAL_DOC_SYNTHESIS_v4</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!markdown ? (
            <button
              onClick={fetchDocs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {loading ? "Aggregating..." : "Assemble Manual"}
            </button>
          ) : (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-all"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-500 hover:text-white transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 custom-docs-container">
        {!markdown ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-700" />
            </div>
            <div>
              <p className="text-lg text-gray-300">Ready to synthesize the OS guide</p>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2">
                This will aggregate all 26 volumes of the DARK MNMLL PULSE OS documentation into a single printable document.
              </p>
            </div>
          </div>
        ) : (
          <div className="markdown-body p-8 bg-[#0a0a0f] rounded-xl border border-white/5 print:bg-white print:text-black">
            <Markdown>{markdown}</Markdown>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .custom-docs-container, .custom-docs-container * { visibility: visible; }
          .custom-docs-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: auto;
            overflow: visible !important;
          }
          .page-break { page-break-after: always; }
          button { display: none !important; }
          .border-b { display: none !important; }
        }
        
        .markdown-body h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 2rem; color: white; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; }
        .markdown-body h2 { font-size: 1.8rem; font-weight: 600; margin-top: 3rem; margin-bottom: 1.5rem; color: #f3f4f6; }
        .markdown-body h3 { font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; color: #e5e7eb; }
        .markdown-body p { margin-bottom: 1.2rem; line-height: 1.7; color: #9ca3af; }
        .markdown-body ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; color: #9ca3af; }
        .markdown-body li { margin-bottom: 0.5rem; }
        .markdown-body code { font-family: 'JetBrains Mono', monospace; background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; rounded: 4px; color: #818cf8; }
        .markdown-body pre { background: rgba(0,0,0,0.3); padding: 1rem; rounded-lg: 8px; margin-bottom: 1.5rem; overflow-x: auto; border: 1px solid rgba(255,255,255,0.05); }
        .markdown-body hr { border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 3rem 0; }
        
        @media print {
          .markdown-body { background: white !important; }
          .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: black !important; border-color: #eee !important; }
          .markdown-body p, .markdown-body ul, .markdown-body li { color: #333 !important; }
          .markdown-body pre { border-color: #ddd !important; background: #f9f9f9 !important; color: black !important; }
        }
      `}} />
    </div>
  );
};
