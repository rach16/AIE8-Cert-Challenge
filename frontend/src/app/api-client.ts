/**
 * API Client for Customer Churn RAG Backend
 * TypeScript interfaces and API call functions
 */

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Type Definitions
export interface Source {
  content: string;
  metadata: Record<string, any>;
  relevance_score: number;
}

export interface Metrics {
  response_time_ms: number;
  tokens_used: number;
  retrieval_method?: string;
  documents_found?: number;
  agent_steps?: number;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  metrics: Metrics;
}

export interface ChurnAnalysisResponse {
  answer: string;
  customer_id?: string;
  churn_risk_score?: number;
  recommendations?: string[];
  sources: Source[];
  metrics: Metrics;
}

export interface MultiAgentResponse {
  query: string;
  query_type?: string;
  response: string;
  background_context?: string;
  key_insights: string[];
  citations: Array<{
    citation_id?: string;
    type?: string;
    customer?: string;
    segment?: string;
    churn_reason?: string;
    arr_lost?: string;
    title?: string;
    url?: string;
    relevance?: string;
  }>;
  style_notes: string[];
  confidence_score: number;
  processing_stages: string[];
  total_sources: number;
  errors: string[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
}

// API Error Class
export class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// API Client Functions
export const apiClient = {
  /**
   * Check if the backend API is healthy
   */
  async health(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new APIError(
        response.status,
        response.statusText,
        'Health check failed'
      );
    }
    
    return response.json();
  },

  /**
   * Ask a general question about churn patterns
   */
  async ask(
    question: string, 
    retrieverType: string = 'parent_document',
    maxResponseLength: number = 2000
  ): Promise<AskResponse> {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        retriever_type: retrieverType,
        max_response_length: maxResponseLength,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        response.status,
        response.statusText,
        errorData.detail || 'Failed to get answer'
      );
    }

    return response.json();
  },

  /**
   * Analyze customer churn with agent-based reasoning
   */
  async analyzeChurn(
    query: string,
    customerId?: string,
    includeRecommendations: boolean = true
  ): Promise<ChurnAnalysisResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze-churn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        customer_id: customerId,
        include_recommendations: includeRecommendations,
        max_response_length: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        response.status,
        response.statusText,
        errorData.detail || 'Churn analysis failed'
      );
    }

    return response.json();
  },

  /**
   * Multi-Agent Analysis with Research Team + Writing Team
   */
  async multiAgentAnalyze(
    query: string,
    includeBackground: boolean = true,
    includeCitations: boolean = true
  ): Promise<MultiAgentResponse> {
    const response = await fetch(`${API_BASE_URL}/multi-agent-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        include_background: includeBackground,
        include_citations: includeCitations,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        response.status,
        response.statusText,
        errorData.detail || 'Multi-agent analysis failed'
      );
    }

    return response.json();
  },

  getEvaluationResults: async (): Promise<EvaluationResponse> => {
    const response = await fetch(`${API_BASE_URL}/evaluation-results`);
    
    if (!response.ok) {
      throw new APIError(
        response.status,
        response.statusText,
        'Failed to fetch evaluation results'
      );
    }
    
    return response.json();
  },
};

// Helper function to format error messages for display
export interface EvaluationResult {
  method: string;
  faithfulness: number;
  answer_relevancy: number;
  context_recall: number;
  context_precision: number;
  answer_correctness: number;
  semantic_similarity: number;
}

export interface EvaluationResponse {
  results: EvaluationResult[];
  metrics_info: Record<string, string>;
  note: string;
}

export function formatAPIError(error: unknown): string {
  if (error instanceof APIError) {
    if (error.status === 503) {
      return '⚠️  Backend service is not ready. Please ensure Qdrant is running and the API keys are configured.';
    }
    if (error.status === 500) {
      return `❌ Server error: ${error.message}`;
    }
    return `❌ API Error (${error.status}): ${error.message}`;
  }
  
  if (error instanceof Error) {
    return `❌ ${error.message}`;
  }
  
  return '❌ An unexpected error occurred';
}

