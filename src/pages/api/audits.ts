import type { APIRoute } from 'astro';
import { createAuditService } from '../../lib/audit-service';

export const GET: APIRoute = async ({ url }) => {
  const auditService = createAuditService();
  
  try {
    const searchParams = new URLSearchParams(url.search);
    const query = searchParams.get('q');
    const userId = searchParams.get('userId');
    
    const audits = query 
      ? await auditService.searchAudits(query)
      : await auditService.getUserAudits(userId || undefined);
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: audits 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('List audits error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};