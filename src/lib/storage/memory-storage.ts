import type { AuditStorage, AuditResult, AuditFilters, AuditSummary } from '../types';

export class InMemoryAuditStorage implements AuditStorage {
  private audits = new Map<string, AuditResult>();
  
  async saveAudit(audit: AuditResult): Promise<string> {
    const id = generateId();
    const auditWithMetadata = {
      ...audit,
      id,
      createdAt: new Date().toISOString(),
      status: 'completed' as const
    };
    
    console.log('Saving audit with LLM analysis:', audit.llmAnalysis ? 'Yes' : 'No');
    if (audit.llmAnalysis) {
      console.log('Critical issues count:', audit.llmAnalysis.criticalIssues?.length || 0);
    }
    
    this.audits.set(id, auditWithMetadata);
    return id;
  }
  
  async getAudit(id: string): Promise<AuditResult | null> {
    return this.audits.get(id) || null;
  }
  
  async listAudits(filters?: AuditFilters): Promise<AuditSummary[]> {
    const audits = Array.from(this.audits.values());
    
    let filtered = audits;
    
    if (filters?.url) {
      filtered = filtered.filter(audit => 
        audit.url.toLowerCase().includes(filters.url!.toLowerCase())
      );
    }
    
    if (filters?.minScore) {
      filtered = filtered.filter(audit => 
        audit.overallScore >= filters.minScore!
      );
    }
    
    if (filters?.userId) {
      filtered = filtered.filter(audit => 
        audit.userId === filters.userId
      );
    }
    
    if (filters?.dateFrom) {
      filtered = filtered.filter(audit => 
        audit.createdAt! >= filters.dateFrom!
      );
    }
    
    if (filters?.dateTo) {
      filtered = filtered.filter(audit => 
        audit.createdAt! <= filters.dateTo!
      );
    }
    
    return filtered
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .map(audit => ({
        id: audit.id!,
        url: audit.url,
        score: audit.overallScore,
        createdAt: audit.createdAt!,
        status: audit.status || 'completed'
      }));
  }
  
  async deleteAudit(id: string): Promise<boolean> {
    return this.audits.delete(id);
  }
}

function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}