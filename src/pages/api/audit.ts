import type { APIRoute } from 'astro';
import { createAuditService } from '../../lib/audit-service';

export const POST: APIRoute = async ({ request }) => {
  const auditService = createAuditService();
  
  try {
    const { url, options } = await request.json();
    
    if (!url) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'URL is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const startTime = Date.now();
    const auditId = await auditService.runAudit(url, options);
    const processingTime = Date.now() - startTime;
    
    const auditResult = await auditService.getAuditResult(auditId);
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: auditResult,
      auditId: auditId,
      processingTime
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Audit error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};