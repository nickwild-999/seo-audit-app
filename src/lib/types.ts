export interface AuditOptions {
  includeScreenshots?: boolean;
  mobileTest?: boolean;
  deepScan?: boolean;
  timeout?: number;
}

export interface CategoryScore {
  score: number;
  maxScore: number;
  issues: Issue[];
}

export interface Issue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'seo' | 'technical' | 'content' | 'performance';
  title: string;
  description: string;
  element?: string;
  location?: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'seo' | 'technical' | 'content' | 'performance';
  actionItems: string[];
  estimatedImpact: 'high' | 'medium' | 'low';
}

export interface SEOAnalysis {
  title: {
    content: string | null;
    length: number;
    isOptimal: boolean;
  };
  metaDescription: {
    content: string | null;
    length: number;
    isOptimal: boolean;
  };
  metaKeywords: string | null;
  viewport: string | null;
  charset: string | null;
  canonical: string | null;
  hreflang: string[];
  robots: string | null;
  openGraph: {
    title: string | null;
    description: string | null;
    image: string | null;
    url: string | null;
    type: string | null;
  };
  headingStructure: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
}

export interface TechnicalAnalysis {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  networkRequests: {
    total: number;
    failed: number;
    totalSize: number;
  };
  mobileOptimization: {
    hasViewport: boolean;
    isResponsive: boolean;
    touchTargetSize: boolean;
  };
  accessibility: {
    score: number;
    issues: string[];
  };
  security: {
    hasSSL: boolean;
    mixedContent: boolean;
    vulnerabilities: string[];
  };
}

export interface ContentAnalysis {
  wordCount: number;
  readabilityScore: number;
  images: {
    total: number;
    withoutAlt: number;
    withEmptyAlt: number;
    lazyLoaded: number;
    oversized: number;
  };
  links: {
    total: number;
    internal: number;
    external: number;
    broken: number;
    nofollow: number;
    empty: number;
  };
  structuredData: {
    hasStructuredData: boolean;
    types: string[];
    errors: string[];
  };
  placeholderLinks?: any[];
  hasSuspiciousTestimonials?: boolean;
}

export interface PerformanceAnalysis {
  overallScore: number;
  metrics: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
    speedIndex: number;
    timeToInteractive: number;
  };
  opportunities: {
    title: string;
    description: string;
    savings: number;
    type: 'time' | 'bytes';
  }[];
  resources: {
    javascript: {
      total: number;
      unused: number;
      blocking: number;
    };
    css: {
      total: number;
      unused: number;
      blocking: number;
    };
    images: {
      total: number;
      unoptimized: number;
      totalSize: number;
    };
  };
}

export interface Screenshots {
  desktop: string | null;
  mobile: string | null;
  timestamp: string;
}

export interface AuditResult {
  id?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'running' | 'completed' | 'failed';
  processingTime?: number;
  
  url: string;
  timestamp: string;
  overallScore: number;
  categories: {
    seo: CategoryScore;
    technical: CategoryScore;
    content: CategoryScore;
    performance: CategoryScore;
  };
  
  seo: SEOAnalysis;
  technical: TechnicalAnalysis;
  content: ContentAnalysis;
  performance: PerformanceAnalysis;
  screenshots: Screenshots;
  recommendations: Recommendation[];
  issues: Issue[];
  llmAnalysis?: LLMAnalysisResult;
}

export interface AuditFilters {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  minScore?: number;
  url?: string;
}

export interface AuditSummary {
  id: string;
  url: string;
  score: number;
  createdAt: string;
  status: 'running' | 'completed' | 'failed';
  userId?: string;
}

export interface AuditStorage {
  saveAudit(audit: AuditResult): Promise<string>;
  getAudit(id: string): Promise<AuditResult | null>;
  listAudits(filters?: AuditFilters): Promise<AuditSummary[]>;
  deleteAudit(id: string): Promise<boolean>;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime?: number;
}

export interface LLMAnalysisResult {
  criticalIssues: DetailedIssue[];
  highPriorityIssues: DetailedIssue[];
  mediumPriorityIssues: DetailedIssue[];
  contentQualityAssessment: ContentQualityAssessment;
  businessImpactProjections: BusinessImpactProjections;
  actionItems: ActionItem[];
}

export interface DetailedIssue {
  id: string;
  title: string;
  description: string;
  impact: string;
  fix: string;
  businessImpact: string;
  codeExample?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'seo' | 'technical' | 'content' | 'performance' | 'navigation' | 'accessibility';
  estimatedFixTime?: string;
}

export interface ContentQualityAssessment {
  overallScore: number;
  issues: string[];
  recommendations: string[];
  credibilityScore?: number;
  professionalismScore?: number;
  readabilityScore?: number;
}

export interface BusinessImpactProjections {
  searchVisibilityIncrease: string;
  userExperienceImprovement: string;
  conversionRateImpact: string;
  expectedTrafficIncrease?: string;
  revenueImpact?: string;
  timeToSeeResults?: string;
}

export interface ActionItem {
  priority: 'immediate' | 'high' | 'medium' | 'low';
  task: string;
  timeline: string;
  codeExample?: string;
  successMetrics?: string[];
  dependencies?: string[];
}