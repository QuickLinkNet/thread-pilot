export interface ApiEndpointItem {
  id: string;
  category: 'Personas' | 'Messages' | 'Tasks' | 'Events' | 'System';
  method: 'GET' | 'POST';
  name: string;
  description: string;
  url: string;
  body?: string;
}
