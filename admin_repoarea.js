var AdminRepoArea = (function () {
  var _modalState = {
    areaKey:      '',
    studentId:    '',
    area:         '',
    limit:        0,
    originalText: '',
    savedText:    '',
    scrollY:      0,
    isSaving:     false
  };
  function renderAreaButtons() {
    var areas = ['자율활동', '동아리활동', '진로활동', '개인별세특', '행동발달'];
    var ul = document.getElementById('student-list');
    ul.innerHTML = '';
    areas.forEach(function (area) {
      var btn = document.createElement('button');
      btn.className = 'area-btn w-full text-left px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-700 hover:bg-blue-50 transition-colors';
      btn.textContent = area;
      btn.addEventListener('click', function () {
        document.querySelectorAll('.area-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        AdminCore.state.currentArea = area;
        loadByArea(area);
      });
      ul.appendChild(btn);
    });
  }
  async function loadByArea(area) {
    Admin.showContentSkeleton(8);
    AdminCore.state.isLoading = true;
    NaviComponent.showLoading('불러오는 중입니다...');
    try {
      var res = await AdminCore.apiGet('adminGetGibuByArea', {
        adminId:     AdminCore.state.adminId,
        filterClass: AdminCore.state.currentClass,
        adminAuth:   AdminCore.state.adminAuth,
        adminClass:  AdminCore.state.adminClass,
        area:        area
      });
      if (res.success) {
        var dataMap = {};
        (res.data || []).forEach(function (r) { dataMap[r.studentId] = r; });
        var allRows = AdminCore.state.studentList.map(function (s) {
          return dataMap[s.studentId] || {
            studentClass:  s.studentClass,
            studentId:     s.studentId,
            name:          s.name,
            area:          area,
            content:       '',
            bytes:         '',
            editedContent: '',
            editedBytes:   ''
          };
        });
        renderArea(allRows, area);
      } else {
        Admin.showError(res.message);
      }
    } catch (err) {
      Admin.showError(err.message);
    } finally {
      NaviComponent.hideLoading();
      AdminCore.state.isLoading = false;
      if (AdminCore.state.pendingDownload) {
        AdminCore.state.pendingDownload = false;
        Admin.openDownloadModal();
      }
    }
  }
  function renderArea(rows, area) {
    if (!rows || rows.length === 0) {
      Admin.clearContent('<p class="text-gray-400 text-center mt-20">' + area + ' 데이터가 없습니다.</p>');
      return;
    }
    var html = '<div class="p-4">'
             + '<div class="gibu-page-banner">'
             + '<div class="gibu-page-banner-icon">'
             + '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
             + '</div><div>'
             + '<div class="gibu-page-banner-title">' + area + ' 영역별 생기부 내용</div>'
             + '<div class="gibu-page-banner-sub">전체 ' + rows.length + '명</div>'
             + '</div></div>';
    rows.forEach(function (row, _idx) {
      var limit        = AdminCore.BYTE_LIMIT[row.area] || 1500;
      var areaKey      = 'a_' + _idx;
      var editedContent = row.editedContent || '';
      var editedBytes  = (row.editedBytes !== undefined && row.editedBytes !== '' && row.editedBytes !== null)
                         ? row.editedBytes : AdminCore.calcBytes(editedContent);
      var sidAttr      = AdminCore.escapeHtml(row.studentId);
      var areaAttr     = AdminCore.escapeHtml(row.area || area);
      var hasContent   = !!(row.content);
      var hasNoData    = !row.content && !editedContent;
      html += '<div class="gibu-student-block">'
            + '<div class="gibu-student-header">'
            + '<span class="gibu-student-class">' + row.studentClass + '반</span>'
            + '<span class="gibu-student-id">'    + row.studentId    + '</span>'
            + '<span class="gibu-student-name">'  + row.name         + '</span>'
            + '</div>'
            + '<div class="gibu-student-body">';
      if (hasNoData) {
        html += '<div id="gibu-nodata-' + areaKey + '" class="border border-dashed border-gray-300 rounded-lg p-3 flex items-center justify-between gap-3" style="background:#f8fafc;">'
              + '<span style="font-size:0.82rem;color:#94a3b8;font-weight:500;">입력된 내용이 없음</span>'
              + '<button type="button" class="gibu-write-btn" onclick="Admin.openGibuWriteModal(\'' + areaKey + '\', \'' + sidAttr + '\', \'' + areaAttr + '\', ' + limit + ')">'
              + '<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
              + '생기부 내용 입력</button>'
              + '</div>';
      } else {
        html += '<div class="bg-white border border-blue-200 rounded-lg p-3 mb-3">'
              + '<div class="gibu-card-toolbar mb-2">'
              + '<span class="gibu-label">📄 학생 제출 내용</span>'
              + (row.bytes !== undefined && row.bytes !== '' ? '<span class="gibu-bytes-info">(' + row.bytes + '바이트 / ' + limit + '바이트)</span>' : '<span class="gibu-bytes-info"></span>')
              + '<span id="copy-feedback-' + areaKey + '" class="gibu-spacer"></span>'
              + '<button type="button" class="gibu-copy-btn" style="margin-left:4px;" onclick="Admin.copyGibuContent(\'' + areaKey + '\')">'
              + '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
              + '내용 복사</button>'
              + '<button type="button" class="gibu-toggle-btn" onclick="Admin.toggleGibuPreview(this)" data-expanded="0">'
              + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
              + '<span>펼치기</span></button>'
              + '</div>'
              + '<div class="gibu-preview-box" onclick="Admin.toggleGibuPreviewBox(this)">'
              + '<div id="gibu-original-' + areaKey + '" class="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 gibu-preview-text" data-raw="' + AdminCore.escapeHtml(row.content || '') + '">'
              + (hasContent ? AdminCore.escapeHtml(row.content) : '<span class="text-gray-400 italic">내용 없음</span>')
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
              + '</div></div>';
      }
      html += '</div></div>';
    });
    html += '</div>';
    document.getElementById('content-area').innerHTML = html;
  }
  function openGibuWriteModal(areaKey, studentId, area, limit) {
    _modalState.areaKey   = areaKey;
    _modalState.studentId = studentId;
    _modalState.area      = area;
    _modalState.limit     = limit;
    _modalState.scrollY   = document.querySelector('main.flex-1')
                            ? document.querySelector('main.flex-1').scrollTop
                            : window.scrollY;
    var originalEl    = document.getElementById('gibu-original-' + areaKey);
    var originalText  = originalEl ? (originalEl.getAttribute('data-raw') || '') : '';
    var originalBytes = originalEl ? (originalEl.closest('.bg-white') ? (function () {
      var byteSpan = originalEl.closest('.bg-white').querySelector('.gibu-bytes-info');
      return byteSpan ? byteSpan.textContent : '';
    })() : '') : '';
    var editedText = '';
    var bytesEl = document.getElementById('gibu-edit-bytes-' + areaKey);
    if (bytesEl) {
      var editCard = bytesEl.closest('.bg-white');
      if (editCard) {
        var pDiv = editCard.querySelector('.gibu-preview-text[data-iseditor="1"]');
        if (pDiv) editedText = pDiv.getAttribute('data-raw-edit') || pDiv.innerText || '';
        if (editedText === '편집 내용 없음') editedText = '';
      }
    }
    var hiddenTa = document.getElementById('gibu-edit-' + areaKey);
    if (hiddenTa) editedText = hiddenTa.value || editedText;
    _modalState.originalText = originalText;
    _modalState.savedText    = editedText;
    var modal       = document.getElementById('gibu-write-modal');
    var leftLabel   = document.getElementById('gibu-modal-left-label');
    var leftBytes   = document.getElementById('gibu-modal-left-bytes');
    var leftContent = document.getElementById('gibu-modal-left-content');
    var rightLabel  = document.getElementById('gibu-modal-right-label');
    var ta          = document.getElementById('gibu-modal-textarea');
    var badge = document.getElementById('gibu-modal-student-badge');
    if (badge) {
      var stu = null;
      for (var si = 0; si < AdminCore.state.studentList.length; si++) {
        if (AdminCore.state.studentList[si].studentId === studentId) {
          stu = AdminCore.state.studentList[si]; break;
        }
      }
      badge.textContent = stu ? (stu.studentId + ' ' + stu.name) : studentId;
    }
    if (leftLabel)   leftLabel.textContent   = area + ' — 학생 제출 내용';
    if (leftBytes)   leftBytes.textContent   = originalBytes;
    if (leftContent) leftContent.textContent = originalText || '학생이 제출한 내용이 없음';
    if (rightLabel)  rightLabel.textContent  = area + ' — 내용 편집';
    if (ta) { ta.value = editedText; updateModalBytes(); }
    modal.classList.remove('hidden');
    if (ta) {
      ta.value = editedText;
      updateModalBytes();
      ta.oninput = function() {
        updateModalBytes();
        AdminCore.state.hasUnsavedEdit = (ta.value !== _modalState.savedText);
      };
      ta.focus();
    }}
  function updateModalBytes() {
    var ta    = document.getElementById('gibu-modal-textarea');
    var label = document.getElementById('gibu-modal-right-bytes');
    if (!ta || !label) return;
    var bytes = AdminCore.calcBytes(ta.value);
    var limit = _modalState.limit;
    label.textContent = bytes + '바이트 / ' + limit + '바이트';
    label.style.color = bytes > limit ? '#dc2626' : '#374151';
   }
  function copyModalLeft() {
    var text = _modalState.originalText || '';
    var fb   = document.getElementById('gibu-modal-left-copy-fb');
    function show() {
      if (fb) { fb.textContent = '복사 완료'; clearTimeout(fb._t); fb._t = setTimeout(function () { fb.textContent = ''; }, 2000); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(show, function () { AdminCore.fallbackCopy(text); show(); });
    } else { AdminCore.fallbackCopy(text); show(); }
  }
  function copyModalRight() {
    var ta   = document.getElementById('gibu-modal-textarea');
    var text = ta ? ta.value : '';
    var fb   = document.getElementById('gibu-modal-right-copy-fb');
    function show() {
      if (fb) { fb.textContent = '복사 완료'; clearTimeout(fb._t); fb._t = setTimeout(function () { fb.textContent = ''; }, 2000); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(show, function () { AdminCore.fallbackCopy(text); show(); });
    } else { AdminCore.fallbackCopy(text); show(); }
  }
  async function saveGibuModal() {
    if (_modalState.isSaving) return;
    var ta      = document.getElementById('gibu-modal-textarea');
    var saveBtn = document.getElementById('gibu-modal-save-btn');
    if (!ta) return;
    var text  = ta.value || '';
    var bytes = AdminCore.calcBytes(text);
    var limit = _modalState.limit;
    if (bytes > limit) {
      NaviComponent.showConfirmDialog(
        '글자수(' + bytes + '바이트)가 제한(' + limit + '바이트)을 초과했습니다. 그래도 저장하시겠습니까?',
        function () { _doSaveGibuModal(ta, saveBtn, text, bytes, limit); }
      );
      return;
    }
    _doSaveGibuModal(ta, saveBtn, text, bytes, limit);
  }
  async function _doSaveGibuModal(ta, saveBtn, text, bytes, limit) {
    _modalState.isSaving = true;
    NaviComponent.showLoading('저장 중입니다...');
    try {
      var res = await AdminCore.apiGet('adminSaveTeacherGibu', {
        adminId:       AdminCore.state.adminId,
        adminAuth:     AdminCore.state.adminAuth,
        adminClass:    AdminCore.state.adminClass,
        studentId:     _modalState.studentId,
        area:          _modalState.area,
        editedContent: text,
        editedBytes:   bytes
      });
      if (res && res.success) {
        _modalState.savedText = text;
        AdminCore.state.hasUnsavedEdit = false;
        _updateCardAfterSave(text, bytes, limit);
      NaviComponent.hideLoading();
      Admin.showSaveSuccess('변경 내용이 정상적으로 저장되었습니다.');
      _doCloseGibuModal();
      } else {
        NaviComponent.hideLoading();
        NaviComponent.showAlert('저장 실패: ' + (res && res.message ? res.message : '알 수 없는 오류'));
      }
    } catch (err) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + err.message);
    } finally {
      _modalState.isSaving = false;
    }
  }
  function _updateCardAfterSave(text, bytes, limit) {
    var areaKey = _modalState.areaKey;
    var nodataBox = document.getElementById('gibu-nodata-' + areaKey);
    if (nodataBox) {
      var sidAttr2  = AdminCore.escapeHtml(_modalState.studentId);
      var areaAttr2 = AdminCore.escapeHtml(_modalState.area);
      var limit2    = _modalState.limit;
      var newHtml =
        '<div class="bg-white border border-blue-200 rounded-lg p-3 mb-3">'
        + '<div class="gibu-card-toolbar mb-2">'
        + '<span class="gibu-label">📄 학생 제출 내용</span>'
        + '<span class="gibu-bytes-info"></span>'
        + '<span id="copy-feedback-' + areaKey + '" class="gibu-spacer"></span>'
        + '<button type="button" class="gibu-copy-btn" style="margin-left:4px;" onclick="Admin.copyGibuContent(\'' + areaKey + '\')">'
        + '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
        + '내용 복사</button>'
        + '<button type="button" class="gibu-toggle-btn" onclick="Admin.toggleGibuPreview(this)" data-expanded="0">'
        + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
        + '<span>펼치기</span></button>'
        + '</div>'
        + '<div class="gibu-preview-box" onclick="Admin.toggleGibuPreviewBox(this)">'
        + '<div id="gibu-original-' + areaKey + '" class="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 gibu-preview-text" data-raw="">'
        + '<span class="text-gray-400 italic">내용 없음</span>'
        + '</div></div></div>'
        + '<div class="bg-white border border-blue-200 rounded-lg p-3">'
        + '<div class="gibu-card-toolbar mb-2">'
        + '<span class="gibu-label">✏️ 교사 작성 내용</span>'
        + '<span id="gibu-edit-bytes-' + areaKey + '" class="gibu-bytes-info">(' + bytes + '바이트 / ' + limit2 + '바이트)</span>'
        + '<span id="copy-feedback-edit-' + areaKey + '" class="gibu-spacer"></span>'
        + '<button type="button" class="gibu-copy-btn" style="margin-left:4px;" onclick="Admin.copyGibuEdit(\'' + areaKey + '\')">'
        + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
        + '편집 복사</button>'
        + '<button type="button" class="gibu-write-btn" style="margin-left:4px;" onclick="Admin.openGibuWriteModal(\'' + areaKey + '\', \'' + sidAttr2 + '\', \'' + areaAttr2 + '\', ' + limit2 + ')">'
        + '<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
        + '생기부 작성</button>'
        + '<button type="button" class="gibu-toggle-btn" onclick="Admin.toggleGibuPreview(this)" data-expanded="0">'
        + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
        + '<span>펼치기</span></button>'
        + '</div>'
        + '<div class="gibu-preview-box" onclick="Admin.toggleGibuPreviewBox(this)">'
        + '<div class="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 gibu-preview-text" data-iseditor="1" data-raw-edit="' + AdminCore.escapeHtml(text) + '">'
        + AdminCore.escapeHtml(text)
        + '</div><span class="gibu-ellipsis-hint">.....</span>'
        + '</div></div>';
      var wrapper = document.createElement('div');
      wrapper.innerHTML = newHtml;
      nodataBox.parentNode.replaceChild(wrapper, nodataBox);
      return;
    }
    var bytesEl = document.getElementById('gibu-edit-bytes-' + areaKey);
    if (bytesEl) {
      bytesEl.textContent = '(' + bytes + '바이트 / ' + limit + '바이트)';
      bytesEl.style.color = bytes > limit ? '#dc2626' : '#6b7280';
      var editCard = bytesEl.closest('.bg-white');
      if (editCard) {
        var pDiv = editCard.querySelector('.gibu-preview-text[data-iseditor="1"]');
        if (pDiv) {
          pDiv.setAttribute('data-raw-edit', text);
          pDiv.textContent = text || '편집 내용 없음';
        }
        var hint = editCard.querySelector('.gibu-ellipsis-hint');
        if (hint) hint.style.display = '';
        if (pDiv) pDiv.classList.remove('expanded');
      }
    }
  }
  function closeGibuWriteModal() {
    if (_modalState.isSaving) return;
    var ta      = document.getElementById('gibu-modal-textarea');
    var isDirty = ta && (ta.value !== _modalState.savedText);
    if (isDirty) {
      Admin.showUnsavedModal('저장하지 않은 편집 내용이 사라집니다. 저장하지 않고 나가시겠습니까?', function () {
        AdminCore.state.hasUnsavedEdit = false;
        _doCloseGibuModal();
      });
      return;
    }
    _doCloseGibuModal();
  }
  function _doCloseGibuModal() {
    document.getElementById('gibu-write-modal').classList.add('hidden');
    var main = document.querySelector('main.flex-1');
    if (main) {
      main.scrollTop = _modalState.scrollY;
    } else {
      window.scrollTo(0, _modalState.scrollY);
    }
  }
  return {
    renderAreaButtons:    renderAreaButtons,
    loadByArea:           loadByArea,
    renderArea:           renderArea,
    openGibuWriteModal:   openGibuWriteModal,
    closeGibuWriteModal:  closeGibuWriteModal,
    updateModalBytes:     updateModalBytes,
    copyModalLeft:        copyModalLeft,
    copyModalRight:       copyModalRight,
    saveGibuModal:        saveGibuModal,
    initModalSavedText:   function(text) { _modalState.savedText = text; }
  };
})();
