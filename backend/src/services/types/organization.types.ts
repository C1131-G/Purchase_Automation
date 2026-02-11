// Organization Service Types

export interface OrganizationDetail {
  id: number;
  code: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface BranchListItem {
  BPLId: number;
  BPLName: string;
  Address?: string;
}
