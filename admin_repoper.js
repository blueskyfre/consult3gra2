var AdminRepoPer = (function () {
  async function renderForStudent(targetId) {
    Admin.showContentSkeleton(6);
    NaviComponent.showLoading('불러오는 중입니다...');
    AdminCore.state.isLoading = true;
    try {
      var res = await AdminCore.apiGet('adminGetGibuByStudent', {
        adminId:     AdminCore.state.adminId,
        filterClass: AdminCore.state.currentClass
      });
      if (!res.success) {
        NaviComponent.showAlert(res.message || '데이터를 불러오지 못했습니다.', null, { icon: '⚠️' });
        return;
      }
      var found = null;
      for (var i = 0; i < res.data.length; i++) {
        if (res.data[i].studentId === targetId) { found = res.data[i]; break; }
      }
      if (!found) {
        Admin.clearContent('<p class="text-gray-400 text-center mt-20">학생 정보를 찾을 수 없습니다.</p>');
        return;
      }
      var areas = ['자율활동', '동아리활동', '진로활동', '개인별세특', '행동발달'];
      var html = '<div class="p-4">'
               + '<div class="gibu-page-banner">'
               + '<div class="gibu-page-banner-icon">'
               + '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>'
               + '</div><div>'
               + '<div class="gibu-page-banner-title">' + found.studentId + ' ' + found.name + ' 학생 생활기록부</div>'
               + '<div class="gibu-page-banner-sub">개인별 생기부 내용</div>'
               + '</div></div>';
      areas.forEach(function (area) {
        var content      = found.areas[area] || '';
        var bytes        = found.areabytes ? (found.areabytes[area] || '') : '';
        var editedContent = (found.areasEdited && found.areasEdited[area]) || '';
        var editedBytes  = (found.areaEditedBytes && found.areaEditedBytes[area] !== undefined && found.areaEditedBytes[area] !== '')
                           ? found.areaEditedBytes[area]
                           : AdminCore.calcBytes(editedContent);
        var limit    = AdminCore.BYTE_LIMIT[area] || 1500;
        var areaKey  = 'p_' + encodeURIComponent(area).replace(/%/g, '_');
        var sidAttr  = AdminCore.escapeHtml(found.studentId);
        var areaAttr = AdminCore.escapeHtml(area);
        var hasContent = !!content;
        html += '<div class="gibu-area-block">'
              + '<div class="gibu-area-header">'
              + '<span class="gibu-area-title">' + area + '</span>'
              + '</div>'
              + '<div class="gibu-area-body">'
              + '<div class="bg-white border border-blue-200 rounded-lg p-3 mb-3">'
              + '<div class="gibu-card-toolbar mb-2">'
              + '<span class="gibu-label">📄 학생 제출 내용</span>'
              + (bytes !== '' ? '<span class="gibu-bytes-info">(' + bytes + '바이트 / ' + limit + '바이트)</span>' : '<span class="gibu-bytes-info"></span>')
              + '<span id="copy-feedback-' + areaKey + '" class="gibu-spacer"></span>'
              + '<button type="button" class="gibu-copy-btn" style="margin-left:4px;" onclick="Admin.copyGibuContent(\'' + areaKey + '\')">'
              + '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
              + '내용 복사</button>'
              + '<button type="button" class="gibu-toggle-btn" onclick="Admin.toggleGibuPreview(this)" data-expanded="0">'
              + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
              + '<span>펼치기</span></button>'
              + '</div>'
              + '<div class="gibu-preview-box" onclick="Admin.toggleGibuPreviewBox(this)">'
              + '<div id="gibu-original-' + areaKey + '" class="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 gibu-preview-text" data-raw="' + AdminCore.escapeHtml(content) + '">'
              + (hasContent ? AdminCore.escapeHtml(content) : '<span class="text-gray-400 italic">학생이 제출한 내용이 없음</span>')
              + '</div>'
              + (hasContent ? '<span class="gibu-ellipsis-hint">.....</span>' : '')
              + '</div></div>'
              + '<div class="bg-white border border-blue-200 rounded-lg p-3">'
              + '<div class="gibu-card-toolbar mb-2">'
              + '<span class="gibu-label">✏️ 교사 작성 내용</span>'
              + '<span id="gibu-edit-bytes-' + areaKey + '" class="gibu-bytes-info">(' + editedBytes + '바이트 / ' + limit + '바이트)</span>'
              + '<span id="copy-feedback-edit-' + areaKey + '" class="gibu-spacer"></span>'
              + '<button type="button" class="gibu-copy-btn" style="margin-left:4px;" onclick="Admin.copyGibuEdit(\'' + areaKey + '\')">'
              + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
              + '편집 복사</button>'
              + '<button type="button" class="gibu-write-btn" style="margin-left:4px;" onclick="Admin.openGibuWriteModal(\'' + areaKey + '\', \'' + sidAttr + '\', \'' + areaAttr + '\', ' + limit + ')">'
              + '<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
              + '생기부 작성</button>'
              + '<button type="button" class="gibu-toggle-btn" onclick="Admin.toggleGibuPreview(this)" data-expanded="0">'
              + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
              + '<span>펼치기</span></button>'
              + '</div>'
              + '<div class="gibu-preview-box" onclick="Admin.toggleGibuPreviewBox(this)">'
              + '<div class="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 gibu-preview-text" data-iseditor="1" data-raw-edit="' + AdminCore.escapeHtml(editedContent) + '">'
              + (AdminCore.escapeHtml(editedContent) || '<span class="text-gray-400 italic">편집 내용 없음</span>')
              + '</div>'
              + (editedContent ? '<span class="gibu-ellipsis-hint">.....</span>' : '')
              + '</div></div>'
              + '</div></div>';
      });
      html += '</div>';
      document.getElementById('content-area').innerHTML = html;
    } catch (err) {
      NaviComponent.showAlert('데이터 로드 중 오류가 발생했습니다.<br>' + err.message, null, { icon: '⚠️' });
    } finally {
      NaviComponent.hideLoading();
      AdminCore.state.isLoading = false;
      if (AdminCore.state.pendingDownload) {
        AdminCore.state.pendingDownload = false;
        Admin.openDownloadModal();
      }
    }
  }
  return {
    renderForStudent: renderForStudent
  };
})();
