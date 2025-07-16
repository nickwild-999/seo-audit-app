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
    // Always use fallback analysis for now since LLM API is not configured
    console.log('Using fallback analysis instead of LLM');
    return this.getFallbackAnalysis(auditResult);
    
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
    console.log('Generating fallback analysis for:', auditResult.url);
    
    const analysis = {
      criticalIssues: this.extractCriticalIssues(auditResult),
      highPriorityIssues: this.extractHighPriorityIssues(auditResult),
      mediumPriorityIssues: this.extractMediumPriorityIssues(auditResult),
      contentQualityAssessment: {
        overallScore: this.calculateContentQualityScore(auditResult),
        issues: this.extractContentIssues(auditResult),
        recommendations: this.extractContentRecommendations(auditResult)
      },
      businessImpactProjections: {
        searchVisibilityIncrease: this.calculateSEOImpact(auditResult),
        userExperienceImprovement: this.calculateUXImpact(auditResult),
        conversionRateImpact: this.calculateConversionImpact(auditResult)
      },
      actionItems: this.extractActionItems(auditResult)
    };
    
    console.log('Fallback analysis generated:', JSON.stringify(analysis, null, 2));
    return analysis;
  }

  private extractCriticalIssues(auditResult: AuditResult): any[] {
    const critical = [];
    
    // SEO Fundamentals Missing
    if (!auditResult.seo.metaDescription.content) {
      critical.push({
        id: 'missing-meta-description',
        title: 'Meta Description Missing',
        description: 'No <meta name="description"> tag found',
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
        description: 'No <link rel="canonical"> tags found',
        impact: 'Potential duplicate content issues',
        fix: 'Add canonical URLs to all pages',
        businessImpact: 'Medium - affects search indexing',
        codeExample: '<link rel="canonical" href="https://example.com/page">'
      });
    }

    if (!auditResult.seo.openGraph.title) {
      critical.push({
        id: 'missing-open-graph',
        title: 'Open Graph Meta Tags Missing',
        description: 'No Facebook/social media sharing optimization. Missing: og:title, og:description, og:image, og:url',
        impact: 'Poor social media sharing appearance',
        fix: 'Implement complete OG tag set',
        businessImpact: 'Medium - affects social media reach',
        codeExample: `<meta property="og:title" content="[Page title]">
<meta property="og:description" content="[Page description]">
<meta property="og:image" content="[Social sharing image URL]">
<meta property="og:url" content="[Current page URL]">
<meta property="og:type" content="website">`
      });
    }

    if (!auditResult.seo.viewport) {
      critical.push({
        id: 'missing-viewport',
        title: 'Viewport Meta Tag Missing',
        description: 'Need to verify mobile viewport configuration',
        impact: 'Poor mobile experience and rankings',
        fix: 'Add viewport meta tag for proper mobile display',
        businessImpact: 'High - affects mobile SEO',
        codeExample: '<meta name="viewport" content="width=device-width, initial-scale=1">'
      });
    }

    return critical;
  }

  private extractHighPriorityIssues(auditResult: AuditResult): any[] {
    const high = [];
    
    // Navigation Issues
    if (auditResult.content.placeholderLinks && auditResult.content.placeholderLinks.length > 0) {
      high.push({
        id: 'broken-navigation',
        title: 'Broken Navigation Links',
        description: `${auditResult.content.placeholderLinks.length} navigation links point to placeholders (#, #_, example.com)`,
        impact: 'Users cannot navigate the main site sections',
        fix: 'Replace placeholder links with actual URLs',
        businessImpact: 'High - affects user experience and engagement',
        codeExample: '<!-- Replace these: -->\n<a href="#_">What We Do</a>\n<!-- With actual URLs: -->\n<a href="/services">What We Do</a>'
      });
    }

    // Title optimization
    if (!auditResult.seo.title.isOptimal) {
      high.push({
        id: 'title-optimization',
        title: 'Title Tag Not Optimal',
        description: `Title is ${auditResult.seo.title.length} characters. Optimal length is 30-60 characters`,
        impact: 'Suboptimal search visibility and click-through rates',
        fix: 'Optimize title tag to 30-60 characters',
        businessImpact: 'Medium - affects search rankings and CTR'
      });
    }

    // Images without alt text
    if (auditResult.content.images.withoutAlt > 0) {
      high.push({
        id: 'images-accessibility',
        title: 'Images Without Alt Text',
        description: `${auditResult.content.images.withoutAlt} images are missing descriptive alt text`,
        impact: 'Poor accessibility for screen readers and SEO',
        fix: 'Add descriptive alt text to all images',
        businessImpact: 'Medium - affects accessibility compliance and SEO',
        codeExample: '<img src="logo.png" alt="Company Name - Professional Services">'
      });
    }

    // SSL check
    if (!auditResult.technical.security.hasSSL) {
      high.push({
        id: 'no-ssl',
        title: 'No SSL Certificate',
        description: 'Website is not using HTTPS',
        impact: 'Security warnings and poor search rankings',
        fix: 'Install SSL certificate and redirect HTTP to HTTPS',
        businessImpact: 'High - affects trust and search rankings'
      });
    }

    return high;
  }

  private extractMediumPriorityIssues(auditResult: AuditResult): any[] {
    const medium = [];
    
    // Testimonial issues
    if (auditResult.content.hasSuspiciousTestimonials) {
      medium.push({
        id: 'fake-testimonials',
        title: 'Inappropriate Testimonials',
        description: 'Testimonials contain clearly fake/test content with celebrity names',
        impact: 'Damages credibility and professionalism',
        fix: 'Replace with real client testimonials or remove section',
        businessImpact: 'Medium - affects brand credibility'
      });
    }

    // Performance issues
    if (auditResult.technical.loadTime > 3000) {
      medium.push({
        id: 'slow-loading',
        title: 'Slow Page Load Time',
        description: `Page loads in ${Math.round(auditResult.technical.loadTime)}ms`,
        impact: 'Poor user experience and search rankings',
        fix: 'Optimize images, minify CSS/JS, and use caching',
        businessImpact: 'Medium - affects user engagement'
      });
    }

    // Content quality
    if (auditResult.content.wordCount < 300) {
      medium.push({
        id: 'thin-content',
        title: 'Thin Content',
        description: `Page has only ${auditResult.content.wordCount} words`,
        impact: 'Poor search engine rankings for competitive terms',
        fix: 'Add more comprehensive, valuable content',
        businessImpact: 'Medium - affects SEO performance'
      });
    }

    return medium;
  }

  private calculateContentQualityScore(auditResult: AuditResult): number {
    let score = 100;
    
    // Deduct for missing meta description
    if (!auditResult.seo.metaDescription.content) score -= 20;
    
    // Deduct for broken links
    if (auditResult.content.placeholderLinks && auditResult.content.placeholderLinks.length > 0) {
      score -= auditResult.content.placeholderLinks.length * 5;
    }
    
    // Deduct for images without alt text
    if (auditResult.content.images.withoutAlt > 0) {
      score -= auditResult.content.images.withoutAlt * 3;
    }
    
    // Deduct for suspicious testimonials
    if (auditResult.content.hasSuspiciousTestimonials) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  private extractContentIssues(auditResult: AuditResult): string[] {
    const issues = [];
    
    if (!auditResult.seo.metaDescription.content) {
      issues.push('Missing meta description tags');
    }
    
    if (auditResult.content.placeholderLinks && auditResult.content.placeholderLinks.length > 0) {
      issues.push(`${auditResult.content.placeholderLinks.length} broken/placeholder links detected`);
    }
    
    if (auditResult.content.images.withoutAlt > 0) {
      issues.push(`${auditResult.content.images.withoutAlt} images missing alt text`);
    }
    
    if (auditResult.content.hasSuspiciousTestimonials) {
      issues.push('Fake testimonials detected');
    }
    
    return issues;
  }

  private extractContentRecommendations(auditResult: AuditResult): string[] {
    const recommendations = [];
    
    recommendations.push('Add compelling meta descriptions to all pages');
    recommendations.push('Fix all broken and placeholder links');
    recommendations.push('Add descriptive alt text to all images');
    recommendations.push('Replace test content with real testimonials');
    recommendations.push('Implement proper heading hierarchy');
    
    return recommendations;
  }

  private calculateSEOImpact(auditResult: AuditResult): string {
    const criticalIssues = this.extractCriticalIssues(auditResult).length;
    
    if (criticalIssues >= 3) return '30-50% with proper meta tags and fixes';
    if (criticalIssues >= 2) return '20-30% with SEO improvements';
    return '10-20% with minor optimizations';
  }

  private calculateUXImpact(auditResult: AuditResult): string {
    const hasNavigationIssues = auditResult.content.placeholderLinks && auditResult.content.placeholderLinks.length > 0;
    const hasPerformanceIssues = auditResult.technical.loadTime > 3000;
    
    if (hasNavigationIssues && hasPerformanceIssues) return 'High - functional navigation and performance fixes';
    if (hasNavigationIssues) return 'Medium - functional navigation will reduce bounce rate';
    if (hasPerformanceIssues) return 'Medium - performance improvements will help engagement';
    return 'Low to Medium - minor improvements';
  }

  private calculateConversionImpact(auditResult: AuditResult): string {
    const hasContactIssues = auditResult.content.placeholderLinks && auditResult.content.placeholderLinks.length > 0;
    const hasCredibilityIssues = auditResult.content.hasSuspiciousTestimonials;
    
    if (hasContactIssues && hasCredibilityIssues) return 'Medium to High - working contact methods and credible testimonials';
    if (hasContactIssues) return 'Medium - working contact methods will improve lead generation';
    if (hasCredibilityIssues) return 'Medium - professional testimonials will increase credibility';
    return 'Low to Medium - minor conversion improvements';
  }

  private extractActionItems(auditResult: AuditResult): ActionItem[] {
    const actionItems = [];
    
    // Immediate actions
    if (!auditResult.seo.metaDescription.content) {
      actionItems.push({
        priority: 'immediate',
        task: 'Add meta descriptions to all pages',
        timeline: 'Today',
        codeExample: '<meta name="description" content="Compelling 150-160 character description">',
        successMetrics: ['Improved search result snippets', 'Higher click-through rates']
      });
    }
    
    if (auditResult.content.placeholderLinks && auditResult.content.placeholderLinks.length > 0) {
      actionItems.push({
        priority: 'immediate',
        task: 'Fix main navigation links - replace #_ with actual URLs',
        timeline: 'Today',
        codeExample: '<a href="/services">What We Do</a>',
        successMetrics: ['Functional navigation', 'Reduced bounce rate']
      });
    }
    
    if (auditResult.content.hasSuspiciousTestimonials) {
      actionItems.push({
        priority: 'immediate',
        task: 'Replace fake testimonials with real content or remove',
        timeline: 'Today',
        successMetrics: ['Improved credibility', 'Better user trust']
      });
    }
    
    // High priority actions
    if (!auditResult.seo.openGraph.title) {
      actionItems.push({
        priority: 'high',
        task: 'Implement Open Graph tags for social sharing',
        timeline: 'This week',
        codeExample: '<meta property="og:title" content="Page Title">\n<meta property="og:description" content="Page Description">',
        successMetrics: ['Better social sharing', 'Increased social engagement']
      });
    }
    
    if (auditResult.content.images.withoutAlt > 0) {
      actionItems.push({
        priority: 'high',
        task: 'Audit image alt attributes',
        timeline: 'This week',
        codeExample: '<img src="image.jpg" alt="Descriptive alt text">',
        successMetrics: ['Better accessibility', 'Improved SEO']
      });
    }
    
    // Medium priority actions
    actionItems.push({
      priority: 'medium',
      task: 'Content proofreading and corrections',
      timeline: 'This month',
      successMetrics: ['Professional appearance', 'Better user experience']
    });
    
    actionItems.push({
      priority: 'medium',
      task: 'Implement structured data markup',
      timeline: 'This month',
      successMetrics: ['Rich search results', 'Better search visibility']
    });
    
    return actionItems;
  }
}

export function createLLMService(): LLMService {
  return new LLMService();
}