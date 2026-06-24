export interface ApprovalRequest {
  id: string;
  actionType: 'edit' | 'delete';
  tableName: string;
  recordId: string;
  plantCode: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  originalData?: Record<string, unknown>;
  newData?: Record<string, unknown> | null;
  notes?: string;
}

export type ApprovalActionType = 'edit' | 'delete';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
