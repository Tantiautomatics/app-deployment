import axios from 'axios';

// Use relative URL if REACT_APP_BACKEND_URL is explicitly empty (for production)
// Otherwise use the provided URL or default to localhost:8010
const API_URL = process.env.REACT_APP_BACKEND_URL === '' 
  ? '/api' 
  : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8010') + '/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Projects
  getProjects: () => axios.get(`${API_URL}/projects`, { headers: getAuthHeader() }),
  getProject: (id) => axios.get(`${API_URL}/projects/${id}`, { headers: getAuthHeader() }),
  createProject: (data) => axios.post(`${API_URL}/projects`, data, { headers: getAuthHeader() }),
  updateProject: (id, data) => axios.put(`${API_URL}/projects/${id}`, data, { headers: getAuthHeader() }),
  deleteProject: (id) => axios.delete(`${API_URL}/projects/${id}`, { headers: getAuthHeader() }),

  // Milestones
  getMilestones: (projectId) => axios.get(`${API_URL}/milestones?project_id=${projectId}`, { headers: getAuthHeader() }),
  createMilestone: (data) => axios.post(`${API_URL}/milestones`, data, { headers: getAuthHeader() }),
  updateMilestone: (id, data) => axios.put(`${API_URL}/milestones/${id}`, data, { headers: getAuthHeader() }),
  deleteMilestone: (id) => axios.delete(`${API_URL}/milestones/${id}`, { headers: getAuthHeader() }),

  // Scope
  getScopeItems: (projectId, milestoneId) => {
    let url = `${API_URL}/scope?`;
    if (projectId) url += `project_id=${projectId}&`;
    if (milestoneId) url += `milestone_id=${milestoneId}`;
    return axios.get(url, { headers: getAuthHeader() });
  },
  createScopeItem: (data) => axios.post(`${API_URL}/scope`, data, { headers: getAuthHeader() }),
  updateScopeItem: (id, data) => axios.put(`${API_URL}/scope/${id}`, data, { headers: getAuthHeader() }),
  deleteScopeItem: (id) => axios.delete(`${API_URL}/scope/${id}`, { headers: getAuthHeader() }),

  // Design Deliverables
  getDesignDeliverables: (projectId) => axios.get(`${API_URL}/design-deliverables?project_id=${projectId}`, { headers: getAuthHeader() }),
  createDesignDeliverable: (data) => axios.post(`${API_URL}/design-deliverables`, data, { headers: getAuthHeader() }),
  updateDesignDeliverable: (id, data) => axios.put(`${API_URL}/design-deliverables/${id}`, data, { headers: getAuthHeader() }),

  // Material Requests
  getMaterialRequests: (projectId) => axios.get(`${API_URL}/material-requests?project_id=${projectId}`, { headers: getAuthHeader() }),
  createMaterialRequest: (data) => axios.post(`${API_URL}/material-requests`, data, { headers: getAuthHeader() }),
  updateMaterialRequest: (id, data) => axios.put(`${API_URL}/material-requests/${id}`, data, { headers: getAuthHeader() }),

  // Purchase Orders
  getPurchaseOrders: (projectId) => axios.get(`${API_URL}/purchase-orders?project_id=${projectId}`, { headers: getAuthHeader() }),
  createPurchaseOrder: (data) => axios.post(`${API_URL}/purchase-orders`, data, { headers: getAuthHeader() }),
  updatePurchaseOrder: (id, data) => axios.put(`${API_URL}/purchase-orders/${id}`, data, { headers: getAuthHeader() }),

  // Issues
  getIssues: (projectId) => {
    const query = projectId ? `?project_id=${projectId}` : '';
    return axios.get(`${API_URL}/issues${query}`, { headers: getAuthHeader() });
  },
  createIssue: (data) => axios.post(`${API_URL}/issues`, data, { headers: getAuthHeader() }),
  updateIssue: (id, data) => axios.put(`${API_URL}/issues/${id}`, data, { headers: getAuthHeader() }),

  // Timesheets
  getTimesheets: (projectId, userId) => {
    let url = `${API_URL}/timesheets?`;
    if (projectId) url += `project_id=${projectId}&`;
    if (userId) url += `user_id=${userId}`;
    return axios.get(url, { headers: getAuthHeader() });
  },
  createTimesheet: (data) => axios.post(`${API_URL}/timesheets`, data, { headers: getAuthHeader() }),
  updateTimesheet: (id, data) => axios.put(`${API_URL}/timesheets/${id}`, data, { headers: getAuthHeader() }),

  // Documents
  uploadDocument: (formData) => axios.post(`${API_URL}/documents/upload`, formData, {
    headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
  }),
  getDocuments: (projectId, type) => {
    let url = `${API_URL}/documents?`;
    if (projectId) url += `project_id=${projectId}&`;
    if (type) url += `type=${type}`;
    return axios.get(url, { headers: getAuthHeader() });
  },

  // Notifications
  getNotifications: () => axios.get(`${API_URL}/notifications`, { headers: getAuthHeader() }),
  markNotificationsRead: () => axios.put(`${API_URL}/notifications/mark-read`, {}, { headers: getAuthHeader() }),

  // Activity Logs
  getActivityLogs: (projectId) => {
    let url = `${API_URL}/activity-logs`;
    if (projectId) url += `?project_id=${projectId}`;
    return axios.get(url, { headers: getAuthHeader() });
  },

  // Dashboard
  getDashboardStats: () => axios.get(`${API_URL}/projects/summary`, { headers: getAuthHeader() }),

  // Milestone Grid (Secondary Sales)
  getMilestonesGrid: () => axios.get(`${API_URL}/milestones/grid`, { headers: getAuthHeader() }),
  createMilestonesGrid: (data) => axios.post(`${API_URL}/milestones/grid`, data, { headers: getAuthHeader() }),
  updateMilestoneCell: (id, field, value) => axios.put(`${API_URL}/milestones/grid/${id}`, { field, value }, { headers: getAuthHeader() }),
  deleteMilestonesGrid: (id) => axios.delete(`${API_URL}/milestones/grid/${id}`, { headers: getAuthHeader() }),

  // Site Execution Milestone Grid
  getSiteExecutionMilestonesGrid: () => axios.get(`${API_URL}/milestones/site-execution-grid`, { headers: getAuthHeader() }),
  createSiteExecutionMilestonesGrid: (data) => axios.post(`${API_URL}/milestones/site-execution-grid`, data, { headers: getAuthHeader() }),
  updateSiteExecutionMilestoneCell: (id, field, value) => axios.put(`${API_URL}/milestones/site-execution-grid/${id}`, { field, value }, { headers: getAuthHeader() }),
  deleteSiteExecutionMilestonesGrid: (id) => axios.delete(`${API_URL}/milestones/site-execution-grid/${id}`, { headers: getAuthHeader() })
};
