import React, { useState } from 'react';
import { 
  Database, 
  Server, 
  Search, 
  Play, 
  Upload, 
  Layers, 
  Terminal, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Table, 
  FileSpreadsheet, 
  Grid,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface SchemaField {
  name: string;
  type: string;
  key?: 'PK' | 'FK' | 'IDX';
}

const schemas: Record<string, SchemaField[]> = {
  users: [
    { name: 'id', type: 'UUID', key: 'PK' },
    { name: 'email', type: 'VARCHAR(255)', key: 'IDX' },
    { name: 'name', type: 'VARCHAR(100)' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'role', type: 'VARCHAR(50)' }
  ],
  projects: [
    { name: 'id', type: 'UUID', key: 'PK' },
    { name: 'user_id', type: 'UUID', key: 'FK' },
    { name: 'title', type: 'VARCHAR(255)' },
    { name: 'config', type: 'JSONB' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ],
  memories: [
    { name: 'id', type: 'UUID', key: 'PK' },
    { name: 'agent_id', type: 'VARCHAR(50)', key: 'FK' },
    { name: 'content', type: 'TEXT' },
    { name: 'embedding', type: 'vector(1536)', key: 'IDX' },
    { name: 'layer', type: 'VARCHAR(10)' }
  ]
};

export default function DataStudioPanel({ isLight }: { isLight: boolean }) {
  const [activeTab, setActiveTab] = useState<'universal' | 'vector' | 'importer'>('universal');
  const [activeDb, setActiveDb] = useState<'postgres' | 'firestore' | 'redis'>('postgres');
  const [query, setQuery] = useState('SELECT * FROM memories LIMIT 10;');
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Vector search state
  const [vectorQuery, setVectorQuery] = useState('');
  const [isSearchingVectors, setIsSearchingVectors] = useState(false);
  const [vectorResults, setVectorResults] = useState<any[] | null>(null);

  // Importer state
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleRunQuery = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      if (activeDb === 'postgres') {
        setQueryResults([
          { id: 'e34b-4a11-82cd', agent_id: 'azrail-main', content: 'Immutable part of the DARK MNMLL PULSE OS core blueprint', layer: 'L3' },
          { id: '18ab-7c22-901a', agent_id: 'uriel-security', content: 'CSP Conformance: Stripe script-src policies fully mapped', layer: 'L2' },
          { id: '90cd-1b99-014f', agent_id: 'ptah-construction', content: 'Auto-assembled UI Framework initialized', layer: 'L1' }
        ]);
        toast.success('SQL query compiled and executed in 4ms');
      } else if (activeDb === 'firestore') {
        setQueryResults([
          { _id: 'doc_9318a', title: 'Cybernetic Genesis Plan', owner: 'andrik494@gmail.com', status: 'active' },
          { _id: 'doc_1827b', title: 'Music Synthesizer Presets', owner: 'andrik494@gmail.com', status: 'draft' }
        ]);
        toast.success('Firestore document collection scanned successfully');
      } else {
        setQueryResults([
          { key: 'session:active_users', type: 'set', ttl: 3600, val_count: 1 },
          { key: 'cache:model_latencies', type: 'hash', ttl: 120, val_count: 5 }
        ]);
        toast.success('Redis key dump complete');
      }
    }, 800);
  };

  const handleVectorSearch = () => {
    if (!vectorQuery.trim()) return;
    setIsSearchingVectors(true);
    setTimeout(() => {
      setIsSearchingVectors(false);
      setVectorResults([
        { text: 'The dissolution of progressive human timelines and the horizontal field of absolute presence.', similarity: 0.941, index: 'metatron-space-1' },
        { text: 'All files in the workspace must keep native imports and named structures to maintain typescript compilation.', similarity: 0.812, index: 'security-standards' },
        { text: 'Configure system servers to run exclusively on port 3000 to enable reverse proxy routing.', similarity: 0.765, index: 'ingress-rules' }
      ]);
      toast.success('High-dimensional semantic scan complete');
    }, 1000);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseMockCsv(file.name);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseMockCsv(file.name);
  };

  const parseMockCsv = (filename: string) => {
    setIsParsing(true);
    setTimeout(() => {
      setIsParsing(false);
      setCsvData([
        { Index: 1, Model: 'Gemini 2.5 Flash', Latency: '110ms', Cost: '$0.00015', TokenIn: '402', TokenOut: '80' },
        { Index: 2, Model: 'Gemini 2.0 Pro', Latency: '412ms', Cost: '$0.00120', TokenIn: '911', TokenOut: '422' },
        { Index: 3, Model: 'Claude 3.5 Sonnet', Latency: '382ms', Cost: '$0.00310', TokenIn: '1004', TokenOut: '512' },
        { Index: 4, Model: 'Flux.1 Dev', Latency: '2100ms', Cost: '$0.03000', TokenIn: '256', TokenOut: '1' }
      ]);
      toast.success(`Successfully parsed structure from ${filename}`);
    }, 1200);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('universal')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'universal'
              ? (isLight ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-white/10 text-white font-bold')
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            <span>Universal Drivers</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('vector')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'vector'
              ? (isLight ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-white/10 text-white font-bold')
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Vector RAG Database</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('importer')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'importer'
              ? (isLight ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-white/10 text-white font-bold')
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Upload className="w-3.5 h-3.5" />
            <span>Data Importers</span>
          </div>
        </button>
      </div>

      {activeTab === 'universal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Driver details */}
          <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono mb-4 text-indigo-400">Database Drivers</h3>
            <div className="flex flex-col gap-3">
              {[
                { id: 'postgres', name: 'PostgreSQL Core', status: 'Connected', speed: '4.2ms avg' },
                { id: 'firestore', name: 'Cloud Firestore', status: 'Connected', speed: '12ms avg' },
                { id: 'redis', name: 'Redis Cache Layer', status: 'Connected', speed: '0.8ms avg' }
              ].map((db) => (
                <button
                  key={db.id}
                  onClick={() => {
                    setActiveDb(db.id as any);
                    if (db.id === 'postgres') setQuery('SELECT * FROM memories LIMIT 10;');
                    else if (db.id === 'firestore') setQuery('db.collection("users").get()');
                    else setQuery('KEYS *');
                    setQueryResults(null);
                  }}
                  className={`w-full p-4 border rounded-xl text-left transition-all ${
                    activeDb === db.id
                      ? (isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-500/10 border-indigo-500/30')
                      : (isLight ? 'border-zinc-200 hover:bg-zinc-50' : 'border-white/5 hover:bg-white/5')
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold font-mono text-zinc-300">{db.name}</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">ONLINE</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500">
                    <span>Active Ingress Pipeline</span>
                    <span>{db.speed}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Schemas */}
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono mt-6 mb-3 text-zinc-400">Mapped Schema Models</h3>
            <div className="space-y-3">
              {Object.entries(schemas).map(([name, fields]) => (
                <div key={name} className="border border-white/5 bg-zinc-900/30 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-400 font-bold uppercase mb-2">
                    <Table className="w-3.5 h-3.5" />
                    <span>{name}</span>
                  </div>
                  <div className="space-y-1">
                    {fields.map((field) => (
                      <div key={field.name} className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>{field.name}</span>
                        <div className="flex gap-1.5">
                          <span>{field.type}</span>
                          {field.key && (
                            <span className="bg-zinc-800 text-[8px] text-zinc-400 px-1 rounded font-extrabold">{field.key}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code execution driver */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className={`border rounded-2xl p-5 flex flex-col h-full ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-300">Live Console Driver</span>
                </div>
                <button
                  onClick={handleRunQuery}
                  disabled={isRunning}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Execute Query</span>
                </button>
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full flex-1 min-h-[140px] bg-black/60 border border-white/5 rounded-xl p-4 font-mono text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
                placeholder="Enter SQL statements or collection syntax..."
              />

              {queryResults && (
                <div className="mt-4 flex-1">
                  <h4 className="text-[10px] font-bold uppercase font-mono text-zinc-500 tracking-wider mb-2">QueryResult Nodes ({queryResults.length})</h4>
                  <div className="overflow-x-auto border border-white/5 rounded-xl">
                    <table className="w-full text-left font-mono text-[10px]">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-white/5">
                          {Object.keys(queryResults[0]).map((key) => (
                            <th key={key} className="p-2.5 text-zinc-400 font-bold uppercase">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResults.map((row, i) => (
                          <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="p-2.5 text-zinc-300 truncate max-w-[200px]">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vector' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono mb-4 text-indigo-400">Vector Indexes</h3>
            <div className="space-y-4">
              <div className="p-4 border border-white/5 bg-zinc-900/40 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-mono font-bold text-zinc-300">metatron-space-1</span>
                  <span className="text-[9px] text-zinc-500 font-mono">1,482 records</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono flex flex-col gap-1 mt-2">
                  <span>Dimension: 1536 (Ada-002 / Text-Gecko)</span>
                  <span>Namespace: global-synthesis-shard</span>
                </div>
              </div>

              <div className="p-4 border border-white/5 bg-zinc-900/40 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-mono font-bold text-zinc-300">security-standards</span>
                  <span className="text-[9px] text-zinc-500 font-mono">240 records</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono flex flex-col gap-1 mt-2">
                  <span>Dimension: 1536</span>
                  <span>Namespace: uriel-safety-postures</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className={`border rounded-2xl p-5 flex flex-col h-full ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono mb-4 text-zinc-300">High-Dimensional Cosine Similarity Search</h3>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={vectorQuery}
                    onChange={(e) => setVectorQuery(e.target.value)}
                    placeholder="Enter natural language queries to search embeddings..."
                    className="w-full bg-black/60 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <button
                  onClick={handleVectorSearch}
                  disabled={isSearchingVectors || !vectorQuery.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSearchingVectors ? 'Searching...' : 'Scan'}
                </button>
              </div>

              {vectorResults && (
                <div className="space-y-3">
                  {vectorResults.map((result, i) => (
                    <div key={i} className="p-3 border border-white/5 bg-zinc-900/20 rounded-xl flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-zinc-300 leading-relaxed font-mono">"{result.text}"</p>
                        <span className="text-[9px] text-zinc-500 uppercase font-mono block mt-1.5">Index Source: {result.index}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-emerald-400 font-mono">{(result.similarity * 100).toFixed(1)}%</span>
                        <span className="text-[8px] text-zinc-500 font-mono block">Cosine Score</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'importer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isLight 
                  ? 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100/50' 
                  : 'border-white/10 bg-zinc-950/20 hover:bg-white/[0.02]'
              }`}
            >
              <Upload className="w-8 h-8 text-zinc-500 mb-3" />
              <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider mb-1">Drag & Drop Dataset</h4>
              <p className="text-[10px] text-zinc-500 font-mono mb-4">Supports CSV, Excel (XLSX) or structured JSON files up to 50MB</p>
              
              <input
                type="file"
                id="dataset-upload"
                className="hidden"
                accept=".csv,.xlsx,.json"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="dataset-upload"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold uppercase transition-colors"
              >
                Browse Files
              </label>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className={`border rounded-2xl p-5 h-full ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'}`}>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase font-mono tracking-wider mb-4 text-zinc-300">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>Dataset Visualization Grid</span>
              </div>

              {isParsing ? (
                <div className="py-12 flex flex-col items-center justify-center font-mono">
                  <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
                  <span className="text-xs text-zinc-400">Parsing complex schema attributes...</span>
                </div>
              ) : csvData ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-zinc-900/30 border border-white/5 p-3 rounded-xl">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                    <p className="text-[10px] font-mono text-zinc-400 leading-normal">
                      Dataset loaded successfully. Auto-detected <strong>4 rows</strong> and <strong>6 variables</strong>. High performance analytical vectors successfully mapped.
                    </p>
                  </div>

                  <div className="overflow-x-auto border border-white/5 rounded-xl">
                    <table className="w-full text-left font-mono text-[10px]">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-white/5">
                          {Object.keys(csvData[0]).map((key) => (
                            <th key={key} className="p-2.5 text-zinc-400 font-bold uppercase">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.map((row, i) => (
                          <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="p-2.5 text-zinc-300 truncate">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
                  No dataset imported yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
