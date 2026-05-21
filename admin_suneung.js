var AdminSuneung = (function () {
  async function load() {
    Admin.showContentSkeleton(10);
    NaviComponent.showLoading('불러오는 중입니다...');  
    AdminCore.state.isLoading = true;
    try {
      var res = await AdminCore.apiGet('adminGetSuneungData', {
        adminId:     AdminCore.state.adminId,
        filterClass: AdminCore.state.currentClass
      });
      if (res.success) {
        AdminCore.state.suneungData = res.data;
        render(res.data, AdminCore.state.currentStudentId || null);
      } else {
        Admin.showError(res.message);
      }
    } catch (err) {
      Admin.showError(err.message);
    } finally {
      AdminCore.state.isLoading = false;
      NaviComponent.hideLoading();                      
      if (AdminCore.state.pendingDownload) {
        AdminCore.state.pendingDownload = false;
        Admin.openDownloadModal();
      }
    }
  }
  function render(data, filterStudentId) {
    if (!data || !data.rows || data.rows.length === 0) {
      Admin.clearContent('<p class="text-gray-400 text-center mt-20">데이터가 없습니다.</p>');
      return;
    }
    var rowsToShow = data.rows;
    var bannerHtml = '';
    if (filterStudentId) {
      rowsToShow = data.rows.filter(function (r) {
        return String(r.studentId) === String(filterStudentId);
      });
      if (rowsToShow.length === 0) {
        Admin.clearContent('<p class="text-gray-400 text-center mt-20">선택한 학생의 데이터가 없습니다.</p>');
        return;
      }
      var s = rowsToShow[0];
      bannerHtml =
        '<div class="student-info-banner" style="background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%);border-color:#93c5fd;">'
        + '<div class="flex items-center gap-3"><div>'
        + '<div style="display:flex;align-items:baseline;gap:10px;">'
        + '<div style="font-size:1rem;font-weight:700;color:#1d4ed8;">' + s.studentId + '</div>'
        + '<div class="student-info-name" style="color:#1e3a8a;">' + s.name + ' 학생</div>'
        + '</div>'
        + '<div style="font-size:0.82rem;color:#1e40af;font-weight:600;">' + s.studentClass + '반</div>'
        + '</div></div></div>';
    } else {
      bannerHtml =
        '<div class="student-info-banner" style="background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%);border-color:#93c5fd;">'
        + '<div class="flex items-center gap-3">'
        + '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0ea5e9,#0284c7);display:flex;align-items:center;justify-content:center;color:#fff;">'
        + '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>'
        + '</div>'
        + '<div>'
        + '<div class="student-info-name" style="color:#0c4a6e;">전체 학생 수능선택</div>'
        + '<div style="font-size:0.82rem;color:#075985;font-weight:600;">총 ' + rowsToShow.length + '명</div>'
        + '</div></div></div>';
    }
    var html = '<div class="p-5">' + bannerHtml
             + '<div class="overflow-x-auto rounded-xl" style="box-shadow:0 1px 3px rgba(15,23,42,0.05);">'
             + '<table class="modern-table"><thead><tr>'
             + '<th>반</th><th>학번</th><th>이름</th>';
    data.headers.forEach(function (h) { html += '<th>' + h + '</th>'; });
    html += '</tr></thead><tbody>';
    rowsToShow.forEach(function (row) {
      html += '<tr>'
            + '<td>' + row.studentClass + '</td>'
            + '<td>' + row.studentId + '</td>'
            + '<td style="font-weight:600;color:#1e293b;">' + row.name + '</td>';
      row.values.forEach(function (v) { html += '<td>' + (v || '-') + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    document.getElementById('content-area').innerHTML = html;
  }
  return {
    load:   load,
    render: render
  };
})();
