/**
 * QuizArena — Admin Sidebar Renderer
 * Usage: <div id="admin-sidebar-root"></div>
 * Then include this script and call: renderAdminSidebar('deposits')
 */
function renderAdminSidebar(activePage) {
  const pages = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', section: 'Overview', icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
    { id: 'deposits', label: 'Deposits', href: 'deposits.html', section: 'Payments', badge: 12, icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>' },
    { id: 'withdrawals', label: 'Withdrawals', href: 'withdrawals.html', section: 'Payments', badge: 4, icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>' },
    { id: 'events', label: 'Events', href: 'events.html', section: 'Content', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>' },
    { id: 'question-bank', label: 'Question Bank', href: 'question-bank.html', section: 'Content', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
    { id: 'users', label: 'Users', href: 'users.html', section: 'Users', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>' },
    { id: 'referrals', label: 'Referrals', href: 'referrals.html', section: 'Users', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>' },
    { id: 'activity-log', label: 'Activity Log', href: 'activity-log.html', section: 'System', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>' },
    { id: 'settings', label: 'Settings', href: 'settings.html', section: 'System', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/>'},
  ];

  const sections = [...new Set(pages.map(p => p.section))];
  let html = `
    <aside class="admin-sidebar">
      <a href="../index.html" class="admin-sidebar-logo">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="10" stroke="#3E4BF0" stroke-width="2"/><path d="M6 11l3 3 7-7" stroke="#3E4BF0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Quiz<span>Arena</span>
      </a>
      <nav style="flex:1;overflow-y:auto;padding:8px 0">
  `;

  sections.forEach(section => {
    html += `<div class="admin-nav-section"><div class="admin-nav-label">${section}</div>`;
    pages.filter(p => p.section === section).forEach(p => {
      const isActive = p.id === activePage;
      const badge = p.badge ? `<span class="nav-badge">${p.badge}</span>` : '';
      html += `
        <a href="${p.href}" class="admin-nav-item ${isActive ? 'active' : ''}" id="nav-${p.id}">
          <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${p.icon}</svg>
          ${p.label}${badge}
        </a>`;
    });
    html += `</div>`;
  });

  html += `</nav>
    <div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:10px">
      <div style="width:32px;height:32px;border-radius:50%;background:rgba(62,75,240,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#9CA8FC;flex-shrink:0">SA</div>
      <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:#fff">Super Admin</div><div style="font-size:10px;color:rgba(255,255,255,0.4)">admin@quizarena.com</div></div>
      <a href="../login.html" style="color:rgba(255,255,255,0.4)"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg></a>
    </div>
  </aside>`;

  const root = document.getElementById('admin-sidebar-root');
  if (root) root.innerHTML = html;
}

function renderAdminTopbar(pageTitle, pageSubtitle) {
  const html = `
    <div class="admin-topbar">
      <div style="display:flex;align-items:center;gap:12px">
        <button id="sidebar-toggle" class="btn btn-ghost btn-icon">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div>
          <h1 style="font-family:'Sora',sans-serif;font-size:16px;font-weight:800;color:var(--ink-navy)">${pageTitle}</h1>
          ${pageSubtitle ? `<p style="font-size:11px;color:var(--slate)">${pageSubtitle}</p>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="position:relative">
          <button style="width:34px;height:34px;background:var(--paper);border:1px solid var(--line);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          </button>
          <span style="position:absolute;top:4px;right:4px;width:8px;height:8px;background:var(--alert-coral);border-radius:50%;border:2px solid #fff"></span>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--ink-navy)">Super Admin</div>
        <div style="width:32px;height:32px;border-radius:50%;background:var(--indigo-50);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--signal-indigo)">SA</div>
      </div>
    </div>`;

  const root = document.getElementById('admin-topbar-root');
  if (root) root.innerHTML = html;
  
  // Re-init sidebar after rendering
  setTimeout(() => initAdminSidebar(), 50);
}
