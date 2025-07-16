import type { APIRoute } from 'astro';
import { createAuditService } from '../../../lib/audit-service';

export const GET: APIRoute = async ({ params }) => {
  const auditService = createAuditService();
  
  try {
    const auditId = params.id;
    
    if (!auditId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Audit ID is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const audit = await auditService.getAuditResult(auditId);
    
    if (!audit) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Audit not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: audit 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Get audit error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};