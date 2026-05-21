var AdminUniver = (function () {
  async function renderForStudent(student) {
    Admin.showContentSkeleton(10);
    AdminCore.state.isLoading = true;
    NaviComponent.showLoading('불러오는 중입니다...');
    try {
      var res = await AdminCore.apiGet('adminGetUnivByStudent', {
        adminId:   AdminCore.state.adminId,
        studentId: student.studentId
      });
      if (!res.success) { Admin.showError(res.message); return; }
      var data = res.data;
      var rows = data.rows || [];
      var availTypeText = (data['availType'] && String(data['availType']).trim() !== '')
        ? String(data['availType']).trim() : '-';
      var prefSet = {}, prefList = [];
      rows.forEach(function (r) {
        var v = (r['선호전형'] !== undefined && r['선호전형'] !== null)
              ? String(r['선호전형']).trim() : '';
        if (v && !prefSet[v]) { prefSet[v] = true; prefList.push(v); }
      });
      var prefTypeText = prefList.length > 0 ? prefList.join(', ') : (data.prefType || '-');
      var html = '<div class="p-5">'
               + '<div class="student-info-banner">'
               + '<div class="flex items-center gap-3"><div style="flex:1;">'
               + '<div style="display:flex;align-items:baseline;gap:10px;">'
               + '<div style="font-size:1rem;font-weight:700;color:#1d4ed8;">' + student.studentId + '</div>'
               + '<div class="student-info-name">' + student.name + ' 학생</div>'
               + '</div>'
               + '<div style="font-size:0.82rem;color:#1d4ed8;font-weight:600;margin-top:2px;"></div>'
               + '</div>'
               + '<div style="font-size:0.78rem;color:#1d4ed8;font-weight:700;background:#fff;padding:6px 12px;border-radius:999px;border:1px solid #93c5fd;">'
               + '지원 ' + rows.length + '개'
               + '</div></div>'
               + '<div class="student-info-pills">'
               + '<div class="info-pill">'
               + '<span class="info-pill-label">지원가능전형</span>'
               + '<span class="info-pill-value">' + availTypeText + '</span>'
               + '</div>'
               + '<div class="info-pill" style="background:#fef9c3;border-color:#fde047;">'
               + '<span class="info-pill-label" style="color:#a16207;">선호전형</span>'
               + '<span class="info-pill-value" style="color:#713f12;">' + prefTypeText + '</span>'
               + '</div>'
               + '</div></div>';
      if (rows.length === 0) {
        html += '<div class="text-center py-16" style="background:#fff;border:1px dashed #cbd5e1;border-radius:14px;">'
              + '<p class="text-gray-400">등록된 관심대학 데이터가 없습니다.</p></div>';
      } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px;">';
        rows.forEach(function (row) {
          var get = function (k) {
            var v = row[k];
            return (v === undefined || v === null || v === '') ? '-' : v;
          };
          var rank      = get('순위');
          var univName  = get('대학명');
          var dept      = get('지원학과');
          var rankLabel = (rank === '-') ? '-' : rank + '순위';
          html += '<div class="univ-card">'
                + '<div class="univ-card-header">'
                + '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">'
                + '<span class="univ-rank-badge univ-rank-cell"'
                + ' data-studentid="' + student.studentId + '"'
                + ' data-rowindex="' + (row._rowIndex !== undefined ? row._rowIndex : '') + '"'
                + ' data-current="' + (rank === '-' ? '' : rank) + '"'
                + ' ondblclick="Admin.editUnivRank(this)"'
                + ' title="더블클릭하여 순위 편집">'
                + rankLabel
                + '</span>'
                + '<div style="min-width:0;flex:1;">'
                + '<div class="univ-name-dept" style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;">'
                + '<span class="univ-name" style="margin:0;">' + univName + '</span>'
                + '<span class="univ-name" style="margin:0;">' + dept + '</span>'
                + '</div></div></div></div>';
          html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">'
                + '<span class="univ-tag tag-type">'    + get('전형유형')     + '</span>'
                + '<span class="univ-tag tag-kind">'    + get('전형종류')     + '</span>'
                + '<span class="univ-tag tag-suneung">수능최저: ' + get('수능최저') + '</span>'
                + '<span class="univ-tag tag-judge">'   + get('지원성향판단') + '</span>'
                + '</div>';
          html += '<div class="univ-grid">'
                + '<div class="univ-field"><span class="univ-field-label">모집정원</span><span class="univ-field-value">' + get('모집정원') + '</span></div>'
                + '<div class="univ-field"><span class="univ-field-label">선발유형</span><span class="univ-field-value">' + get('선발유형') + '</span></div>'
                + '</div>';
          var hasInterview = ['면접유무','면접지역','면접시작일','면접종료일'].some(function (k) {
            return row[k] !== undefined && row[k] !== null && row[k] !== '';
          });
          if (hasInterview) {
            html += '<div class="univ-grid" style="margin-top:8px;">'
                  + '<div class="univ-section-divider">📝 면접</div>'
                  + '<div class="univ-field"><span class="univ-field-label">면접유무</span><span class="univ-field-value">'  + get('면접유무')  + '</span></div>'
                  + '<div class="univ-field"><span class="univ-field-label">면접지역</span><span class="univ-field-value">'  + get('면접지역')  + '</span></div>'
                  + '<div class="univ-field"><span class="univ-field-label">면접시작일</span><span class="univ-field-value">' + get('면접시작일') + '</span></div>'
                  + '<div class="univ-field"><span class="univ-field-label">면접종료일</span><span class="univ-field-value">' + get('면접종료일') + '</span></div>'
                  + '</div>';
          }
          var hasPractical = ['실기유무','실기지역','실기시작일','실기종료일'].some(function (k) {
            return row[k] !== undefined && row[k] !== null && row[k] !== '';
          });
          if (hasPractical) {
            html += '<div class="univ-grid" style="margin-top:8px;">'
                  + '<div class="univ-section-divider">🎨 실기</div>'
                  + '<div class="univ-field"><span class="univ-field-label">실기유무</span><span class="univ-field-value">'  + get('실기유무')  + '</span></div>'
                  + '<div class="univ-field"><span class="univ-field-label">실기지역</span><span class="univ-field-value">'  + get('실기지역')  + '</span></div>'
                  + '<div class="univ-field"><span class="univ-field-label">실기시작일</span><span class="univ-field-value">' + get('실기시작일') + '</span></div>'
                  + '<div class="univ-field"><span class="univ-field-label">실기종료일</span><span class="univ-field-value">' + get('실기종료일') + '</span></div>'
                  + '</div>';
          }
          var memo = row['비고'];
          if (memo !== undefined && memo !== null && String(memo).trim() !== '') {
            html += '<div class="univ-memo">💬 ' + memo + '</div>';
          }
          html += '</div>'; 
        });
        html += '</div>'; 
      }
      html += '</div>'; 
      document.getElementById('content-area').innerHTML = html;
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
  function editUnivRank(cell) {
    var currentVal = cell.dataset.current || '';
    var input = document.createElement('input');
    input.type = 'text';
    input.value = currentVal;
    input.className = 'w-12 text-center border border-emerald-400 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';
    input.style.width = '50px';
    function _commit() {
      var newVal = input.value.trim();
      if (newVal === currentVal) {
        cell.textContent = currentVal ? currentVal + '순위' : '-';
        return;
      }
      var studentId = cell.dataset.studentid;
      var rowIndex  = cell.dataset.rowindex;
      cell.textContent = '저장 중...';
      NaviComponent.showLoading('저장 중입니다...');
      AdminCore.apiGet('adminSaveUnivRank', {
        adminId:   AdminCore.state.adminId,
        studentId: studentId,
        rowIndex:  rowIndex,
        newRank:   newVal
      }).then(function (res) {
        NaviComponent.hideLoading();
        if (res.success) {
          cell.textContent = newVal ? newVal + '순위' : '-';
          cell.dataset.current = newVal;
          NaviComponent.showAlert('저장되었습니다.', null, { icon: '✅' });
        } else {
          cell.textContent = currentVal ? currentVal + '순위' : '-';
          NaviComponent.showAlert('저장 실패: ' + res.message, null, { icon: '⚠️' });
        }
      }).catch(function (err) {
        NaviComponent.hideLoading();
        cell.textContent = currentVal ? currentVal + '순위' : '-';
        NaviComponent.showAlert('오류: ' + err.message, null, { icon: '⚠️' });
      });
    }
    input.addEventListener('blur', _commit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  { input.blur(); }
      if (e.key === 'Escape') {
        input.removeEventListener('blur', _commit);
        cell.textContent = currentVal ? currentVal + '순위' : '-';
      }
    });
    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
    input.select();
  }
  return {
    renderForStudent: renderForStudent,
    editUnivRank:     editUnivRank
  };
})();
