import type { AuditStorage, AuditResult, AuditSummary, AuditOptions } from './types';
import { InMemoryAuditStorage } from './storage/memory-storage';
import { runPlaywrightAudit } from './playwright-audit';

export class AuditService {
  constructor(private storage: AuditStorage) {}
  
  async runAudit(url: string, options?: AuditOptions): Promise<string> {
    if (!this.isValidURL(url)) {
      throw new Error('Invalid URL format');
    }
    
    const auditResult = await runPlaywrightAudit(url, options);
    
    const auditId = await this.storage.saveAudit(auditResult);
    return auditId;
  }
  
  async getAuditResult(id: string): Promise<AuditResult | null> {
    return this.storage.getAudit(id);
  }
  
  async getUserAudits(userId?: string): Promise<AuditSummary[]> {
    return this.storage.listAudits({ userId });
  }
  
  async searchAudits(query: string): Promise<AuditSummary[]> {
    return this.storage.listAudits({ url: query });
  }
  
  async deleteAudit(id: string): Promise<boolean> {
    return this.storage.deleteAudit(id);
  }
  
  private isValidURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }
}

// Singleton instance for in-memory storage
let storageInstance: AuditStorage | null = null;

export function createAuditService(): AuditService {
  if (!storageInstance) {
    storageInstance = new InMemoryAuditStorage();
  }
  return new AuditService(storageInstance);
}