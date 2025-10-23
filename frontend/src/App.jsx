import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Share2 } from "lucide-react";
import GraphView3D from "./GraphView3D";

export default function App() {
  const [activeTab, setActiveTab] = useState("annotate");
  const [text, setText] = useState("");
  const [concepts, setConcepts] = useState([]);
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState("");

  const handleAnnotate = async () => {
    setError("");
    if (!text.trim()) {
      setError("Please enter text before annotating.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }), // ✅ ENVOI DU TEXTE AU BACKEND
      });

      if (!res.ok) throw new Error("Annotation failed");
      const data = await res.json();

      console.log("✅ Annotation result:", data);
      setConcepts(data.concepts || []);
    } catch (err) {
      console.error("❌ Annotation error:", err);
      setError("Annotation failed. Check backend/Ollama.");
    }
  };

  const fetchGraph = async () => {
    try {
      const res = await fetch("http://localhost:3001/graph");
      if (!res.ok) throw new Error("Graph fetch failed");
      const data = await res.json();
      console.log("✅ Graph data:", data);
      setGraph(data);
    } catch (err) {
      console.error("❌ Graph load error:", err);
      setError("Failed to load graph from backend.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        <h2 className="text-xl font-bold text-center py-6 border-b border-gray-800">
          KONDA-LITE
        </h2>
        <nav className="flex flex-col mt-4">
          <button
            onClick={() => setActiveTab("annotate")}
            className={`px-6 py-3 text-left hover:bg-gray-800 ${
              activeTab === "annotate" ? "bg-gray-800 text-purple-400" : ""
            }`}
          >
            Annotate
          </button>
          <button
            onClick={() => {
              setActiveTab("graph");
              fetchGraph();
            }}
            className={`px-6 py-3 text-left hover:bg-gray-800 ${
              activeTab === "graph" ? "bg-gray-800 text-purple-400" : ""
            }`}
          >
            Graph
          </button>
        </nav>
        <div className="mt-auto p-4 text-xs text-gray-500 border-t border-gray-800">
          Local LLM via Ollama <br />
          Graph DB: Neo4j
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        {activeTab === "annotate" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <Brain className="text-purple-400" />
              Annotate text with concepts (LLM → Neo4j)
            </h1>

            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
              <h2 className="text-lg font-semibold mb-2">🧠 Annotate text</h2>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type text to extract concepts..."
                className="w-full h-40 bg-gray-800 rounded-xl p-3 text-gray-200 resize-none focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleAnnotate}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
                >
                  Annotate
                </button>
                <button
                  onClick={fetchGraph}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg"
                >
                  Refresh Graph
                </button>
              </div>
            </div>

            {/* Extracted Concepts */}
            <div className="mt-8 bg-gray-900 p-6 rounded-2xl border border-gray-800">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Share2 className="text-green-400" /> Extracted concepts
              </h2>
              {concepts.length > 0 ? (
                <ul className="list-disc ml-6 text-gray-300">
                  {concepts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">
                  No concepts yet. Run an annotation to see results.
                </p>
              )}
            </div>

            {error && (
              <div className="fixed bottom-4 right-4 bg-red-800 text-red-100 px-4 py-2 rounded-lg shadow-lg">
                {error}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "graph" && (
          <div className="h-full">
            {graph ? (
              <GraphView3D data={graph} />
            ) : (
              <p className="text-center text-gray-500">
                Loading graph...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
