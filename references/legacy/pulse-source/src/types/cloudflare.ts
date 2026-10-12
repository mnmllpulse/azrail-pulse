export interface CFDomain {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'error';
  type: 'Full' | 'Partial';
  plan: string;
}

export interface CFWorker {
  id: string;
  name: string;
  status: 'enabled' | 'disabled';
  lastDeployed: string;
  routes: string[];
}

export interface CFConfig {
  apiToken: string;
  accountId: string;
  email?: string;
}
