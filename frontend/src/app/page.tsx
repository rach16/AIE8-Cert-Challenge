'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, formatAPIError, AskResponse, MultiAgentResponse } from './api-client';

type ResponseType = AskResponse | MultiAgentResponse | null;

export default function Home() {
  const [query, setQuery] = useState('');
  const [retrieverType, setRetrieverType] = useState('parent_document');
  const [useAgent, setUseAgent] = useState(false);
  const [useMultiAgent, setUseMultiAgent] = useState(false);
  const [response, setResponse] = useState<ResponseType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await apiClient.health();
        setBackendStatus('online');
      } catch {
        setBackendStatus('offline');
      }
    };
    checkBackend();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Call appropriate endpoint based on selection
      let data: ResponseType;
      if (useMultiAgent) {
        data = await apiClient.multiAgentAnalyze(query, true, true);
      } else if (useAgent) {
        data = await apiClient.analyzeChurn(query, undefined, true);
      } else {
        data = await apiClient.ask(query, retrieverType);
      }
      setResponse(data);
      setBackendStatus('online');
    } catch (err) {
      console.error('Error:', err);
      setError(formatAPIError(err));
      setBackendStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if response is multi-agent
  const isMultiAgentResponse = (resp: ResponseType): resp is MultiAgentResponse => {
    return resp !== null && 'confidence_score' in resp && 'processing_stages' in resp;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-gray-800">
            Customer Churn Analysis Assistant
          </h1>
          {/* Backend Status Indicator */}
          <div className="flex items-center gap-4">
            <Link
              href="/evaluations"
              className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
              title="View RAGAS evaluation metrics"
            >
              📊 Evaluation Metrics
            </Link>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                backendStatus === 'online' ? 'bg-green-500' :
                backendStatus === 'offline' ? 'bg-red-500' :
                'bg-yellow-500 animate-pulse'
              }`} />
              <span className="text-sm text-gray-600">
                {backendStatus === 'online' ? 'Backend Online' :
                 backendStatus === 'offline' ? 'Backend Offline' :
                 'Checking...'}
              </span>
            </div>
          </div>
        </div>
        <p className="text-center text-gray-600 mb-8">
          AI-powered insights for customer retention using RAG
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="mb-6">
            {/* Multi-Agent Mode Toggle */}
            <div className="mb-4 flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-300">
              <input
                type="checkbox"
                id="multi-agent-mode"
                checked={useMultiAgent}
                onChange={(e) => {
                  setUseMultiAgent(e.target.checked);
                  if (e.target.checked) setUseAgent(false);
                }}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
              <label htmlFor="multi-agent-mode" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖🤖</span>
                  <span className="font-semibold text-gray-800">Multi-Agent System</span>
                  {useMultiAgent && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {useMultiAgent 
                    ? '✨ Research Team + Writing Team (5 sub-agents) with empathy enhancement & citations' 
                    : 'Enable for comprehensive analysis with 2 agent teams (Research + Writing)'}
                </p>
              </label>
            </div>

            {/* Single Agent Mode Toggle */}
            {!useMultiAgent && (
              <div className="mb-4 flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <input
                  type="checkbox"
                  id="agent-mode"
                  checked={useAgent}
                  onChange={(e) => setUseAgent(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="agent-mode" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="font-semibold text-gray-800">Single Agent Mode</span>
                    {useAgent && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {useAgent 
                      ? '✨ Uses LangGraph agent with Tavily web search' 
                      : 'Enable for single-agent with multi-step reasoning'}
                  </p>
                </label>
              </div>
            )}

            {/* Retriever Selector - Only shown when NOT in agent modes */}
            {!useAgent && !useMultiAgent && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔍 Retrieval Method
                </label>
                <select
                  value={retrieverType}
                  onChange={(e) => setRetrieverType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="parent_document">🎯 Parent Document (⭐ 94.7% Recall - Best Context)</option>
                  <option value="multi_query">🔀 Multi-Query (📚 73.7% Faithfulness - Most Accurate)</option>
                  <option value="reranking">🏆 Reranking (🎯 75.0% Precision)</option>
                  <option value="naive">📌 Naive (⚡ 61.3% Faithfulness - Baseline)</option>
                  <option value="contextual_compression">🎨 Contextual Compression (⚠️ 42.3% - Not Recommended)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {retrieverType === 'parent_document' && '✨ Best context coverage (94.7% recall) - searches small chunks, returns full documents. Recommended for comprehensive churn analysis.'}
                  {retrieverType === 'naive' && '⚡ Simple baseline (61.3% faithfulness) - fast vector similarity search'}
                  {retrieverType === 'multi_query' && '🔄 Most accurate (73.7% faithfulness) - generates multiple query variations for better factual accuracy'}
                  {retrieverType === 'contextual_compression' && '⚠️ Not recommended (42.3% faithfulness) - aggressive LLM filtering loses important context'}
                  {retrieverType === 'reranking' && '🏆 Good precision (75%) - uses Cohere reranker to surface most relevant results'}
                </p>
              </div>
            )}

            <textarea
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Ask about churn patterns, retention strategies, or customer risk assessment...&#10;&#10;Examples:&#10;• Why do customers churn?&#10;• What are the main churn reasons in the Commercial segment?&#10;• Which competitors are we losing customers to?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading || !query || backendStatus === 'offline'}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing with RAG...
                </span>
              ) : (
                '🔍 Analyze with RAG'
              )}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-600 text-lg">⚠️</span>
                <div>
                  <p className="text-red-800 font-semibold">Error</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                  {backendStatus === 'offline' && (
                    <p className="text-red-600 text-xs mt-2">
                      Make sure the backend is running at http://localhost:8000
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="space-y-4">
              {/* Multi-Agent Response */}
              {isMultiAgentResponse(response) ? (
                <>
                  {/* Processing Stages */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-sm mb-2 text-green-900 flex items-center gap-2">
                      <span>✅</span> Processing Complete
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {response.processing_stages.map((stage, idx) => (
                        <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {stage}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                      <span>Query Type: <strong>{response.query_type}</strong></span>
                      <span>Confidence: <strong className="text-green-700">{(response.confidence_score * 100).toFixed(0)}%</strong></span>
                      <span>Sources: <strong>{response.total_sources}</strong></span>
                    </div>
                  </div>

                  {/* Background Context */}
                  {response.background_context && (
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                      <h3 className="font-semibold text-lg mb-3 text-amber-900 flex items-center gap-2">
                        <span>🔬</span> Research Team: Background Context
                      </h3>
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">{response.background_context}</p>
                    </div>
                  )}

                  {/* Key Insights */}
                  {response.key_insights && response.key_insights.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                      <h3 className="font-semibold text-sm mb-3 text-cyan-900 flex items-center gap-2">
                        <span>💡</span> Key Insights
                      </h3>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {response.key_insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-cyan-600 mt-1">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Final Response */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-300 ring-2 ring-blue-200">
                    <h3 className="font-semibold text-lg mb-3 text-blue-900 flex items-center gap-2">
                      <span>📝</span> Writing Team: Final Response
                    </h3>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{response.response}</p>
                  </div>

                  {/* Citations */}
                  {response.citations && response.citations.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                        <span>📚</span> Citations ({response.citations.length})
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {response.citations.map((citation, idx) => (
                          <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {citation.customer && (
                                  <p className="text-sm font-semibold text-gray-900">{citation.customer}</p>
                                )}
                                {citation.title && (
                                  <p className="text-sm font-semibold text-gray-900">{citation.title}</p>
                                )}
                                {citation.segment && (
                                  <p className="text-xs text-gray-600">Segment: {citation.segment}</p>
                                )}
                                {citation.churn_reason && (
                                  <p className="text-xs text-gray-600">Reason: {citation.churn_reason}</p>
                                )}
                                {citation.url && (
                                  <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                    {citation.url}
                                  </a>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 ml-2">{citation.citation_id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Style Notes */}
                  {response.style_notes && response.style_notes.length > 0 && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-sm text-purple-700 mb-2 flex items-center gap-2">
                        <span>📋</span> Style & Quality Notes
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {response.style_notes.map((note, idx) => (
                          <span key={idx} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Standard Answer for Single Agent / RAG */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-lg mb-3 text-blue-900 flex items-center gap-2">
                      <span>💡</span> Answer
                    </h3>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{'answer' in response ? response.answer : ''}</p>
                  </div>
                </>
              )}

              {/* Sources (for non-multi-agent responses) */}
              {!isMultiAgentResponse(response) && 'sources' in response && response.sources && response.sources.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <span>📚</span> Sources ({response.sources.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {response.sources.map((source, idx) => (
                      <div key={idx} className="p-3 bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors">
                        <p className="text-sm text-gray-700">{source.content}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>Source: {source.metadata?.source || 'Unknown'}</span>
                          {source.relevance_score > 0 && (
                            <span className="text-blue-600 font-semibold">
                              Relevance: {(source.relevance_score * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics (for non-multi-agent responses) */}
              {!isMultiAgentResponse(response) && 'metrics' in response && response.metrics && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <span>📊</span> Performance Metrics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">Response Time</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {response.metrics.response_time_ms}ms
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">Tokens Used</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {Math.round(response.metrics.tokens_used)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">Method</p>
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {response.metrics.retrieval_method?.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">Documents</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {response.metrics.documents_found || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-blue-600 mb-2">🎯 Risk Assessment</h3>
            <p className="text-sm text-gray-600">
              Identify at-risk customers and predict churn probability
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-green-600 mb-2">💡 Retention Strategies</h3>
            <p className="text-sm text-gray-600">
              Get personalized recommendations for customer retention
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-purple-600 mb-2">📊 Pattern Analysis</h3>
            <p className="text-sm text-gray-600">
              Discover trends and patterns in customer behavior
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

