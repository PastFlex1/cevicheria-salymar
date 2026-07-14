// src/lib/api.ts
const API_BASE = '/api';

async function fetchJSON(url: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

export const api = {
  // Generic collection methods
  getCollection: (collection: string) => fetchJSON(`/${collection}`),
  getDoc: (collection: string, id: string) => fetchJSON(`/${collection}/${id}`),
  addDoc: (collection: string, data: any) => fetchJSON(`/${collection}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateDoc: (collection: string, id: string, data: any) => fetchJSON(`/${collection}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteDoc: (collection: string, id: string) => fetchJSON(`/${collection}/${id}`, {
    method: 'DELETE',
  }),

  // SRI Specific
  emitirFacturaSRI: (payload: any) => fetchJSON(`/sri/emitir`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
};
