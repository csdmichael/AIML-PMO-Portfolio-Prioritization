export interface OneLakeDatasetSummary {
  key: string;
  label: string;
  description: string;
  path: string;
  shape: 'array' | 'object';
  access: 'read' | 'readWrite';
  requiredFields: string[];
  maxBytes: number;
}

export interface OneLakeDatasetList {
  items: OneLakeDatasetSummary[];
  count: number;
}

export interface OneLakeDatasetView extends OneLakeDatasetSummary {
  exists: boolean;
  etag: string | null;
  data: unknown;
}
