import { chromium, type Browser, type Page } from 'playwright';
import type { AuditResult, AuditOptions, SEOAnalysis, TechnicalAnalysis, ContentAnalysis, PerformanceAnalysis, Screenshots, Issue, Recommendation } from './types';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function runPlaywrightAudit(url: string, options?: AuditOptions): Promise<AuditResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  
  const page = await context.newPage();
  const startTime = Date.now();
  
  try {
    const failedRequests: any[] = [];
    const networkRequests: any[] = [];
    
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    page.on('response', response => {
      if (!response.ok()) {
        failedRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: options?.timeout || 30000 
    });
    
    await page.waitForSelector('body', { timeout: 10000 });
    
    const seoAnalysis = await analyzeSEO(page);
    const technicalAnalysis = await analyzeTechnical(page, networkRequests, failedRequests);
    const contentAnalysis = await analyzeContent(page);
    const performanceAnalysis = await analyzePerformance(page);
    
    let screenshots: Screenshots = {
      desktop: null,
      mobile: null,
      timestamp: new Date().toISOString()
    };
    
    if (options?.includeScreenshots !== false) {
      screenshots = await captureScreenshots(page, url);
    }
    
    const { issues, recommendations } = analyzeIssuesAndRecommendations(
      seoAnalysis,
      technicalAnalysis,
      contentAnalysis,
      performanceAnalysis
    );
    
    const categories = calculateCategoryScores(issues);
    const overallScore = calculateOverallScore(categories);
    
    const processingTime = Date.now() - startTime;
    
    return {
      url,
      timestamp: new Date().toISOString(),
      overallScore,
      categories,
      seo: seoAnalysis,
      technical: technicalAnalysis,
      content: contentAnalysis,
      performance: performanceAnalysis,
      screenshots,
      recommendations,
      issues,
      processingTime
    };
    
  } finally {
    await context.close();
  }
}

async function analyzeSEO(page: Page): Promise<SEOAnalysis> {
  const title = await page.title();
  
  const metaDescription = await page.$eval('meta[name="description"]', el => el.getAttribute('content')).catch(() => null);
  const metaKeywords = await page.$eval('meta[name="keywords"]', el => el.getAttribute('content')).catch(() => null);
  const viewport = await page.$eval('meta[name="viewport"]', el => el.getAttribute('content')).catch(() => null);
  const charset = await page.$eval('meta[charset]', el => el.getAttribute('charset')).catch(() => null);
  const canonical = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href')).catch(() => null);
  const robots = await page.$eval('meta[name="robots"]', el => el.getAttribute('content')).catch(() => null);
  
  const hreflang = await page.$$eval('link[rel="alternate"][hreflang]', els => 
    els.map(el => el.getAttribute('hreflang')).filter(Boolean)
  ).catch(() => []);
  
  const openGraph = {
    title: await page.$eval('meta[property="og:title"]', el => el.getAttribute('content')).catch(() => null),
    description: await page.$eval('meta[property="og:description"]', el => el.getAttribute('content')).catch(() => null),
    image: await page.$eval('meta[property="og:image"]', el => el.getAttribute('content')).catch(() => null),
    url: await page.$eval('meta[property="og:url"]', el => el.getAttribute('content')).catch(() => null),
    type: await page.$eval('meta[property="og:type"]', el => el.getAttribute('content')).catch(() => null)
  };
  
  const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', els => 
    els.map(el => ({ tag: el.tagName.toLowerCase(), text: el.textContent?.trim() || '' }))
  ).catch(() => []);
  
  const headingStructure = {
    h1: headings.filter(h => h.tag === 'h1').map(h => h.text),
    h2: headings.filter(h => h.tag === 'h2').map(h => h.text),
    h3: headings.filter(h => h.tag === 'h3').map(h => h.text),
    h4: headings.filter(h => h.tag === 'h4').map(h => h.text),
    h5: headings.filter(h => h.tag === 'h5').map(h => h.text),
    h6: headings.filter(h => h.tag === 'h6').map(h => h.text)
  };
  
  return {
    title: {
      content: title,
      length: title.length,
      isOptimal: title.length >= 30 && title.length <= 60
    },
    metaDescription: {
      content: metaDescription,
      length: metaDescription?.length || 0,
      isOptimal: metaDescription ? metaDescription.length >= 120 && metaDescription.length <= 160 : false
    },
    metaKeywords,
    viewport,
    charset,
    canonical,
    hreflang,
    robots,
    openGraph,
    headingStructure
  };
}

async function analyzeTechnical(page: Page, networkRequests: any[], failedRequests: any[]): Promise<TechnicalAnalysis> {
  const performance = await page.evaluate(() => {
    const perf = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      loadTime: perf ? perf.loadEventEnd - perf.navigationStart : 0,
      domContentLoaded: perf ? perf.domContentLoadedEventEnd - perf.navigationStart : 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      timeToInteractive: 0
    };
  });
  
  const hasViewport = await page.$('meta[name="viewport"]').then(el => !!el);
  const hasSSL = page.url().startsWith('https://');
  
  return {
    loadTime: performance.loadTime,
    firstContentfulPaint: performance.firstContentfulPaint,
    largestContentfulPaint: performance.largestContentfulPaint,
    cumulativeLayoutShift: 0,
    timeToInteractive: performance.timeToInteractive,
    networkRequests: {
      total: networkRequests.length,
      failed: failedRequests.length,
      totalSize: 0
    },
    mobileOptimization: {
      hasViewport,
      isResponsive: hasViewport,
      touchTargetSize: true
    },
    accessibility: {
      score: 85,
      issues: []
    },
    security: {
      hasSSL,
      mixedContent: false,
      vulnerabilities: []
    }
  };
}

async function analyzeContent(page: Page): Promise<ContentAnalysis> {
  const wordCount = await page.evaluate(() => {
    const text = document.body.textContent || '';
    return text.trim().split(/\s+/).length;
  });
  
  const images = await page.$$eval('img', imgs => 
    imgs.map(img => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      loading: img.getAttribute('loading')
    }))
  ).catch(() => []);
  
  const links = await page.$$eval('a[href]', links => 
    links.map(link => ({
      href: link.getAttribute('href'),
      text: link.textContent?.trim(),
      rel: link.getAttribute('rel')
    }))
  ).catch(() => []);
  
  const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.trim() === '');
  const emptyAltImages = images.filter(img => img.alt === '');
  const lazyImages = images.filter(img => img.loading === 'lazy');
  
  const internalLinks = links.filter(link => link.href?.startsWith('/') || link.href?.includes(page.url()));
  const externalLinks = links.filter(link => link.href?.startsWith('http') && !link.href?.includes(page.url()));
  const nofollowLinks = links.filter(link => link.rel?.includes('nofollow'));
  const emptyLinks = links.filter(link => !link.text || link.text.trim() === '');
  
  return {
    wordCount,
    readabilityScore: 75,
    images: {
      total: images.length,
      withoutAlt: imagesWithoutAlt.length,
      withEmptyAlt: emptyAltImages.length,
      lazyLoaded: lazyImages.length,
      oversized: 0
    },
    links: {
      total: links.length,
      internal: internalLinks.length,
      external: externalLinks.length,
      broken: 0,
      nofollow: nofollowLinks.length,
      empty: emptyLinks.length
    },
    structuredData: {
      hasStructuredData: false,
      types: [],
      errors: []
    }
  };
}

async function analyzePerformance(page: Page): Promise<PerformanceAnalysis> {
  const metrics = await page.evaluate(() => {
    const perf = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      speedIndex: perf ? perf.loadEventEnd - perf.navigationStart : 0,
      timeToInteractive: 0
    };
  });
  
  const resources = await page.evaluate(() => {
    const resources = window.performance.getEntriesByType('resource');
    const js = resources.filter(r => r.name.includes('.js'));
    const css = resources.filter(r => r.name.includes('.css'));
    const images = resources.filter(r => r.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i));
    
    return {
      javascript: {
        total: js.length,
        unused: 0,
        blocking: 0
      },
      css: {
        total: css.length,
        unused: 0,
        blocking: 0
      },
      images: {
        total: images.length,
        unoptimized: 0,
        totalSize: images.reduce((sum, img) => sum + (img.transferSize || 0), 0)
      }
    };
  });
  
  const overallScore = 85;
  
  return {
    overallScore,
    metrics,
    opportunities: [],
    resources
  };
}

async function captureScreenshots(page: Page, url: string): Promise<Screenshots> {
  const timestamp = new Date().toISOString();
  
  const desktopScreenshot = await page.screenshot({
    fullPage: true,
    type: 'png'
  });
  
  await page.setViewportSize({ width: 375, height: 667 });
  const mobileScreenshot = await page.screenshot({
    fullPage: true,
    type: 'png'
  });
  
  return {
    desktop: `data:image/png;base64,${desktopScreenshot.toString('base64')}`,
    mobile: `data:image/png;base64,${mobileScreenshot.toString('base64')}`,
    timestamp
  };
}

function analyzeIssuesAndRecommendations(
  seo: SEOAnalysis,
  technical: TechnicalAnalysis,
  content: ContentAnalysis,
  performance: PerformanceAnalysis
): { issues: Issue[], recommendations: Recommendation[] } {
  const issues: Issue[] = [];
  const recommendations: Recommendation[] = [];
  
  if (!seo.title.isOptimal) {
    issues.push({
      id: 'title-length',
      type: 'warning',
      category: 'seo',
      title: 'Title tag length not optimal',
      description: `Title is ${seo.title.length} characters. Optimal length is 30-60 characters.`,
      impact: 'medium',
      recommendation: 'Optimize title tag length to 30-60 characters for better search visibility.'
    });
  }
  
  if (!seo.metaDescription.isOptimal) {
    issues.push({
      id: 'meta-description',
      type: 'error',
      category: 'seo',
      title: 'Meta description issues',
      description: seo.metaDescription.content ? 
        `Meta description is ${seo.metaDescription.length} characters. Optimal length is 120-160 characters.` :
        'Meta description is missing.',
      impact: 'high',
      recommendation: 'Add or optimize meta description to 120-160 characters.'
    });
  }
  
  if (seo.headingStructure.h1.length === 0) {
    issues.push({
      id: 'missing-h1',
      type: 'error',
      category: 'seo',
      title: 'Missing H1 tag',
      description: 'Page does not have an H1 tag.',
      impact: 'high',
      recommendation: 'Add a descriptive H1 tag to clearly identify the page topic.'
    });
  }
  
  if (seo.headingStructure.h1.length > 1) {
    issues.push({
      id: 'multiple-h1',
      type: 'warning',
      category: 'seo',
      title: 'Multiple H1 tags',
      description: `Page has ${seo.headingStructure.h1.length} H1 tags.`,
      impact: 'medium',
      recommendation: 'Use only one H1 tag per page for better SEO structure.'
    });
  }
  
  if (content.images.withoutAlt > 0) {
    issues.push({
      id: 'images-without-alt',
      type: 'warning',
      category: 'content',
      title: 'Images without alt text',
      description: `${content.images.withoutAlt} images are missing alt text.`,
      impact: 'medium',
      recommendation: 'Add descriptive alt text to all images for accessibility and SEO.'
    });
  }
  
  if (content.links.empty > 0) {
    issues.push({
      id: 'empty-links',
      type: 'warning',
      category: 'content',
      title: 'Empty link text',
      description: `${content.links.empty} links have empty or missing text.`,
      impact: 'medium',
      recommendation: 'Add descriptive text to all links for better user experience and SEO.'
    });
  }
  
  if (!technical.security.hasSSL) {
    issues.push({
      id: 'no-ssl',
      type: 'error',
      category: 'technical',
      title: 'No SSL certificate',
      description: 'Website is not using HTTPS.',
      impact: 'high',
      recommendation: 'Install SSL certificate to secure the website and improve search rankings.'
    });
  }
  
  if (!technical.mobileOptimization.hasViewport) {
    issues.push({
      id: 'no-viewport',
      type: 'error',
      category: 'technical',
      title: 'Missing viewport meta tag',
      description: 'Page does not have a viewport meta tag.',
      impact: 'high',
      recommendation: 'Add viewport meta tag for proper mobile display.'
    });
  }
  
  if (technical.loadTime > 3000) {
    issues.push({
      id: 'slow-loading',
      type: 'warning',
      category: 'performance',
      title: 'Slow page load time',
      description: `Page loads in ${Math.round(technical.loadTime)}ms.`,
      impact: 'medium',
      recommendation: 'Optimize images, minify CSS/JS, and use caching to improve load times.'
    });
  }
  
  recommendations.push({
    id: 'seo-optimization',
    title: 'SEO Optimization',
    description: 'Improve search engine visibility with better meta tags and content structure.',
    priority: 'high',
    category: 'seo',
    actionItems: [
      'Optimize title tag length',
      'Add or improve meta description',
      'Ensure single H1 tag per page',
      'Add Open Graph tags'
    ],
    estimatedImpact: 'high'
  });
  
  recommendations.push({
    id: 'technical-improvements',
    title: 'Technical Improvements',
    description: 'Enhance website security and mobile optimization.',
    priority: 'medium',
    category: 'technical',
    actionItems: [
      'Implement HTTPS if not already',
      'Add viewport meta tag',
      'Optimize mobile experience',
      'Fix broken links'
    ],
    estimatedImpact: 'medium'
  });
  
  return { issues, recommendations };
}

function calculateCategoryScores(issues: Issue[]) {
  const categories = {
    seo: { score: 100, maxScore: 100, issues: [] as Issue[] },
    technical: { score: 100, maxScore: 100, issues: [] as Issue[] },
    content: { score: 100, maxScore: 100, issues: [] as Issue[] },
    performance: { score: 100, maxScore: 100, issues: [] as Issue[] }
  };
  
  issues.forEach(issue => {
    const category = categories[issue.category];
    category.issues.push(issue);
    
    const penalty = issue.impact === 'high' ? 20 : issue.impact === 'medium' ? 10 : 5;
    category.score = Math.max(0, category.score - penalty);
  });
  
  return categories;
}

function calculateOverallScore(categories: any): number {
  const totalScore = Object.values(categories).reduce((sum: number, cat: any) => sum + cat.score, 0);
  return Math.round(totalScore / Object.keys(categories).length);
}