import { Controller, Get, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { SkipTelescope } from './decorators/skip-telescope.decorator';
import { TelescopeService } from './telescope.service';

@Controller('telescope')
@SkipTelescope()
export class TelescopeDashboardController {
  constructor(private readonly telescopeService: TelescopeService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  getDashboard(@Res() res: Response) {
    if (!this.telescopeService.isEnabled()) {
      res.status(404).send('Telescope is disabled');
      return;
    }

    res.send(this.getHtmlTemplate());
  }

  private getHtmlTemplate(): string {
    const apiBase = '/telescope';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telescope - Request Inspector</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f23;
      color: #e0e0e0;
      min-height: 100vh;
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 20px 30px;
      border-bottom: 1px solid #2a2a4a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      font-size: 24px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header h1::before {
      content: "🔭";
    }
    .stats-bar {
      display: flex;
      gap: 20px;
    }
    .stat {
      background: rgba(255,255,255,0.05);
      padding: 10px 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #4fc3f7;
    }
    .stat-label {
      font-size: 12px;
      color: #888;
      margin-top: 4px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    .filters {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .filters select, .filters input {
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      color: #e0e0e0;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 14px;
    }
    .filters button {
      background: #4fc3f7;
      color: #000;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .filters button:hover {
      background: #29b6f6;
    }
    .btn-danger {
      background: #ef5350 !important;
      color: #fff !important;
    }
    .btn-danger:hover {
      background: #e53935 !important;
    }
    .requests-table {
      width: 100%;
      border-collapse: collapse;
      background: #1a1a2e;
      border-radius: 10px;
      overflow: hidden;
    }
    .requests-table th {
      background: #16213e;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #888;
      font-size: 12px;
      text-transform: uppercase;
    }
    .requests-table td {
      padding: 15px;
      border-bottom: 1px solid #2a2a4a;
      font-size: 14px;
    }
    .requests-table tr:hover {
      background: rgba(79, 195, 247, 0.05);
      cursor: pointer;
    }
    .method {
      font-weight: bold;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
    }
    .method-GET { background: #4caf50; color: #fff; }
    .method-POST { background: #2196f3; color: #fff; }
    .method-PUT { background: #ff9800; color: #fff; }
    .method-PATCH { background: #9c27b0; color: #fff; }
    .method-DELETE { background: #f44336; color: #fff; }
    .status {
      font-weight: bold;
    }
    .status-2xx { color: #4caf50; }
    .status-3xx { color: #ff9800; }
    .status-4xx { color: #ff5722; }
    .status-5xx { color: #f44336; }
    .duration {
      color: #888;
    }
    .duration.slow { color: #ff9800; }
    .duration.very-slow { color: #f44336; }
    .path {
      font-family: 'Monaco', 'Menlo', monospace;
      color: #4fc3f7;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 1000;
      overflow-y: auto;
    }
    .modal.active { display: block; }
    .modal-content {
      background: #1a1a2e;
      max-width: 900px;
      margin: 50px auto;
      border-radius: 10px;
      padding: 30px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #2a2a4a;
    }
    .modal-close {
      background: none;
      border: none;
      color: #888;
      font-size: 24px;
      cursor: pointer;
    }
    .detail-section {
      margin-bottom: 20px;
    }
    .detail-section h3 {
      color: #4fc3f7;
      margin-bottom: 10px;
      font-size: 14px;
      text-transform: uppercase;
    }
    .detail-section pre {
      background: #0f0f23;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 13px;
      font-family: 'Monaco', 'Menlo', monospace;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    .detail-item {
      background: #0f0f23;
      padding: 15px;
      border-radius: 6px;
    }
    .detail-item label {
      color: #888;
      font-size: 12px;
      display: block;
      margin-bottom: 5px;
    }
    .detail-item span {
      font-weight: 600;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    .empty-state h2 {
      margin-bottom: 10px;
    }
    .refresh-btn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: #4fc3f7;
      color: #000;
      border: none;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(79, 195, 247, 0.3);
    }
    .refresh-btn:hover {
      transform: scale(1.1);
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .loading .refresh-btn {
      animation: spin 1s linear infinite;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Telescope</h1>
    <div class="stats-bar" id="statsBar">
      <div class="stat">
        <div class="stat-value" id="totalRequests">-</div>
        <div class="stat-label">Total Requests</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="avgTime">-</div>
        <div class="stat-label">Avg Response</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="errorRate">-</div>
        <div class="stat-label">Error Rate</div>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="filters">
      <select id="methodFilter">
        <option value="">All Methods</option>
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="PATCH">PATCH</option>
        <option value="DELETE">DELETE</option>
      </select>
      <select id="statusFilter">
        <option value="">All Status</option>
        <option value="200">2xx Success</option>
        <option value="400">4xx Client Error</option>
        <option value="500">5xx Server Error</option>
      </select>
      <input type="text" id="pathFilter" placeholder="Filter by path...">
      <button onclick="loadRequests()">Filter</button>
      <button class="btn-danger" onclick="clearRequests()">Clear All</button>
    </div>

    <table class="requests-table">
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Time</th>
          <th>IP</th>
        </tr>
      </thead>
      <tbody id="requestsBody">
      </tbody>
    </table>

    <div class="empty-state" id="emptyState" style="display:none;">
      <h2>No requests recorded yet</h2>
      <p>Make some API calls to see them here</p>
    </div>
  </div>

  <button class="refresh-btn" onclick="loadRequests()" title="Refresh">↻</button>

  <div class="modal" id="detailModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modalTitle">Request Details</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div id="modalBody"></div>
    </div>
  </div>

  <script>
    const API_BASE = '${apiBase}';

    async function loadRequests() {
      try {
        const method = document.getElementById('methodFilter').value;
        const status = document.getElementById('statusFilter').value;
        const path = document.getElementById('pathFilter').value;

        let url = API_BASE + '/requests?limit=100';
        if (method) url += '&method=' + method;
        if (status) url += '&statusCode=' + status;
        if (path) url += '&path=' + encodeURIComponent(path);

        const [requestsRes, statsRes] = await Promise.all([
          fetch(url),
          fetch(API_BASE + '/stats')
        ]);

        const requests = await requestsRes.json();
        const stats = await statsRes.json();

        renderStats(stats);
        renderRequests(requests.entries);
      } catch (err) {
        console.error('Failed to load requests:', err);
      }
    }

    function renderStats(stats) {
      document.getElementById('totalRequests').textContent = stats.totalRequests || 0;
      document.getElementById('avgTime').textContent = (stats.avgResponseTime || 0) + 'ms';

      const errors = (stats.requestsByStatus || {})[500] || 0;
      const total = stats.totalRequests || 1;
      const errorRate = ((errors / total) * 100).toFixed(1);
      document.getElementById('errorRate').textContent = errorRate + '%';
    }

    function renderRequests(entries) {
      const tbody = document.getElementById('requestsBody');
      const emptyState = document.getElementById('emptyState');

      if (!entries || entries.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';
      tbody.innerHTML = entries.map(entry => {
        const statusClass = getStatusClass(entry.statusCode);
        const durationClass = getDurationClass(entry.duration);
        const time = new Date(entry.timestamp).toLocaleTimeString();

        return \`
          <tr onclick="showDetail('\${entry.id}')">
            <td><span class="method method-\${entry.method}">\${entry.method}</span></td>
            <td class="path">\${entry.path}</td>
            <td class="status \${statusClass}">\${entry.statusCode}</td>
            <td class="duration \${durationClass}">\${entry.duration}ms</td>
            <td>\${time}</td>
            <td>\${entry.ip}</td>
          </tr>
        \`;
      }).join('');
    }

    function getStatusClass(status) {
      if (status >= 500) return 'status-5xx';
      if (status >= 400) return 'status-4xx';
      if (status >= 300) return 'status-3xx';
      return 'status-2xx';
    }

    function getDurationClass(duration) {
      if (duration > 1000) return 'very-slow';
      if (duration > 500) return 'slow';
      return '';
    }

    async function showDetail(id) {
      try {
        const res = await fetch(API_BASE + '/requests/' + id);
        const entry = await res.json();

        document.getElementById('modalTitle').innerHTML =
          '<span class="method method-' + entry.method + '">' + entry.method + '</span> ' + entry.path;

        document.getElementById('modalBody').innerHTML = \`
          <div class="detail-grid">
            <div class="detail-item">
              <label>Status Code</label>
              <span class="status \${getStatusClass(entry.statusCode)}">\${entry.statusCode}</span>
            </div>
            <div class="detail-item">
              <label>Duration</label>
              <span>\${entry.duration}ms</span>
            </div>
            <div class="detail-item">
              <label>IP Address</label>
              <span>\${entry.ip}</span>
            </div>
            <div class="detail-item">
              <label>User Agent</label>
              <span>\${entry.userAgent?.substring(0, 50) || 'N/A'}...</span>
            </div>
            <div class="detail-item">
              <label>User ID</label>
              <span>\${entry.userId || 'Anonymous'}</span>
            </div>
            <div class="detail-item">
              <label>Timestamp</label>
              <span>\${new Date(entry.timestamp).toLocaleString()}</span>
            </div>
          </div>

          <div class="detail-section">
            <h3>Query Parameters</h3>
            <pre>\${JSON.stringify(entry.query, null, 2) || '{}'}</pre>
          </div>

          <div class="detail-section">
            <h3>Request Body</h3>
            <pre>\${JSON.stringify(entry.body, null, 2) || '{}'}</pre>
          </div>

          <div class="detail-section">
            <h3>Headers</h3>
            <pre>\${JSON.stringify(entry.headers, null, 2) || '{}'}</pre>
          </div>

          <div class="detail-section">
            <h3>Response</h3>
            <pre>\${JSON.stringify(entry.response, null, 2) || '{}'}</pre>
          </div>
        \`;

        document.getElementById('detailModal').classList.add('active');
      } catch (err) {
        console.error('Failed to load detail:', err);
      }
    }

    function closeModal() {
      document.getElementById('detailModal').classList.remove('active');
    }

    async function clearRequests() {
      if (!confirm('Are you sure you want to clear all requests?')) return;
      try {
        await fetch(API_BASE + '/clear', { method: 'DELETE' });
        loadRequests();
      } catch (err) {
        console.error('Failed to clear:', err);
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Auto-refresh every 5 seconds
    setInterval(loadRequests, 5000);

    // Initial load
    loadRequests();
  </script>
</body>
</html>`;
  }
}
