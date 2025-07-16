import type { AuditResult, Issue, Recommendation, LLMAnalysisResult } from './types';

export interface LLMAnalysisOptions {
  includeContentAnalysis?: boolean;
  includeBusinessImpact?: boolean;
  includeCodeExamples?: boolean;
  includePriorityScoring?: boolean;
}

export class LLMService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = baseUrl || 'https://api.anthropic.com/v1/messages';
  }

  async analyzeAuditResults(
    auditResult: AuditResult,
    pageContent: string,
    options: LLMAnalysisOptions = {}
  ): Promise<LLMAnalysisResult> {
    if (!this.apiKey) {
      console.warn('LLM API key not configured, using basic analysis');
      return this.getFallbackAnalysis(auditResult);
    }

    const prompt = this.buildAnalysisPrompt(auditResult, pageContent, options);
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseAnalysisResponse(data.content[0].text, auditResult);
    } catch (error) {
      console.error('LLM analysis failed:', error);
      return this.getFallbackAnalysis(auditResult);
    }
  }

  private buildAnalysisPrompt(
    auditResult: AuditResult,
    pageContent: string,
    options: LLMAnalysisOptions
  ): string {
    return `
You are an expert SEO analyst. Analyze this website audit data and provide detailed insights.

WEBSITE: ${auditResult.url}
AUDIT DATA: ${JSON.stringify(auditResult, null, 2)}

PAGE CONTENT SAMPLE:
${pageContent.substring(0, 2000)}...

Please provide a detailed analysis including:

1. **Critical Issues** (High impact, fix immediately):
   - Specific problems with business impact
   - Code examples for fixes
   - Expected improvement metrics

2. **High Priority Issues** (Fix this week):
   - Technical SEO problems
   - Content quality issues
   - User experience problems

3. **Medium Priority Issues** (Fix this month):
   - Enhancement opportunities
   - Best practice implementations

4. **Content Quality Assessment**:
   - Professional tone analysis
   - Credibility issues
   - Content gaps

5. **Business Impact Projections**:
   - Search visibility improvements
   - User experience enhancements
   - Conversion rate implications

6. **Specific Action Items**:
   - Code snippets to implement
   - Timeline recommendations
   - Success metrics to track

Format your response as structured JSON with these sections:
- criticalIssues: array of detailed issue objects
- highPriorityIssues: array of detailed issue objects
- mediumPriorityIssues: array of detailed issue objects
- contentQualityAssessment: object with detailed analysis
- businessImpactProjections: object with improvement estimates
- actionItems: array with specific tasks and timelines

Focus on actionable, specific recommendations like the example report format.
`;
  }

  private parseAnalysisResponse(response: string, auditResult: AuditResult): LLMAnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/```json\n(.*?)\n```/s) || response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
    }

    // Fallback to basic parsing
    return this.getFallbackAnalysis(auditResult);
  }

  private getFallbackAnalysis(auditResult: AuditResult): LLMAnalysisResult {
    return {
      criticalIssues: this.extractCriticalIssues(auditResult),
      highPriorityIssues: this.extractHighPriorityIssues(auditResult),
      mediumPriorityIssues: this.extractMediumPriorityIssues(auditResult),
      contentQualityAssessment: {
        overallScore: 75,
        issues: ['Basic content analysis - LLM not available'],
        recommendations: ['Enable LLM integration for detailed content analysis']
      },
      businessImpactProjections: {
        searchVisibilityIncrease: '20-30%',
        userExperienceImprovement: 'Medium',
        conversionRateImpact: 'Low to Medium'
      },
      actionItems: [
        {
          priority: 'immediate',
          task: 'Fix critical SEO issues',
          timeline: 'Today',
          codeExample: null
        }
      ]
    };
  }

  private extractCriticalIssues(auditResult: AuditResult): any[] {
    const critical = [];
    
    if (!auditResult.seo.metaDescription.content) {
      critical.push({
        id: 'missing-meta-description',
        title: 'Meta Description Missing',
        description: 'No meta description tag found',
        impact: 'Poor search engine visibility and click-through rates',
        fix: 'Add compelling 150-160 character descriptions for each page',
        businessImpact: 'High - affects search rankings and CTR',
        codeExample: '<meta name="description" content="Your compelling description here">'
      });
    }

    if (!auditResult.seo.canonical) {
      critical.push({
        id: 'missing-canonical',
        title: 'Canonical Links Missing',
        description: 'No canonical link tags found',
        impact: 'Potential duplicate content issues',
        fix: 'Add canonical URLs to all pages',
        businessImpact: 'Medium - affects search indexing',
        codeExample: '<link rel="canonical" href="https://example.com/page">'
      });
    }

    return critical;
  }

  private extractHighPriorityIssues(auditResult: AuditResult): any[] {
    const high = [];
    
    if (!auditResult.seo.title.isOptimal) {
      high.push({
        id: 'title-optimization',
        title: 'Title Tag Not Optimal',
        description: `Title is ${auditResult.seo.title.length} characters`,
        impact: 'Suboptimal search visibility',
        fix: 'Optimize title tag to 30-60 characters',
        businessImpact: 'Medium - affects click-through rates'
      });
    }

    return high;
  }

  private extractMediumPriorityIssues(auditResult: AuditResult): any[] {
    const medium = [];
    
    if (!auditResult.seo.openGraph.title) {
      medium.push({
        id: 'missing-og-tags',
        title: 'Open Graph Tags Missing',
        description: 'No social media optimization tags found',
        impact: 'Poor social sharing appearance',
        fix: 'Implement complete OG tag set',
        businessImpact: 'Low to Medium - affects social media reach'
      });
    }

    return medium;
  }
}

export function createLLMService(): LLMService {
  return new LLMService();
}