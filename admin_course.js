// ============================================================
// AdminCourse 네임스페이스 (IIFE)
// 역할: 교과관리 메뉴 — 교과개설, 교과목 클릭, 학생 공지, 학생 카드 표시
// 의존: AdminCore (공유 상태·API), XLSX 라이브러리
// ============================================================
var AdminCourse = (function () {

  // ─── 모듈 내부 상태 ──────────────────────────────────────────
  var _state = {
    courses: [],            // 현재 관리자의 개설 교과목 목록
    selectedCourse: null,   // 현재 선택된 교과목 이름
    currentView: 'all',     // 'all' | 'summary' — 현재 보기 모드
    pendingSaveFile: null,  // 업로드 대기 중인 학생명단 File 객체
    pendingSaveFileName: '',// 파일명 표시용
    noticeUploadFile: null, // 학생개별공지 업로드 File
    driveRootFolderId: '',  // 구글드라이브 관리자 폴더 ID (캐시)
    allNoticeText: '',      // 전체공지 글상자 텍스트
    allNoticeUploadFile: null,   // 전체공지 드라이브 업로드 File 객체
    allNoticeUploadFileName: '', // 전체공지 드라이브 업로드 파일명
    driveFiles: [],         // 관리자 폴더 내 파일 목록
  };

  // ─── 열 인덱스 → 문자 변환 (0-based) ────────────────────────
  function _colLetter(idx) {
    var letter = '';
    idx = idx + 1;
    while (idx > 0) {
      var mod = (idx - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      idx = Math.floor((idx - 1) / 26);
    }
    return letter;
  }

  // ─── 교과명 정규화 (중복 비교용: 공백 제거 + 소문자 변환) ────
  function _normalize(str) {
    return str.replace(/\s/g, '').toLowerCase();
  }

  // ─── 교과명 중복 체크 (정규화 비교, 충돌 교과명 반환) ────────
  function _findDuplicateCourse(inputName) {
    var normalizedInput = _normalize(inputName);
    for (var i = 0; i < _state.courses.length; i++) {
      if (_normalize(_state.courses[i]) === normalizedInput) {
        return _state.courses[i]; // 충돌한 기존 교과명(원본) 반환
      }
    }
    return null;
  }

  // ─── 교과명 입력 onblur 핸들러 ───────────────────────────────
  function _onCourseNameBlur() {
    var nameInput = document.getElementById('course-name-input');
    var inputVal = nameInput ? nameInput.value.trim() : '';
    if (!inputVal) return;
    var conflict = _findDuplicateCourse(inputVal);
    if (conflict) {
      NaviComponent.showAlert(
        '동일한 교과명으로 이미 교과가 개설되었습니다. (기존 교과명: ' + conflict + ') 다른 교과명으로 교과를 개설하세요.'
      );
    }
  }

  // ─── 사이드바 렌더링 ─────────────────────────────────────────
  function renderSidebar() {
  var ul = document.getElementById('student-list');
  if (!ul) return;

  var html = '';

  html += '<div class="px-2 pt-3 pb-2">'
        + '<button onclick="AdminCourse.showOpenCourseForm()"'
        + ' class="course-open-btn w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl'
        + ' bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold text-sm'
        + ' shadow-md hover:from-indigo-700 hover:to-indigo-600 transition-all active:scale-95">'
        + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
        + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>'
        + '</svg>교과개설</button></div>';

  if (_state.courses.length > 0) {
    html += '<div class="mx-3 my-1 border-t border-gray-100"></div>'
          + '<p class="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-widest">개설 교과목</p>';
  }

  _state.courses.forEach(function (course) {
    var isActive = _state.selectedCourse === course;
    var escapedCourse = AdminCore.escapeHtml(course);
    var menuId = 'ac-submenu-' + escapedCourse.replace(/[^a-zA-Z0-9]/g, '_');

    // ── 교과목 버튼 행 (교과목 선택 + 삭제 버튼) ──
    html += '<div class="px-2 py-0.5">'
          + '<div class="flex items-center gap-1">'
          + '<button onclick="AdminCourse.selectCourse(\'' + escapedCourse + '\')"'
          + ' class="flex-1 text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all'
          + (isActive
              ? ' bg-sky-200 text-black shadow-md border border-sky-300'
              : ' text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-100') + '">'
          + '<svg class="w-4 h-4 shrink-0 ' + (isActive ? 'text-sky-500' : 'text-indigo-400') + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
          + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>'
          + '</svg>'
          + '<span class="truncate">' + escapedCourse + '</span>'
          + '</button>'
          + '<button onclick="AdminCourse.confirmDeleteCourse(\'' + escapedCourse + '\')"'
          + ' title="교과 삭제"'
          + ' class="shrink-0 flex items-center justify-center px-2 py-1 rounded-lg text-xs font-bold text-red-400 hover:text-white hover:bg-red-400 border border-red-200 hover:border-red-400 transition-all">'
          + '삭제'
          + '</button>'
          + '</div>'

          // ── 선택된 교과목 아래에만 하위 메뉴 표시 ──
          + (isActive
              ? '<div id="' + menuId + '" style="margin:4px 0 2px 8px;background:#f8f9ff;'
                + 'border:1px solid #e0e7ff;border-radius:0.6rem;overflow:hidden;">'

                // ① 모두 보기
                + '<button onclick="AdminCourse._onSubmenuAll()"'
                + ' style="width:100%;display:flex;align-items:center;gap:7px;padding:7px 12px;'
                + 'background:none;border:none;cursor:pointer;font-size:0.78rem;font-weight:600;'
                + 'color:' + (_state.currentView === 'all' ? '#4338ca' : '#6b7280') + ';'
                + 'text-align:left;transition:background 0.12s;"'
                + ' onmouseover="this.style.background=\'#ede9fe\'" onmouseout="this.style.background=\'none\'">'
                + '<span style="color:#6366f1;font-size:0.65rem;opacity:' + (_state.currentView === 'all' ? '1' : '0') + ';">▶</span>'
                + '<span style="border-bottom:' + (_state.currentView === 'all' ? '1.5px solid #6366f1' : 'none') + ';padding-bottom:1px;">모두 보기</span>'
                + '</button>'

                // ② 요약 보기
                + '<button onclick="AdminCourse._onSubmenuSummary()"'
                + ' style="width:100%;display:flex;align-items:center;gap:7px;padding:7px 12px;'
                + 'background:none;border:none;cursor:pointer;font-size:0.78rem;font-weight:600;'
                + 'color:' + (_state.currentView === 'summary' ? '#4338ca' : '#6b7280') + ';'
                + 'text-align:left;transition:background 0.12s;border-top:1px solid #e0e7ff;"'
                + ' onmouseover="this.style.background=\'#ede9fe\'" onmouseout="this.style.background=\'none\'">'
                + '<span style="color:#6366f1;font-size:0.65rem;opacity:' + (_state.currentView === 'summary' ? '1' : '0') + ';">▶</span>'
                + '<span style="border-bottom:' + (_state.currentView === 'summary' ? '1.5px solid #6366f1' : 'none') + ';padding-bottom:1px;">요약 보기</span>'
                + '</button>'

                // ③ 학생 파일 전체 저장
                + '<button onclick="AdminCourse._onSubmenuDownloadAll()"'
                + ' style="width:100%;display:flex;align-items:center;gap:7px;padding:7px 12px;'
                + 'background:none;border:none;cursor:pointer;font-size:0.78rem;font-weight:600;'
                + 'color:#6b7280;text-align:left;transition:background 0.12s;border-top:1px solid #e0e7ff;"'
                + ' onmouseover="this.style.background=\'#ede9fe\'" onmouseout="this.style.background=\'none\'">'
                + '<span style="color:#6366f1;font-size:0.65rem;opacity:0;">▶</span>'
                + '<span>학생 파일 전체 저장</span>'
                + '</button>'

                + '</div>'
              : '')

          + '</div>';
  });

  ul.innerHTML = html;
}

  // ─── 드래그앤드롭 가드: 브라우저 파일 열림 방지 + 전체 오버레이 드롭존 ──
  var _dragGuardInitialized = false;
  function _initDragDropGuard() {
    if (_dragGuardInitialized) return;
    _dragGuardInitialized = true;

    // 활성 드롭존 감지 및 파일 처리 (우선순위: 모달 > course > allNotice)
    function _dispatchFileDrop(file) {
      if (!file) return;
      // 가상 dataTransfer 객체 생성하여 기존 핸들러 재사용
      var fakeEvent = { dataTransfer: { files: [file] }, preventDefault: function(){} };
      var modal = document.getElementById('course-notice-modal');
      if (modal && !modal.classList.contains('hidden')) {
        handleNoticeFileDrop(fakeEvent);
        return;
      }
      if (document.getElementById('course-upload-zone')) {
        handleFileDrop(fakeEvent);
        return;
      }
      if (document.getElementById('all-notice-upload-zone')) {
        handleAllNoticeFileDrop(fakeEvent);
        return;
      }
    }

    // 오버레이 생성 (파란 점선 박스가 실제 드롭존)
    function _createOverlay() {
      if (document.getElementById('ac-drag-overlay')) return;

      // 오버레이 배경: cursor:no-drop → 브라우저가 커서 아래 🚫 자동 표시
      var ov = document.createElement('div');
      ov.id = 'ac-drag-overlay';
      ov.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:2147483647',
        'background:rgba(79,70,229,0.18)',
        'backdrop-filter:blur(2px)',
        'display:flex', 'align-items:center', 'justify-content:center',
        'pointer-events:auto',
        'cursor:no-drop'
      ].join(';');

      // 파란 점선 박스: cursor:copy → 브라우저가 커서 아래 +복사 자동 표시
      var box = document.createElement('div');
      box.id = 'ac-drag-overlay-box';
      box.style.cssText = [
        'position:relative',
        'pointer-events:auto',
        'background:#fff',
        'border:3px dashed #6366f1',
        'border-radius:1.5rem',
        'min-width:480px',
        'min-height:320px',
        'padding:5rem 8rem',
        'text-align:center',
        'box-shadow:0 12px 60px rgba(99,102,241,0.22)',
        'cursor:copy',
        'transition:border-color 0.12s, background 0.12s, box-shadow 0.12s',
        'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center'
      ].join(';');
      box.innerHTML =
          '<div id="ac-overlay-icon" style="font-size:4rem;margin-bottom:1rem;transition:transform 0.12s;">📂</div>'
        + '<div style="font-size:1.3rem;font-weight:800;color:#4338ca;margin-bottom:0.4rem;letter-spacing:-0.01em;">'
        + '여기에 파일을 놓으세요</div>'
        + '<div style="font-size:0.9rem;color:#6b7280;">이 영역에 파일을 드롭하면 업로드됩니다</div>';

      // 박스 dragenter: 강조 (커서는 이미 cursor:copy 유지)
      box.addEventListener('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        box.style.borderColor = '#3730a3';
        box.style.borderStyle = 'solid';
        box.style.background = '#c7d2fe';
        box.style.boxShadow = '0 0 0 6px rgba(99,102,241,0.25), 0 12px 60px rgba(99,102,241,0.3)';
        var icon = document.getElementById('ac-overlay-icon');
        if (icon) { icon.textContent = '📥'; icon.style.transform = 'scale(1.25)'; }
      }, false);

      // 박스 dragover: preventDefault 필수 (drop 허용) + dropEffect:copy 명시
      box.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy'; // +복사 커서 강제 유지
      }, false);

      // 박스 dragleave: 강조 해제
      box.addEventListener('dragleave', function(e) {
        e.stopPropagation();
        box.style.borderColor = '#6366f1';
        box.style.borderStyle = 'dashed';
        box.style.background = '#fff';
        box.style.boxShadow = '0 12px 60px rgba(99,102,241,0.22)';
        var icon = document.getElementById('ac-overlay-icon');
        if (icon) { icon.textContent = '📂'; icon.style.transform = 'scale(1)'; }
      }, false);

      // 박스 drop: 활성 드롭존 핸들러 호출
      box.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        _removeOverlay();
        var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        _dispatchFileDrop(file);
      }, false);

      // 오버레이 배경 dragover: none 으로 명시 → 브라우저 🚫 커서 유지
      ov.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'none'; // 🚫 커서 강제 유지
      }, false);

      // 오버레이 배경 drop: 파일 처리 없이 차단
      ov.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
      }, false);

      ov.appendChild(box);
      document.body.appendChild(ov);
    }

    // 오버레이 제거
    function _removeOverlay() {
      var ov = document.getElementById('ac-drag-overlay');
      if (ov) ov.remove();
    }

    // document 전체: 브라우저가 파일을 직접 여는 것 차단
    document.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
    }, false);

    document.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      _removeOverlay();
    }, false);

    // dragenter: 오버레이 표시 (_createOverlay 내부에서 중복 생성 방지)
    document.addEventListener('dragenter', function(e) {
      e.preventDefault();
      _createOverlay();
    }, false);

    // dragleave: relatedTarget === null 이면 브라우저 완전 이탈 → 오버레이 제거
    // relatedTarget 이 있으면 내부 요소 간 이동이므로 무시 (깜빡임 방지 핵심)
    document.addEventListener('dragleave', function(e) {
      if (e.relatedTarget === null) {
        _removeOverlay();
      }
    }, false);
  }

  // ─── 초기 진입: 교과관리 메뉴 활성화 ────────────────────────
  function init() {
    document.getElementById('sidebar-title').textContent = '교과관리';
    _state.selectedCourse = null;
    _initDragDropGuard();
    _loadCourses();
  }

  // ─── 개설 교과목 목록 로드 (GS action: courseGetList) ────────
  var _loadCourses = async function() {
    renderSidebar();
    NaviComponent.showLoading('불러오는 중입니다...');
    try {
      var res = await AdminCore.apiGet('courseGetList', {
        adminId: AdminCore.state.adminId
      });
      if (res && res.success) {
        _state.courses = res.data || [];
      } else {
        _state.courses = [];
      }
    } catch (e) {
      _state.courses = [];
    }
    NaviComponent.hideLoading();
    renderSidebar();
    _showWelcome();
  }

  // ─── 환영/안내 메시지 ────────────────────────────────────────
  function _showWelcome() {
    var ca = document.getElementById('content-area');
    if (!ca) return;
    ca.innerHTML =
      '<div class="flex flex-col items-center justify-center h-72 gap-4 px-6">'
      + '<div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center shadow-sm">'
      + '<svg class="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
      + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>'
      + '</svg></div>'
      + '<p class="text-center text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 shadow-sm max-w-sm leading-relaxed">'
      + '교과를 개설하면, 개설한 교과의 수행평가 양식 제공이나 파일 수합, 성적 공지 등이 가능합니다.<br>'
      + '좌측에 있는 <strong>교과개설</strong>을 이용하여 관리할 교과를 생성하거나 생성된 교과를 클릭하세요.'
      + '</p></div>';
  }

  // ─── 1. 교과개설 폼 표시 ─────────────────────────────────────
  function showOpenCourseForm() {
    _state.selectedCourse = null;
    _state.pendingSaveFile = null;
    _state.pendingSaveFileName = '';
    renderSidebar();

    var ca = document.getElementById('content-area');
    ca.innerHTML =
      '<div class="p-5 max-w-2xl mx-auto">'

      // 제목 카드
      + '<div class="flex items-center gap-3 mb-6">'
      + '<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow">'
      + '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>'
      + '</div><h2 class="text-xl font-bold text-gray-800">교과 개설</h2></div>'

      // 교과목명 입력
      + '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">'
      + '<label class="block text-sm font-bold text-gray-700 mb-2">교과목명</label>'
      + '<input id="course-name-input" type="text" placeholder="예: 언어와매체, 확률과통계, 물리학..."'
      + ' onblur="AdminCourse._onCourseNameBlur()"'
      + ' class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"/>'
      + '</div>'

      // 수강학생 명단 업로드
      + '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">'
      + '<label class="block text-sm font-bold text-gray-700 mb-1">수강학생 명단 업로드</label>'
      + '<p class="text-xs text-gray-500 mb-3">수강학생을 <span class="font-semibold text-indigo-600">수강학생명단</span> 파일에 입력한 후 업로드해주세요.</p>'

      // 양식 다운로드 버튼
      + '<button onclick="AdminCourse.downloadStudentTemplate()"'
      + ' class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold mb-4'
      + ' bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow hover:from-emerald-600 hover:to-emerald-700 transition-all">'
      + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>'
      + '수강학생_학번이름.xlsx 다운로드</button>'

      // 파일 업로드 영역
      + '<div id="course-upload-zone"'
      + ' class="border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"'
      + ' onclick="document.getElementById(\'course-file-input\').click()">'
      + '<svg class="w-8 h-8 text-indigo-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>'
      + '<p class="text-sm text-indigo-500 font-semibold">클릭하거나 파일을 드래그하여 업로드</p>'
      + '<p class="text-xs text-gray-400 mt-1">.xlsx 형식</p>'
      + '</div>'
      + '<input id="course-file-input" type="file" accept=".xlsx,.xls" class="hidden" onchange="AdminCourse.handleFileSelect(event)"/>'

      // 선택된 파일 표시
      + '<div id="course-file-selected" class="hidden mt-3 flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3">'
      + '<svg class="w-5 h-5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/></svg>'
      + '<span id="course-file-name" class="text-sm font-semibold text-indigo-700 flex-1 truncate"></span>'
      + '<button onclick="AdminCourse.clearFile()" class="text-gray-400 hover:text-gray-600 transition-colors text-xs">✕ 취소</button>'
      + '</div>'
      + '</div>'

      // 저장 버튼
      + '<div id="course-save-btn-wrap" class="hidden">'
      + '<button onclick="AdminCourse.saveCourse()"'
      + ' class="w-full py-3 rounded-xl text-sm font-bold text-white'
      + ' bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-md hover:from-indigo-700 hover:to-indigo-600 transition-all flex items-center justify-center gap-2">'
      + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
      + '저장 (교과 개설)</button></div>'

      + '</div>';
  }

  // ─── 파일 선택 핸들러 ────────────────────────────────────────
  function handleFileSelect(e) {
    var file = e.target.files && e.target.files[0];
    _applyFile(file);
  }

  function handleFileDrop(e) {
    e.preventDefault();
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    _applyFile(file);
  }

  function _applyFile(file) {
    if (!file) return;
    _state.pendingSaveFile = file;
    _state.pendingSaveFileName = file.name;
    var nameEl = document.getElementById('course-file-name');
    var selEl  = document.getElementById('course-file-selected');
    var btnWrap = document.getElementById('course-save-btn-wrap');
    if (nameEl) nameEl.textContent = file.name;
    if (selEl)  selEl.classList.remove('hidden');
    if (btnWrap) btnWrap.classList.remove('hidden');
  }

  function clearFile() {
    _state.pendingSaveFile = null;
    _state.pendingSaveFileName = '';
    var nameEl = document.getElementById('course-file-name');
    var selEl  = document.getElementById('course-file-selected');
    var btnWrap = document.getElementById('course-save-btn-wrap');
    var fileInput = document.getElementById('course-file-input');
    if (nameEl) nameEl.textContent = '';
    if (selEl)  selEl.classList.add('hidden');
    if (btnWrap) btnWrap.classList.add('hidden');
    if (fileInput) fileInput.value = '';
  }

  // ─── 수강학생 양식 다운로드 ──────────────────────────────────
function downloadStudentTemplate() {
  NaviComponent.showLoading('불러오는 중입니다...');
  AdminCore.apiGet('getDriveFileUrl', {
    adminId: AdminCore.state.adminId,
    fileName: '수강학생_학번이름.xlsx'
  }).then(function(res) {
    NaviComponent.hideLoading();
    if (res && res.success && res.url) {
      var a = document.createElement('a');
      a.href = res.url;
      a.download = '수강학생_학번이름.xlsx';
      a.click();
      NaviComponent.showAlert('다운로드가 시작되었습니다.');
    } else {
      NaviComponent.showAlert('파일을 찾을 수 없습니다: ' + (res && res.message ? res.message : ''));
    }
  }).catch(function(err) {
    NaviComponent.hideLoading();
    NaviComponent.showAlert('오류: ' + err.message);
  });
}

  

  // ─── 교과 저장 (GS + 스프레드시트 조작) ─────────────────────
  var saveCourse = async function() {
    var nameInput = document.getElementById('course-name-input');
    var courseName = nameInput ? nameInput.value.trim() : '';
    if (!courseName) {
      NaviComponent.showAlert('교과목명을 입력해주세요.', function() {
        nameInput && nameInput.focus();
      });
      return;
    }
    if (!_state.pendingSaveFile) {
      NaviComponent.showAlert('수강학생 명단 파일을 업로드해주세요.');
      return;
    }

    // 중복 교과명 체크 (정규화 비교)
    var conflict = _findDuplicateCourse(courseName);
    if (conflict) {
      NaviComponent.showAlert(
        '동일한 교과명으로 이미 교과가 개설되었습니다. (기존 교과명: ' + conflict + ') 다른 교과명으로 교과를 개설하세요.'
      );
      return;
    }

    var adminName = AdminCore.state.adminName;
    NaviComponent.showLoading('저장 중입니다...');

    try {
      // 엑셀 파일 파싱
      var wb = await _readXlsx(_state.pendingSaveFile);
      var sheet = wb.Sheets[wb.SheetNames[0]];
      var data  = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // 헤더 행 찾기 (학번, 이름)
      var headerRowIdx = -1;
      var sidColIdx = -1, nameColIdx = -1;
      for (var ri = 0; ri < Math.min(data.length, 5); ri++) {
        var row = data[ri];
        for (var ci = 0; ci < row.length; ci++) {
          var val = String(row[ci] || '').trim();
          if (val === '학번') sidColIdx = ci;
          if (val === '이름') nameColIdx = ci;
        }
        if (sidColIdx !== -1 && nameColIdx !== -1) { headerRowIdx = ri; break; }
      }

      // 학생 목록 추출
      var students = [];
      if (headerRowIdx !== -1) {
        for (var di = headerRowIdx + 1; di < data.length; di++) {
          var row = data[di];
          var sid  = String(row[sidColIdx]  || '').trim();
          var sname= String(row[nameColIdx] || '').trim();
          if (sid && sname) students.push({ studentId: sid, name: sname });
        }
      }

      // GS 서버에 저장 요청
      var res = await AdminCore.apiGet('courseSave', {
        adminId:    AdminCore.state.adminId,
        adminName:  adminName,
        courseName: courseName,
        students:   JSON.stringify(students)
      });

      NaviComponent.hideLoading();
      if (res && res.success) {
        // 교과목 목록 갱신
        if (_state.courses.indexOf(courseName) === -1) {
          _state.courses.push(courseName);
        }
        renderSidebar();
        NaviComponent.showAlert('교과 개설이 완료되었습니다.', function() {
          _showSaveSuccess(courseName);
        });
      } else {
        NaviComponent.showAlert('저장 중 오류가 발생했습니다: ' + (res && res.message ? res.message : '알 수 없는 오류'));
      }
    } catch (err) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + err.message);
    }
  }

  function _showSaveSuccess(courseName) {
    var ca = document.getElementById('content-area');
    ca.innerHTML =
      '<div class="flex flex-col items-center justify-center h-64 gap-4">'
      + '<div class="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center ring-4 ring-emerald-100">'
      + '<svg class="w-9 h-9 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>'
      + '</div>'
      + '<p class="text-lg font-bold text-gray-800">교과 개설 완료!</p>'
      + '<p class="text-sm text-gray-500"><span class="font-bold text-indigo-600">' + AdminCore.escapeHtml(courseName) + '</span> 교과가 개설되었습니다.</p>'
      + '<button onclick="AdminCourse.selectCourse(\'' + AdminCore.escapeHtml(courseName) + '\')"'
      + ' class="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow">'
      + '개설된 교과 보기</button>'
      + '</div>';
  }

  // ─── XLSX 파일 읽기 (Promise) ────────────────────────────────
  function _readXlsx(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var wb = XLSX.read(e.target.result, { type: 'binary' });
          resolve(wb);
        } catch (err) { reject(err); }
      };
      reader.onerror = function () { reject(new Error('파일 읽기 실패')); };
      reader.readAsBinaryString(file);
    });
  }

  // ─── 3. 개설 교과목 선택 ─────────────────────────────────────
  function selectCourse(courseName) {
    _state.selectedCourse = courseName;
    _state.currentView = 'all'; // 교과목 새로 선택 시 항상 모두 보기로 초기화
    renderSidebar();
    _renderCourseDetail(courseName);
  }

  var _renderCourseDetail = async function(courseName) {
    var ca = document.getElementById('content-area');
    var adminName = AdminCore.state.adminName;

    // 로딩 스켈레톤 + 버튼 전체 비활성화
    ca.innerHTML = '<div class="p-5"><div class="skeleton-box h-20 w-full mb-4"></div><div class="skeleton-box h-64 w-full"></div></div>';
    NaviComponent.showLoading('불러오는 중입니다...');

    // 학생 목록 로드
    var students = [];
    try {
      var res = await AdminCore.apiGet('courseGetStudents', {
        adminId:    AdminCore.state.adminId,
        courseName: courseName
      });
      if (res && res.success) students = res.data || [];
    } catch (e) {}

    NaviComponent.hideLoading();

    var escapedCourse = AdminCore.escapeHtml(courseName);

    var html = '<div class="p-4 sm:p-5 max-w-4xl mx-auto">';

    // ── 상단 카드: 학생개별공지 + 전체공지 + 드라이브 파일목록 + 파일업로드 ──
    html += '<div class="bg-white rounded-2xl shadow-sm border border-indigo-100 p-4 mb-4">'

          // ① 학생개별공지 박스
          + '<div class="border border-indigo-200 rounded-xl bg-indigo-50 px-3 py-2.5 mb-3">'
          + '<p class="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1.5">'
          + '<svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>'
          + '학생개별공지</p>'
          + '<div class="flex gap-2 items-center">'
          + '<p class="flex-1 border border-indigo-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white">성적 등 학생 개인별로 공지할 내용을 엑셀로 업로드할 수 있습니다.</p>'
          + '<div class="shrink-0">'
          + '<button onclick="AdminCourse.openNoticeModal(\'' + escapedCourse + '\')"'
          + ' class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold'
          + ' bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow hover:from-indigo-700 hover:to-indigo-600 transition-all">'
          + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>'
          + '공지 업로드</button>'
          + '</div>'
          + '</div>'
          + '</div>'

          // ② 전체공지 박스
          + '<div class="border border-indigo-200 rounded-xl bg-indigo-50 px-3 py-2.5 mb-3">'
          + '<p class="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1.5">'
          + '<svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>'
          + '전체공지</p>'
          + '<div class="flex gap-2 items-start">'
          + '<textarea id="all-notice-textarea" rows="2"'
          + ' placeholder="수업 대상자 전체에게 보내는 공지사항"'
          + ' class="flex-1 border border-indigo-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all resize-none bg-white"></textarea>'
          + '<div class="flex flex-col gap-1.5 shrink-0">'
          + '<button onclick="AdminCourse.saveAllNotice(\'' + escapedCourse + '\')"'
          + ' class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold'
          + ' bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow hover:from-indigo-700 hover:to-indigo-600 transition-all">'
          + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
          + '저장</button>'
          + '<button onclick="AdminCourse.deleteAllNotice(\'' + escapedCourse + '\')"'
          + ' class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold'
          + ' bg-gradient-to-r from-red-500 to-red-400 text-white shadow hover:from-red-600 hover:to-red-500 transition-all">'
          + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>'
          + '삭제</button>'
          + '</div>'
          + '</div>'
          + '</div>'

          // ③ 드라이브 폴더 파일 목록 박스
          + '<div class="border border-gray-200 rounded-xl bg-gray-50 px-3 py-2.5 mb-3">'
          + '<p class="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">'
          + '<svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>'
          + '학생에게 공지한 파일 목록</p>'
          + '<div id="all-notice-drive-files">'
          + '<p class="text-xs text-gray-400 italic">학생에게 공지한 파일 목록을 불러오는 중...</p>'
          + '</div>'
          + '</div>'

          // ④ 드라이브 파일 업로드 박스
          + '<div id="all-notice-file-section" class="border border-emerald-200 rounded-xl bg-emerald-50 px-3 py-2.5">'
          + '<p class="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">'
          + '<svg class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>'
          + '학생에게 공지할 파일 업로드</p>'
          + '<div id="all-notice-drive-file-list-wrap" class="mb-2 hidden">'
          + '<p class="text-xs font-bold text-gray-400 mb-1">관리자 폴더 내 파일:</p>'
          + '<ul id="all-notice-drive-file-list" class="text-xs text-gray-600 space-y-1 pl-2"></ul>'
          + '</div>'
          + '<div id="all-notice-upload-zone"'
          + ' class="border-2 border-dashed border-emerald-300 rounded-lg p-3 text-center bg-white hover:bg-emerald-50 transition-colors cursor-pointer mb-2"'
          + ' onclick="document.getElementById(\'all-notice-file-input\').click()">'
          + '<svg class="w-5 h-5 text-emerald-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>'
          + '<p class="text-xs text-emerald-600 font-semibold">클릭하거나 파일을 드래그하여 업로드</p>'
          + '</div>'
          + '<input id="all-notice-file-input" type="file" class="hidden" onchange="AdminCourse.handleAllNoticeFileSelect(event)"/>'
          + '<div id="all-notice-file-selected" class="hidden flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-1.5 mb-2">'
          + '<svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/></svg>'
          + '<span id="all-notice-file-name" class="text-xs font-semibold text-emerald-700 flex-1 truncate"></span>'
          + '<button onclick="AdminCourse.clearAllNoticeFile()" class="text-gray-400 hover:text-gray-600 transition-colors text-xs">✕ 취소</button>'
          + '</div>'
          + '<button id="all-notice-drive-save-btn" onclick="AdminCourse.uploadAllNoticeToDrive()"'
          + ' class="hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold'
          + ' bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow hover:from-emerald-600 hover:to-emerald-700 transition-all">'
          + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>'
          + '파일 업로드</button>'
          + '</div>'

          + '</div>';

    // ── 교과목 제목 ──
    html += '<div class="flex items-center gap-3 mb-4">'
          + '<div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow">'
          + '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
          + '</div>'
          + '<h3 class="text-base font-bold text-gray-800">수강 학생 목록 <span class="text-indigo-600">(' + students.length + '명)</span></h3>'
          + '</div>';

    // ── 학생 카드 목록 (개인별 상세 카드) ──
    if (students.length === 0) {
      html += '<div class="text-center text-gray-400 text-sm py-16">수강 학생 데이터가 없습니다.</div>';
    } else {
      students.forEach(function (s) {
        var sid   = s.studentId || '';
        var sname = s.name || '';
        var submitContent = s.submitContent || '';
        var teacherNote   = s.teacherNote  || '';

        // 카드 고유 키 (areaKey 방식과 동일)
        var cardKey = 'c_' + encodeURIComponent(sid).replace(/%/g, '_');
        var sidAttr  = AdminCore.escapeHtml(sid);
        var courseAttr = AdminCore.escapeHtml(courseName);

        html += '<div class="gibu-area-block">'

              // ── 카드 배너 (학번 + 이름) ──
              + '<div class="gibu-page-banner">'
              + '<div class="gibu-page-banner-icon">'
              + '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>'
              + '</div><div>'
              + '<div class="gibu-page-banner-title">' + AdminCore.escapeHtml(sid) + ' ' + AdminCore.escapeHtml(sname) + '</div>'
              + '<div class="gibu-page-banner-sub">' + AdminCore.escapeHtml(courseName) + ' 교과 학습 기록</div>'
              + '</div></div>'

              + '<div class="gibu-area-body">'

              // ── ① 학생 제출 내용 카드 ──
              + '<div class="bg-white border border-blue-200 rounded-lg p-3 mb-3">'
              + '<div class="gibu-card-toolbar mb-2">'
              + '<span class="gibu-label">📄 학생 제출 내용</span>'
              + '<span id="copy-feedback-' + cardKey + '" class="gibu-spacer"></span>'
              + '<button type="button" class="gibu-copy-btn" style="margin-left:4px;" onclick="AdminCourse.copyCardContent(\'' + cardKey + '\')">'
              + '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
              + '내용 복사</button>'
              + '<button type="button" class="gibu-toggle-btn" onclick="Admin.toggleGibuPreview(this)" data-expanded="0">'
              + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
              + '<span>펼치기</span></button>'
              + '</div>'
              + '<div class="gibu-preview-box" onclick="Admin.toggleGibuPreviewBox(this)">'
              + '<div id="course-submit-' + cardKey + '" class="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 gibu-preview-text" data-raw="' + AdminCore.escapeHtml(submitContent) + '">'
              + (submitContent ? AdminCore.escapeHtml(submitContent) : '<span class="text-gray-400 italic">학생이 제출한 내용이 없음</span>')
              + '</div>'
              + (submitContent ? '<span class="gibu-ellipsis-hint">.....</span>' : '')
              + '</div></div>'

              // ── ② 학생 제출 파일 카드 ──
              + '<div class="bg-white border border-indigo-200 rounded-lg p-3 mb-3">'
              + '<div class="gibu-card-toolbar mb-2">'
              + '<span class="gibu-label">📁 학생 제출 파일</span>'
              + '</div>'
              + '<div id="course-files-' + cardKey + '" class="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-400 italic">파일 목록 로딩 중...</div>'
              + '</div>'

              // ── ③ 교사 작성 내용 카드 ──
              + '<div class="bg-white border border-blue-200 rounded-lg p-3">'
              + '<div class="gibu-card-toolbar mb-2">'
              + '<span class="gibu-label">✏️ 교사 작성 내용</span>'
              + '<span id="copy-feedback-edit-' + cardKey + '" class="gibu-spacer"></span>'
              + '<button type="button" class="gibu-copy-btn" style="margin-left:4px;" onclick="AdminCourse.copyCardEdit(\'' + cardKey + '\')">'
              + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
              + '편집 복사</button>'
              + '<button type="button" class="gibu-write-btn" style="margin-left:4px;" onclick="AdminCourse.openCourseWriteModal(\'' + cardKey + '\',\'' + sidAttr + '\',\'' + AdminCore.escapeHtml(sname) + '\',\'' + courseAttr + '\')">'
              + '<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
              + '교사 내용 작성</button>'
              + '<button type="button" class="gibu-toggle-btn" onclick="Admin.toggleGibuPreview(this)" data-expanded="0">'
              + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
              + '<span>펼치기</span></button>'
              + '</div>'
              + '<div class="gibu-preview-box" onclick="Admin.toggleGibuPreviewBox(this)">'
              + '<div id="course-teacher-' + cardKey + '" class="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 gibu-preview-text" data-iseditor="1" data-raw-edit="' + AdminCore.escapeHtml(teacherNote) + '">'
              + (teacherNote ? AdminCore.escapeHtml(teacherNote) : '<span class="text-gray-400 italic">편집 내용 없음</span>')
              + '</div>'
              + (teacherNote ? '<span class="gibu-ellipsis-hint">.....</span>' : '')
              + '</div></div>'

              + '</div></div>';
      });
    }

    html += '</div>';
    ca.innerHTML = html;

    // 전체공지 기존 내용 로드 및 드라이브 파일 목록 로드
    _loadAllNoticeAndDriveFiles(courseName);

    // 각 학생 카드의 제출 파일 목록 비동기 로드
    students.forEach(function(s) {
      var cardKey = 'c_' + encodeURIComponent(s.studentId || '').replace(/%/g, '_');
      _loadStudentDriveFiles(s.studentId, s.name, courseName, cardKey);
    });
  }

  // ─── 전체공지 & 드라이브 파일 목록 로드 ─────────────────────
  var _loadAllNoticeAndDriveFiles = async function(courseName) {
    // 기존 전체공지 내용 로드
    var textarea = document.getElementById('all-notice-textarea');
    if (textarea) textarea.placeholder = '전체공지 내용을 불러오는 중...';
    try {
      var res = await AdminCore.apiGet('getAllNotice', {
        adminId:    AdminCore.state.adminId,
        adminName:  AdminCore.state.adminName,
        courseName: courseName
      });
      if (textarea && res && res.success && res.data) {
        textarea.value = res.data;
      } else if (textarea) {
        textarea.placeholder = '입력된 전체공지 내용은 없습니다.';
      }
    } catch(e) {}
    // 드라이브 관리자 폴더 파일 목록 로드
    _refreshDriveFileList();
  }

  var _refreshDriveFileList = async function() {
    var filesWrap = document.getElementById('all-notice-drive-files');
    if (!filesWrap) return;
    try {
      var res = await AdminCore.apiGet('getDriveAdminFiles', {
        adminId:   AdminCore.state.adminId,
        adminName: AdminCore.state.adminName + '||' + (_state.selectedCourse || '')
      });
      _state.driveFiles = (res && res.success && res.files) ? res.files : [];
    } catch(e) {
      _state.driveFiles = [];
    }
    _renderDriveFileList();
  }

  function _renderDriveFileList() {
    var filesWrap = document.getElementById('all-notice-drive-files');
    if (!filesWrap) return;
    if (_state.driveFiles.length === 0) {
      filesWrap.innerHTML = '<p class="text-xs text-gray-400 italic">학생에게 공지한 파일이 없습니다.</p>';
    } else {
      var listHtml = '<ul class="text-xs text-gray-600 space-y-1">';
      _state.driveFiles.forEach(function(f) {
        var fileId   = AdminCore.escapeHtml(f.id   || '');
        var fileName = AdminCore.escapeHtml(f.name || '');
        var downloadUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
        listHtml += '<li class="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">'
          + '<svg class="w-3 h-3 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/></svg>'
          + '<span class="flex-1 truncate text-gray-700">' + fileName + '</span>'
          + '<a href="' + downloadUrl + '" title="파일 저장"'
          + ' class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors">'
          + '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>'
          + '저장</a>'
          + '<button onclick="AdminCourse.deleteDriveFile(\''+fileId+'\',\''+fileName+'\')" title="파일 삭제"'
          + ' class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors">'
          + '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>'
          + '삭제</button>'
          + '</li>';
      });
      listHtml += '</ul>';
      filesWrap.innerHTML = listHtml;
    }
  }

  // ─── 전체공지 저장 (시트 기록 → 파일 업로드 UI 표시) ─────────
  var saveAllNotice = async function(courseName) {
    var textarea = document.getElementById('all-notice-textarea');
    var noticeText = textarea ? textarea.value.trim() : '';
    if (!noticeText) {
      NaviComponent.showAlert('공지사항 내용을 입력해주세요.', function() {
        if (textarea) textarea.focus();
      });
      return;
    }

    NaviComponent.showLoading('저장 중입니다...');

    try {
      var res = await AdminCore.apiGet('saveAllNotice', {
        adminId:    AdminCore.state.adminId,
        adminName:  AdminCore.state.adminName,
        courseName: courseName,
        noticeText: noticeText
      });
      NaviComponent.hideLoading();
      if (res && res.success) {
        NaviComponent.showAlert('전체공지가 저장되었습니다.');
      } else {
        NaviComponent.showAlert('저장 오류: ' + (res && res.message ? res.message : '알 수 없는 오류'));
      }
    } catch(err) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + err.message);
    }
  }

  // ─── 전체공지 삭제 ───────────────────────────────────────────
  var deleteAllNotice = async function(courseName) {
    NaviComponent.showConfirmDialog('전체공지 내용을 삭제하시겠습니까?', function() {
      _doDeleteAllNotice(courseName);
    });
  }

  var _doDeleteAllNotice = async function(courseName) {
    var textarea = document.getElementById('all-notice-textarea');
    NaviComponent.showLoading('삭제 중입니다...');
    try {
      var res = await AdminCore.apiGet('saveAllNotice', {
        adminId:    AdminCore.state.adminId,
        adminName:  AdminCore.state.adminName,
        courseName: courseName,
        noticeText: ''
      });
      NaviComponent.hideLoading();
      if (res && res.success) {
        if (textarea) textarea.value = '';
        NaviComponent.showAlert('전체공지가 삭제되었습니다.');
      } else {
        NaviComponent.showAlert('삭제 오류: ' + (res && res.message ? res.message : '알 수 없는 오류'));
      }
    } catch(err) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + err.message);
    }
  }

  // ─── 전체공지 드라이브 파일 업로드 핸들러 ───────────────────
  function handleAllNoticeFileSelect(e) {
    var file = e.target.files && e.target.files[0];
    _applyAllNoticeFile(file);
  }

  function handleAllNoticeFileDrop(e) {
    e.preventDefault();
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    _applyAllNoticeFile(file);
  }

  function _applyAllNoticeFile(file) {
    if (!file) return;
    _state.allNoticeUploadFile = file;
    _state.allNoticeUploadFileName = file.name;
    var nameEl  = document.getElementById('all-notice-file-name');
    var selEl   = document.getElementById('all-notice-file-selected');
    var saveBtn = document.getElementById('all-notice-drive-save-btn');
    if (nameEl)  nameEl.textContent = file.name;
    if (selEl)   selEl.classList.remove('hidden');
    if (saveBtn) saveBtn.classList.remove('hidden');
  }

  function clearAllNoticeFile() {
    _state.allNoticeUploadFile = null;
    _state.allNoticeUploadFileName = '';
    var nameEl  = document.getElementById('all-notice-file-name');
    var selEl   = document.getElementById('all-notice-file-selected');
    var saveBtn = document.getElementById('all-notice-drive-save-btn');
    var input   = document.getElementById('all-notice-file-input');
    if (nameEl)  nameEl.textContent = '';
    if (selEl)   selEl.classList.add('hidden');
    if (saveBtn) saveBtn.classList.add('hidden');
    if (input)   input.value = '';
  }

  // ─── 드라이브에 파일 저장 (관리자이름 폴더) ─────────────────
  var uploadAllNoticeToDrive = async function() {
    if (!_state.allNoticeUploadFile) return;
    NaviComponent.showLoading('저장 중입니다...');

    try {
      var base64Data = await _fileToBase64(_state.allNoticeUploadFile);

      // 파일 데이터가 크므로 POST 방식으로 전송
      var res = await AdminCore.apiPost('uploadFileToDriveAdminFolder', {
        adminId:   AdminCore.state.adminId,
        adminName: AdminCore.state.adminName,
        fileName:  (_state.selectedCourse || '') + '||' + _state.allNoticeUploadFileName,
        fileData:  base64Data,
        mimeType:  _state.allNoticeUploadFile.type || 'application/octet-stream'
      });

      NaviComponent.hideLoading();
      if (res && res.success) {
        clearAllNoticeFile();
        NaviComponent.showAlert('파일이 저장되었습니다.');
        await _refreshDriveFileList();
      } else {
        NaviComponent.showAlert('업로드 오류: ' + (res && res.message ? res.message : '알 수 없는 오류'));
      }
    } catch(err) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + err.message);
    }
  }

  // ─── 드라이브 파일 삭제 ─────────────────────────────────────
  var deleteDriveFile = async function(fileId, fileName) {
    NaviComponent.showConfirmDialog('「' + fileName + '」 파일을 삭제하시겠습니까?', function() {
      _doDeleteDriveFile(fileId, fileName);
    });
  }

  var _doDeleteDriveFile = async function(fileId, fileName) {
    NaviComponent.showLoading('삭제 중입니다...');
    try {
      var res = await AdminCore.apiGet('deleteDriveAdminFile', {
        adminId: AdminCore.state.adminId,
        fileId:  fileId
      });
      NaviComponent.hideLoading();
      if (res && res.success) {
        NaviComponent.showAlert('파일이 삭제되었습니다.');
        await _refreshDriveFileList();
      } else {
        NaviComponent.showAlert('삭제 오류: ' + (res && res.message ? res.message : '알 수 없는 오류'));
      }
    } catch(err) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + err.message);
    }
  }

  function _fileToBase64(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var result = e.target.result;
        // "data:mime;base64,XXXX" 형태에서 콤마 뒤 Base64 부분만 추출
        var commaIdx = result.indexOf(',');
        if (commaIdx === -1) {
          reject(new Error('파일 읽기 형식 오류'));
          return;
        }
        var base64 = result.substring(commaIdx + 1);
        if (!base64) {
          reject(new Error('파일 내용이 비어있습니다.'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = function() { reject(new Error('파일 읽기 실패')); };
      reader.readAsDataURL(file);
    });
  }

  // ─── 학생개별공지 모달 ───────────────────────────────────────
  function openNoticeModal(courseName) {
    _state.noticeUploadFile = null;

    // 기존 모달 제거 후 새로 생성
    var old = document.getElementById('course-notice-modal');
    if (old) old.remove();

    var modalHtml =
      '<div id="course-notice-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center">'
      + '<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick="AdminCourse.closeNoticeModal()"></div>'
      + '<div id="course-notice-modal-card"'
      + ' class="relative bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-200 scale-95 opacity-0"'
      + ' style="width:min(96vw,560px);">'
      + '<div class="h-1.5 bg-gradient-to-r from-amber-500 to-amber-300"></div>'
      + '<div class="px-6 py-5">'

      // 헤더
      + '<div class="flex items-center justify-between mb-4">'
      + '<h3 id="course-notice-modal-title" class="text-base font-bold text-gray-800">' + AdminCore.escapeHtml(courseName) + ' 과목 학생개별공지</h3>'
      + '<button onclick="AdminCourse.closeNoticeModal()"'
      + ' class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-500 font-bold text-sm">✕</button>'
      + '</div>'

      // 안내 메시지
      + '<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">'
      + '<p class="text-xs text-amber-700 leading-relaxed">'
      + '<strong>성적 공지 등 개인별로 공지할 때 사용합니다.</strong><br>'
      + '<strong>사용법</strong><br>'
      + '1. 개인공지제목 입력<br>'
      + '2. 학생개별공지.xlsx 다운로드<br>'
      + '3. 엑셀 파일의 <strong>학번, 이름은 반드시 입력</strong>하고 선택형 점수, 서술형 점수, 총점, 비고는 임의로 수정 가능<br>'
      + '4. 작성한 엑셀 파일을 업로드'
      + '</p>'
      + '</div>'

      // 개인공지 제목 입력
      + '<div class="mb-4">'
      + '<label class="block text-xs font-bold text-gray-700 mb-1">개인공지 제목 <span class="text-red-400">*</span></label>'
      + '<input id="notice-personal-title" type="text" placeholder="학생에게 표시될 공지 제목을 입력하세요"'
      + ' class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"/>'
      + '</div>'

      // 다운로드 버튼
      + '<button onclick="AdminCourse.downloadNoticeTmpl()"'
      + ' class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold mb-4'
      + ' bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow hover:from-emerald-600 hover:to-emerald-700 transition-all">'
      + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>'
      + '학생개별공지.xlsx 다운로드'
      + '</button>'

      // 파일 업로드 드래그앤드롭 존
      + '<div class="border-2 border-dashed border-indigo-200 rounded-xl p-4 text-center bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer mb-3"'
      + ' onclick="document.getElementById(\'notice-file-input\').click()">'
      + '<svg class="w-7 h-7 text-indigo-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>'
      + '<p class="text-sm text-indigo-500 font-semibold">작성한 학생개별공지.xlsx를 업로드하세요</p>'
      + '<p class="text-xs text-gray-400 mt-0.5">클릭하거나 파일을 드래그하여 선택 · .xlsx 형식</p>'
      + '</div>'
      + '<input id="notice-file-input" type="file" accept=".xlsx,.xls" class="hidden" onchange="AdminCourse.handleNoticeFileSelect(event)"/>'

      // 선택된 파일 표시
      + '<div id="notice-file-selected" class="hidden flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-2.5 mb-3">'
      + '<svg class="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/></svg>'
      + '<span id="notice-file-name" class="text-sm font-semibold text-indigo-700 flex-1 truncate"></span>'
      + '<button onclick="AdminCourse.clearNoticeFile()" class="text-gray-400 hover:text-gray-600 transition-colors text-xs shrink-0">✕ 취소</button>'
      + '</div>'

      // 경고 메시지
      + '<div id="notice-upload-warning" class="hidden bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-3">'
      + '<p class="text-xs font-semibold text-red-600"></p>'
      + '</div>'

      // 업로드 & 저장 버튼
      + '<div id="notice-upload-btn-wrap" class="hidden">'
      + '<button id="notice-upload-exec-btn" onclick="AdminCourse.uploadNoticeFile()"'
      + ' class="w-full py-2.5 rounded-xl text-sm font-bold text-white'
      + ' bg-gradient-to-r from-indigo-600 to-indigo-500 shadow hover:from-indigo-700 hover:to-indigo-600 transition-all">'
      + '업로드 &amp; 저장'
      + '</button>'
      + '</div>'

      + '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 현재 교과목 저장
    var modal = document.getElementById('course-notice-modal');
    modal.dataset.course = courseName;
    modal.classList.remove('hidden');
    setTimeout(function () {
      var card = document.getElementById('course-notice-modal-card');
      if (card) { card.classList.remove('scale-95', 'opacity-0'); card.classList.add('scale-100', 'opacity-100'); }
    }, 10);
  }

  function closeNoticeModal() {
    var modal = document.getElementById('course-notice-modal');
    var card  = document.getElementById('course-notice-modal-card');
    if (card) { card.classList.remove('scale-100', 'opacity-100'); card.classList.add('scale-95', 'opacity-0'); }
    setTimeout(function () { if (modal) modal.classList.add('hidden'); }, 180);
  }

    function downloadNoticeTmpl() {
      NaviComponent.showLoading('불러오는 중입니다...');
      AdminCore.apiGet('getDriveFileUrl', {
        adminId: AdminCore.state.adminId,
        fileName: '학생개별공지.xlsx'
      }).then(function(res) {
        NaviComponent.hideLoading();
        if (res && res.success && res.url) {
          var a = document.createElement('a');
          a.href = res.url;
          a.download = '학생개별공지.xlsx';
          a.click();
          NaviComponent.showAlert('다운로드가 시작되었습니다.');
        } else {
          NaviComponent.showAlert('파일을 찾을 수 없습니다: ' + (res && res.message ? res.message : ''));
        }
      }).catch(function(err) {
        NaviComponent.hideLoading();
        NaviComponent.showAlert('오류: ' + err.message);
      });
    }

  

    function handleNoticeFileSelect(e) {
      var file = e.target.files && e.target.files[0];
      _applyNoticeFile(file);
    }
    
    function handleNoticeFileDrop(e) {
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      _applyNoticeFile(file);
    }
    
    function clearNoticeFile() {
      _state.noticeUploadFile = null;
      var nameEl  = document.getElementById('notice-file-name');
      var selEl   = document.getElementById('notice-file-selected');
      var btnWrap = document.getElementById('notice-upload-btn-wrap');
      var input   = document.getElementById('notice-file-input');
      if (nameEl)  nameEl.textContent = '';
      if (selEl)   selEl.classList.add('hidden');
      if (btnWrap) btnWrap.classList.add('hidden');
      if (input)   input.value = '';
    }

  function _applyNoticeFile(file) {
    if (!file) return;
    _state.noticeUploadFile = file;
    var nameEl  = document.getElementById('notice-file-name');
    var selEl   = document.getElementById('notice-file-selected');
    var btnWrap = document.getElementById('notice-upload-btn-wrap');
    if (nameEl) nameEl.textContent = file.name;
    if (selEl)  selEl.classList.remove('hidden');
    if (btnWrap) btnWrap.classList.remove('hidden');
  }

  var uploadNoticeFile = async function() {
    var courseName = document.getElementById('course-notice-modal').dataset.course || '';
    if (!courseName) { NaviComponent.showAlert('교과목 정보가 없습니다.'); return; }

    // 제목과 파일 동시 검증
    var noticeTitleInput = document.getElementById('notice-personal-title');
    var noticeTitle = noticeTitleInput ? noticeTitleInput.value.trim() : '';
    var warnEl = document.getElementById('notice-upload-warning');

    if (!noticeTitle || !_state.noticeUploadFile) {
      var msg = '';
      if (!noticeTitle && !_state.noticeUploadFile) {
        msg = '개인공지제목을 입력하고 파일을 첨부해주세요.';
      } else if (!noticeTitle) {
        msg = '개인공지제목을 입력해주세요.';
      } else {
        msg = '공지 파일을 첨부해주세요.';
      }
      if (warnEl) { var p = warnEl.querySelector('p'); if (p) p.textContent = msg; warnEl.classList.remove('hidden'); }
      return;
    }
    if (warnEl) warnEl.classList.add('hidden');

    NaviComponent.showLoading('저장 중입니다...');

    try {
      var wb = await _readXlsx(_state.noticeUploadFile);
      var sheet = wb.Sheets[wb.SheetNames[0]];
      var data  = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // 1행 C~F열: 헤더 레이블
      var headers = (data[0] || []).slice(2, 6);

      // 학생별 데이터 (2행부터)
      var rows = [];
      for (var ri = 1; ri < data.length; ri++) {
        var row = data[ri];
        var sid  = String(row[0] || '').trim();
        var sname= String(row[1] || '').trim();
        if (!sid) continue;
        rows.push({
          studentId: sid, name: sname,
          c3: String(row[2] || '').trim(),
          c4: String(row[3] || '').trim(),
          c5: String(row[4] || '').trim(),
          c6: String(row[5] || '').trim()
        });
      }

      var res = await AdminCore.apiGet('courseUploadNotice', {
        adminId:     AdminCore.state.adminId,
        adminName:   AdminCore.state.adminName,
        courseName:  courseName,
        headers:     JSON.stringify(headers),
        rows:        JSON.stringify(rows),
        noticeTitle: noticeTitle
      });

      NaviComponent.hideLoading();
      if (res && res.success) {
        closeNoticeModal();
        NaviComponent.showAlert('학생 개별 공지가 업데이트되었습니다.', function() {
          _renderCourseDetail(courseName);
        });
      } else {
        NaviComponent.showAlert('업로드 오류: ' + (res && res.message ? res.message : '알 수 없는 오류'));
      }
    } catch (err) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + err.message);
    }
  }

// ─── 학생 제출 파일 목록 로드 (구글드라이브 담당교사\교과\학생제출 폴더) ──
  var _loadStudentDriveFiles = async function(studentId, studentName, courseName, cardKey) {
    var filesEl = document.getElementById('course-files-' + cardKey);
    var dlBtn   = document.getElementById('course-dl-btn-' + cardKey);
    if (!filesEl) return;

    try {
      var res = await AdminCore.apiGet('courseGetStudentFiles', {
        adminId:    AdminCore.state.adminId,
        adminName:  AdminCore.state.adminName,
        courseName: courseName,
        studentId:  studentId,
        studentName: studentName
      });

      var files = (res && res.success && res.files) ? res.files : [];

      if (files.length === 0) {
        filesEl.innerHTML = '<span class="text-gray-400 italic">제출한 파일 없음</span>';
        if (dlBtn) { dlBtn.disabled = true; dlBtn.style.opacity = '0.4'; dlBtn.style.cursor = 'not-allowed'; }
        return;
      }

      // 파일 목록 렌더링: 파일명에서 _ 기준 뒷글자만 표시
      var listHtml = '<ul class="space-y-1">';
      files.forEach(function(f) {
        var displayName = f.name;
        var underIdx = f.name.indexOf('_');
        if (underIdx !== -1) displayName = f.name.substring(underIdx + 1);
        var downloadUrl = 'https://drive.google.com/uc?export=download&id=' + AdminCore.escapeHtml(f.id);
        listHtml += '<li class="flex items-center gap-1.5">'
          + '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/></svg>'
          + '<span class="text-sm text-gray-700 flex-1 truncate">' + AdminCore.escapeHtml(displayName) + '</span>'
          + '<a href="' + downloadUrl + '" class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors">'
          + '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>저장</a>'
          + '</li>';
      });
      listHtml += '</ul>';
      filesEl.className = 'w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm';
      filesEl.innerHTML = listHtml;

      // 다운로드 버튼 활성화
      if (dlBtn) { dlBtn.disabled = false; dlBtn.style.opacity = ''; dlBtn.style.cursor = ''; }

    } catch(e) {
      filesEl.innerHTML = '<span class="text-red-400 italic">파일 목록 조회 오류</span>';
    }
  }

  // ─── 학생 제출 파일 압축 다운로드 ────────────────────────────
  var downloadStudentFiles = async function(studentId, studentName, courseName) {
    NaviComponent.showLoading('불러오는 중입니다...');
    try {
      var res = await AdminCore.apiGet('courseGetStudentFiles', {
        adminId:    AdminCore.state.adminId,
        adminName:  AdminCore.state.adminName,
        courseName: courseName,
        studentId:  studentId,
        studentName: studentName
      });
      var files = (res && res.success && res.files) ? res.files : [];
      if (files.length === 0) {
        NaviComponent.hideLoading();
        NaviComponent.showAlert('다운로드할 파일이 없습니다.');
        return;
      }

      // 접두어(학번+이름+교과목)가 일치하는 파일만 필터링하여 GS에 압축 요청
      var prefix = studentId + studentName + courseName;
      var matchedFiles = files.filter(function(f) {
        var underIdx = f.name.indexOf('_');
        var filePre = underIdx !== -1 ? f.name.substring(0, underIdx) : f.name;
        return filePre === prefix;
      });
      if (matchedFiles.length === 0) {
        NaviComponent.hideLoading();
        NaviComponent.showAlert('조건에 맞는 파일이 없습니다.');
        return;
      }

      var res2 = await AdminCore.apiGet('courseZipStudentFiles', {
        adminId:   AdminCore.state.adminId,
        adminName: AdminCore.state.adminName,
        courseName: courseName,
        studentId:  studentId,
        studentName: studentName,
        fileIds:   JSON.stringify(matchedFiles.map(function(f){ return f.id; })),
        zipName:   studentId + studentName + courseName
      });

      NaviComponent.hideLoading();
      if (res2 && res2.success && res2.url) {
        var a = document.createElement('a');
        a.href = res2.url;
        a.download = studentId + studentName + courseName + '.zip';
        a.click();
        NaviComponent.showAlert('다운로드가 시작되었습니다.');
      } else {
        NaviComponent.showAlert('압축 다운로드 오류: ' + (res2 && res2.message ? res2.message : '알 수 없는 오류'));
      }
    } catch(e) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + e.message);
    }
  }

  // ─── 카드 내용 복사 (학생 제출 내용) ─────────────────────────
function copyCardContent(cardKey) {
  var el = document.getElementById('course-submit-' + cardKey);
  if (!el) return;
  // data-raw 값을 우선 사용
  var text = el.getAttribute('data-raw');
  // 없으면 textContent fallback
  if (text == null || text === '') {
    text = el.textContent || '';
  }
  // 공백 제거
  text = text.trim();
  // 최신 clipboard API
  navigator.clipboard.writeText(text).then(function() {
    var fb = document.getElementById('copy-feedback-' + cardKey);
    if (fb) {
      fb.textContent = '✓ 복사됨';
      setTimeout(function() {
        fb.textContent = '';
      }, 1500);
    }
  }).catch(function() {
    // fallback 복사
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      var fb = document.getElementById('copy-feedback-' + cardKey);
      if (fb) {
        fb.textContent = '✓ 복사됨';
        setTimeout(function() {
          fb.textContent = '';
        }, 1500);
      }
    } catch(e) {
      NaviComponent.showAlert('복사 실패');
    }
    document.body.removeChild(ta);
  });
}

  // ─── 카드 편집 복사 (교사 작성 내용) ─────────────────────────
  function copyCardEdit(cardKey) {
    var el = document.getElementById('course-teacher-' + cardKey);
    if (!el) return;
    var text = el.getAttribute('data-raw-edit') || el.textContent || '';
    navigator.clipboard.writeText(text).then(function() {
      var fb = document.getElementById('copy-feedback-edit-' + cardKey);
      if (fb) { fb.textContent = '✓ 복사됨'; setTimeout(function(){ fb.textContent = ''; }, 1500); }
    });
  }

  // ─── 교사 내용 작성 모달 열기 ─────────────────────────────────────────────────
  // admin_repoarea.js 의 gibu-write-modal DOM을 그대로 재활용.
  // 좌측: 학생 제출 내용(읽기 전용) / 우측: 교사 작성(textarea) + 실시간 글자수
  // 저장만 courseSaveTeacherNote 로 교체, 닫기·바이트카운트는 Admin(AdminRepoArea) 공통 함수 사용.
  // ──────────────────────────────────────────────────────────────────────────────
  function openCourseWriteModal(cardKey, studentId, studentName, courseName) {
    var submitEl  = document.getElementById('course-submit-'  + cardKey);
    var teacherEl = document.getElementById('course-teacher-' + cardKey);
    var submitText  = submitEl  ? (submitEl.getAttribute('data-raw')       || '') : '';
    var currentText = teacherEl ? (teacherEl.getAttribute('data-raw-edit') || '') : '';

    // ── gibu-write-modal DOM 요소 채우기 ──────────────────────
    var modal       = document.getElementById('gibu-write-modal');
    var leftLabel   = document.getElementById('gibu-modal-left-label');
    var leftBytes   = document.getElementById('gibu-modal-left-bytes');
    var leftContent = document.getElementById('gibu-modal-left-content');
    var rightLabel  = document.getElementById('gibu-modal-right-label');
    var ta          = document.getElementById('gibu-modal-textarea');
    var badge       = document.getElementById('gibu-modal-student-badge');
    var saveBtn     = document.getElementById('gibu-modal-save-btn');

    if (!modal) {
      NaviComponent.showAlert('생기부 작성 모달을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
      return;
    }

    // 학생 뱃지
    if (badge) badge.textContent = studentId + ' ' + studentName;

    // 좌측 — 학생 제출 내용
    if (leftLabel)   leftLabel.textContent   = courseName + ' — 학생 제출 내용';
    if (leftBytes)   leftBytes.textContent   = '';
    if (leftContent) leftContent.textContent = submitText || '학생이 제출한 내용이 없습니다.';
    
    // 우측 — 교사 작성
    if (rightLabel) rightLabel.textContent = courseName + ' — 교사 작성 내용';
    if (ta) {
      ta.value = currentText;
       if (typeof AdminRepoArea !== 'undefined') {
       AdminRepoArea.initModalSavedText(currentText);
      }
      // 기존 Admin.updateModalBytes() 호출로 바이트 카운트 갱신
      if (typeof Admin !== 'undefined' && typeof Admin.updateModalBytes === 'function') {
        Admin.updateModalBytes();
      }
    }

    // ── 저장 버튼 onclick 을 교과용으로 교체 ─────────────────
    // 기존 생기부 저장(adminSaveTeacherGibu) 대신 courseSaveTeacherNote 호출
    if (saveBtn) {
      // 이전에 붙인 교과용 핸들러가 있으면 제거
      if (saveBtn._courseHandler) {
        saveBtn.removeEventListener('click', saveBtn._courseHandler);
        saveBtn._courseHandler = null;
      }
      // onclick 속성(기존 Admin.saveGibuModal 연결) 제거
      saveBtn.removeAttribute('onclick');

      saveBtn._courseHandler = function() {
        _saveCourseFromGibuModal(cardKey, studentId, courseName);
      };
      saveBtn.addEventListener('click', saveBtn._courseHandler);
    }

    // 스크롤 위치 기억 (AdminRepoArea._modalState 와 동일 패턴)
    var main = document.querySelector('main.flex-1');
    var _scrollY = main ? main.scrollTop : window.scrollY;
  
  var leftCopyFb = document.getElementById('gibu-modal-left-copy-fb');
  if (leftCopyFb) {
    var leftCopyBtn = leftCopyFb.previousElementSibling;
    if (leftCopyBtn) {
      leftCopyBtn.onclick = function() {
        var fb = document.getElementById('gibu-modal-left-copy-fb');
        function show() {
          if (fb) { fb.textContent = '복사 완료'; clearTimeout(fb._t); fb._t = setTimeout(function(){ fb.textContent = ''; }, 2000); }
        }
        AdminCourse.copyCardContent(cardKey);
        show();
      };
    }
  }
      
    modal.classList.remove('hidden');
    if (ta) ta.focus();

    // 모달 닫힐 때 스크롤 복원을 위해 저장
    modal._courseScrollY = _scrollY;
  }

  // ─── 교과용 저장: gibu-write-modal textarea → courseSaveTeacherNote ──────────
  var _saveCourseFromGibuModal = async function(cardKey, studentId, courseName) {
    var ta      = document.getElementById('gibu-modal-textarea');
    var saveBtn = document.getElementById('gibu-modal-save-btn');
    if (!ta) return;

    var newText = ta.value || '';

    var _success = false;
    try {
      await saveCourseTeacherNote(cardKey, studentId, courseName, newText);
      _success = true;
    } catch(e) {
      // saveCourseTeacherNote 내부에서 NaviComponent 처리
    }

    if (_success) {
      // 핸들러 정리 및 onclick 복원 (다른 메뉴에서 생기부 모달 쓸 때 대비)
      if (saveBtn) {
        if (saveBtn._courseHandler) {
          saveBtn.removeEventListener('click', saveBtn._courseHandler);
          saveBtn._courseHandler = null;
        }
        saveBtn.setAttribute('onclick', 'Admin.saveGibuModal()');
      }
      // 모달 닫기 + 스크롤 복원
      var modal = document.getElementById('gibu-write-modal');
      if (modal) {
        modal.classList.add('hidden');
        var scrollY = modal._courseScrollY || 0;
        var main = document.querySelector('main.flex-1');
        if (main) { main.scrollTop = scrollY; } else { window.scrollTo(0, scrollY); }
      }
    }
    // 실패 시: 버튼만 복구, 모달은 열어둠 (재시도 가능)
  }

  // closeCourseWriteModal, saveCourseWriteModal 은 이제 gibu-write-modal을 쓰므로
  // Admin.closeGibuWriteModal 위임. 공개 API용으로만 유지.
  function closeCourseWriteModal() {
    if (typeof Admin !== 'undefined' && typeof Admin.closeGibuWriteModal === 'function') {
      Admin.closeGibuWriteModal();
    }
  }

  function saveCourseWriteModal() {
    // 직접 호출은 _saveCourseFromGibuModal 로 위임됨(saveBtn click 이벤트에서 처리)
    // 이 함수는 하위 호환성 유지용
  }

  // ─── 교사 내용 저장 (11번째 열 = 편집내용 열) ────────────────
  var saveCourseTeacherNote = async function(cardKey, studentId, courseName, newText) {
    NaviComponent.showLoading('저장 중입니다...');
    try {
      var res = await AdminCore.apiGet('courseSaveTeacherNote', {
        adminId:    AdminCore.state.adminId,
        adminName:  AdminCore.state.adminName,
        courseName: courseName,
        studentId:  studentId,
        noteText:   newText
      });
      NaviComponent.hideLoading();
      if (res && res.success) {
        // 카드 UI 갱신
        var teacherEl = document.getElementById('course-teacher-' + cardKey);
        if (teacherEl) {
          teacherEl.setAttribute('data-raw-edit', newText);
          teacherEl.innerHTML = newText
            ? AdminCore.escapeHtml(newText)
            : '<span class="text-gray-400 italic">편집 내용 없음</span>';
          // 줄임표 힌트
          var hint = teacherEl.nextElementSibling;
          if (hint && hint.classList.contains('gibu-ellipsis-hint')) {
            hint.style.display = newText ? '' : 'none';
          }
        }
        NaviComponent.showAlert('교사 작성 내용이 저장되었습니다.');
      } else {
        NaviComponent.showAlert('저장 오류: ' + (res && res.message ? res.message : '알 수 없는 오류'));
      }
    } catch(e) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + e.message);
    }
  }

// ─── 교과 삭제 ───────────────────────────────────────────────
  function confirmDeleteCourse(courseName) {
    var old = document.getElementById('ac-delete-confirm-modal');
    if (old) old.remove();

    var escapedName = AdminCore.escapeHtml(courseName);
    var modalHtml = '<div id="ac-delete-confirm-modal" style="'
      + 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.45);'
      + 'z-index:999999;align-items:center;justify-content:center;">'
      + '<div style="background:#fff;border-radius:1rem;padding:2rem 1.75rem 1.5rem;'
      + 'max-width:380px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,0.18);text-align:center;">'
      + '<div style="font-size:2rem;margin-bottom:0.75rem;">🗑️</div>'
      + '<div style="font-size:1rem;font-weight:700;color:#1f2937;margin-bottom:0.5rem;">교과 삭제</div>'
      + '<div style="font-size:0.85rem;color:#6b7280;margin-bottom:1rem;line-height:1.6;">'
      + '「<strong>' + escapedName + '</strong>」 교과를 삭제하면<br>'
      + '수강학생 명단, 교과 데이터 및 관련 파일이<br><strong>모두 삭제</strong>됩니다.<br><br>'
      + '삭제하려면 아래에 <strong style="color:#dc2626;">삭제합니다</strong> 를 입력하세요.'
      + '</div>'
      + '<input id="ac-delete-confirm-input" type="text" placeholder="삭제합니다"'
      + ' style="width:100%;border:1.5px solid #e5e7eb;border-radius:0.5rem;'
      + 'padding:0.5rem 0.75rem;font-size:0.9rem;text-align:center;'
      + 'box-sizing:border-box;margin-bottom:1rem;outline:none;transition:border-color 0.15s;"'
      + ' oninput="(function(el){'
      + 'var btn=document.getElementById(\'ac-delete-exec-btn\');'
      + 'if(el.value===\'삭제합니다\'){'
      + 'btn.disabled=false;btn.style.opacity=\'1\';btn.style.cursor=\'pointer\';el.style.borderColor=\'#dc2626\';'
      + '}else{'
      + 'btn.disabled=true;btn.style.opacity=\'0.4\';btn.style.cursor=\'not-allowed\';el.style.borderColor=\'#e5e7eb\';'
      + '}})(this)"/>'
      + '<div style="display:flex;gap:0.75rem;">'
      + '<button onclick="document.getElementById(\'ac-delete-confirm-modal\').remove()"'
      + ' style="flex:1;padding:0.6rem 0;border-radius:0.5rem;border:1px solid #e5e7eb;'
      + 'background:#f9fafb;color:#6b7280;font-size:0.875rem;font-weight:600;cursor:pointer;">취소</button>'
      + '<button id="ac-delete-exec-btn" disabled'
      + ' style="flex:1;padding:0.6rem 0;border-radius:0.5rem;border:none;'
      + 'background:#dc2626;color:#fff;font-size:0.875rem;font-weight:600;'
      + 'cursor:not-allowed;opacity:0.4;transition:opacity 0.15s;"'
      + ' onclick="document.getElementById(\'ac-delete-confirm-modal\').remove();'
      + 'AdminCourse.deleteCourse(\'' + escapedName + '\');">삭제</button>'
      + '</div>'
      + '</div></div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(function() {
      var inp = document.getElementById('ac-delete-confirm-input');
      if (inp) inp.focus();
    }, 50);
  }

  var deleteCourse = async function(courseName) {
    NaviComponent.showLoading('삭제 중입니다...');
    try {
      var res = await AdminCore.apiGet('courseDelete', {
        adminId:    AdminCore.state.adminId,
        adminName:  AdminCore.state.adminName,
        courseName: courseName
      });
      NaviComponent.hideLoading();
      if (res && res.success) {
        _state.courses = _state.courses.filter(function(c) { return c !== courseName; });
        if (_state.selectedCourse === courseName) {
          _state.selectedCourse = null;
          var ca = document.getElementById('content-area');
          if (ca) ca.innerHTML = '';
          _showWelcome();
        }
        renderSidebar();
        NaviComponent.showAlert('「' + courseName + '」 교과가 삭제되었습니다.');
      } else {
        NaviComponent.showAlert('삭제 오류: ' + (res && res.message ? res.message : '알 수 없는 오류'));
      }
    } catch (err) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + err.message);
    }
  }
  
  // ─── 하위 메뉴: 모두 보기 ────────────────────────────────────
  function _onSubmenuAll() {
    _state.currentView = 'all';
    renderSidebar();
    if (_state.selectedCourse) {
      _renderCourseDetail(_state.selectedCourse);
    }
  }

  // ─── 하위 메뉴: 요약 보기 ────────────────────────────────────
  function _onSubmenuSummary() {
    _state.currentView = 'summary';
    renderSidebar();
    if (_state.selectedCourse) {
      _renderSummaryView(_state.selectedCourse);
    }
  }

  // ─── 요약 보기 렌더링 ─────────────────────────────────────────
  var _renderSummaryView = async function(courseName) {
    var ca = document.getElementById('content-area');
    if (!ca) return;

    ca.innerHTML = '<div class="p-5">'
      + '<div class="skeleton-box h-10 w-48 mb-4"></div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">'
      + '<div class="skeleton-box h-36"></div><div class="skeleton-box h-36"></div>'
      + '<div class="skeleton-box h-36"></div><div class="skeleton-box h-36"></div>'
      + '</div></div>';
    NaviComponent.showLoading('불러오는 중입니다...');

    var students = [];
    try {
      var res = await AdminCore.apiGet('courseGetStudents', {
        adminId:    AdminCore.state.adminId,
        courseName: courseName
      });
      if (res && res.success) students = res.data || [];
    } catch(e) {}

    NaviComponent.hideLoading();

    var enrolled = students.filter(function(s) { return s && s.studentId; });
    var escaped  = AdminCore.escapeHtml(courseName);

    var html = '<div class="p-4 sm:p-5 max-w-4xl mx-auto">'
      + '<div class="flex items-center gap-2 mb-4">'
      + '<div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow">'
      + '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
      + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>'
      + '</svg></div>'
      + '<h2 class="text-base font-bold text-gray-800">요약 보기'
      + ' <span class="text-indigo-600 text-sm font-semibold">— ' + escaped + ' (' + enrolled.length + '명)</span></h2>'
      + '</div>';

    if (enrolled.length === 0) {
      html += '<div class="text-center text-gray-400 text-sm py-16">수강 학생 데이터가 없습니다.</div>';
    } else {
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">';
      enrolled.forEach(function(s) {
        var sid    = s.studentId || '';
        var sname  = s.name      || '';
        var submit = s.submitContent || '';
        var teacher= s.teacherNote   || '';
        var cardKey    = 'c_' + encodeURIComponent(sid).replace(/%/g, '_');
        var sidAttr    = AdminCore.escapeHtml(sid);
        var snameAttr  = AdminCore.escapeHtml(sname);
        var courseAttr = AdminCore.escapeHtml(courseName);

        // 카드 클릭 → openCourseWriteModal (기존 모달 재활용)
        html += '<div onclick="AdminCourse.openCourseWriteModal(\'' + cardKey + '\',\'' + sidAttr + '\',\'' + snameAttr + '\',\'' + courseAttr + '\')"'
          + ' style="background:#fff;border:1.5px solid #e0e7ff;border-radius:0.9rem;'
          + 'padding:14px 14px 12px;cursor:pointer;'
          + 'box-shadow:0 1px 6px rgba(99,102,241,0.07);transition:box-shadow 0.18s,border-color 0.18s;"'
          + ' onmouseover="this.style.boxShadow=\'0 4px 18px rgba(99,102,241,0.18)\';this.style.borderColor=\'#a5b4fc\';"'
          + ' onmouseout="this.style.boxShadow=\'0 1px 6px rgba(99,102,241,0.07)\';this.style.borderColor=\'#e0e7ff\';">'

          // 학번 + 이름
          + '<div style="font-size:0.82rem;font-weight:700;color:#1f2937;'
          + 'border-bottom:1px solid #e0e7ff;padding-bottom:8px;margin-bottom:10px;">'
          + AdminCore.escapeHtml(sid) + ' ' + AdminCore.escapeHtml(sname)
          + '</div>'

          // 항목별 있음/없음
          + '<div style="display:flex;flex-direction:column;gap:5px;font-size:0.78rem;">'

          + '<div style="display:flex;justify-content:space-between;align-items:center;">'
          + '<span style="color:#6b7280;">📄 학생 제출 내용</span>'
          + (submit
            ? '<span style="color:#059669;font-weight:700;background:#ecfdf5;border-radius:4px;padding:1px 7px;">있음</span>'
            : '<span style="color:#9ca3af;background:#f3f4f6;border-radius:4px;padding:1px 7px;">없음</span>')
          + '</div>'

          + '<div style="display:flex;justify-content:space-between;align-items:center;">'
          + '<span style="color:#6b7280;">📁 학생 제출 파일</span>'
          + '<span id="ac-sum-file-' + cardKey + '" style="color:#9ca3af;background:#f3f4f6;border-radius:4px;padding:1px 7px;">확인 중</span>'
          + '</div>'

          + '<div style="display:flex;justify-content:space-between;align-items:center;">'
          + '<span style="color:#6b7280;">✏️ 교사 작성 내용</span>'
          + (teacher
            ? '<span style="color:#059669;font-weight:700;background:#ecfdf5;border-radius:4px;padding:1px 7px;">있음</span>'
            + '</div>'
            : '<span style="color:#9ca3af;background:#f3f4f6;border-radius:4px;padding:1px 7px;">없음</span>'
            + '</div>')

          + '</div>'
          + '<div style="margin-top:10px;text-align:center;font-size:0.72rem;color:#a5b4fc;font-weight:600;">'
          + '클릭하여 교사 내용 작성 →'
          + '</div>'
          + '</div>';

        // openCourseWriteModal이 참조하는 숨김 DOM
        html += '<div id="course-submit-' + cardKey + '" style="display:none;"'
          + ' data-raw="' + AdminCore.escapeHtml(submit) + '"></div>'
          + '<div id="course-teacher-' + cardKey + '" style="display:none;"'
          + ' data-raw-edit="' + AdminCore.escapeHtml(teacher) + '"></div>';
      });
      html += '</div>';
    }

    html += '</div>';
    ca.innerHTML = html;

    // 제출 파일 여부 비동기 확인
    enrolled.forEach(function(s) {
      var cardKey = 'c_' + encodeURIComponent(s.studentId || '').replace(/%/g, '_');
      _checkSummaryFileStatus(s.studentId, s.name, courseName, cardKey);
    });
  }

  var _checkSummaryFileStatus = async function(studentId, studentName, courseName, cardKey) {
    var el = document.getElementById('ac-sum-file-' + cardKey);
    if (!el) return;
    try {
      var res = await AdminCore.apiGet('courseGetStudentFiles', {
        adminId:     AdminCore.state.adminId,
        adminName:   AdminCore.state.adminName,
        courseName:  courseName,
        studentId:   studentId,
        studentName: studentName
      });
      var files = (res && res.success && res.files) ? res.files : [];
      if (files.length > 0) {
        el.textContent = '있음';
        el.style.color = '#059669'; el.style.fontWeight = '700'; el.style.background = '#ecfdf5';
      } else {
        el.textContent = '없음';
        el.style.color = '#9ca3af'; el.style.background = '#f3f4f6';
      }
    } catch(e) {
      el.textContent = '오류';
      el.style.color = '#ef4444';
    }
  }

  // ─── 하위 메뉴: 학생 파일 전체 저장 ─────────────────────────
  function _onSubmenuDownloadAll() {
    if (!_state.selectedCourse) {
      NaviComponent.showAlert('교과목을 먼저 선택해주세요.', null, { icon: 'ℹ️' });
      return;
    }
    _showDownloadAllModal(_state.selectedCourse);
  }

  function _showDownloadAllModal(courseName) {
    var old = document.getElementById('ac-dl-all-modal');
    if (old) old.remove();

    var escapedName = AdminCore.escapeHtml(courseName);
    var modalHtml = '<div id="ac-dl-all-modal" style="'
      + 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.45);'
      + 'z-index:999999;align-items:center;justify-content:center;">'
      + '<div style="background:#fff;border-radius:1rem;padding:2rem 1.75rem 1.5rem;'
      + 'max-width:360px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,0.18);text-align:center;">'
      + '<div style="font-size:2rem;margin-bottom:0.75rem;">📦</div>'
      + '<div style="font-size:1rem;font-weight:700;color:#1f2937;margin-bottom:0.5rem;">학생 파일 전체 저장</div>'
      + '<div style="font-size:0.85rem;color:#6b7280;margin-bottom:1.5rem;line-height:1.6;">'
      + '「<strong>' + escapedName + '</strong>」의<br>'
      + '모든 학생 제출 파일을 압축하여 저장합니다.<br>'
      + '<span style="color:#6366f1;font-size:0.8rem;">파일 수에 따라 시간이 걸릴 수 있습니다.</span>'
      + '</div>'
      + '<div style="display:flex;gap:0.75rem;">'
      + '<button onclick="document.getElementById(\'ac-dl-all-modal\').remove()"'
      + ' style="flex:1;padding:0.6rem 0;border-radius:0.5rem;border:1px solid #e5e7eb;'
      + 'background:#f9fafb;color:#6b7280;font-size:0.875rem;font-weight:600;cursor:pointer;">취소</button>'
      + '<button onclick="document.getElementById(\'ac-dl-all-modal\').remove();'
      + 'AdminCourse._doDownloadAllFiles(\'' + escapedName + '\');"'
      + ' style="flex:1;padding:0.6rem 0;border-radius:0.5rem;border:none;'
      + 'background:#4f46e5;color:#fff;font-size:0.875rem;font-weight:600;cursor:pointer;">저장 시작</button>'
      + '</div>'
      + '</div></div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  var _doDownloadAllFiles = async function(courseName) {
    NaviComponent.showLoading('파일을 압축하고 저장합니다.<br>잠시만 기다려주세요...');
    try {
      var res = await AdminCore.apiGet('courseZipAllStudentFiles', {
        adminId:    AdminCore.state.adminId,
        adminName:  AdminCore.state.adminName,
        courseName: courseName,
        zipName:    courseName + '_학생제출파일'
      });
      NaviComponent.hideLoading();
      if (res && res.success && res.url) {
        var a = document.createElement('a');
        a.href = res.url;
        a.download = courseName + '_학생제출파일.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        NaviComponent.showAlert('다운로드가 시작되었습니다.', null, { icon: '✅' });
      } else {
        NaviComponent.showAlert('오류: ' + (res && res.message ? res.message : '알 수 없는 오류'), null, { icon: '⚠️' });
      }
    } catch(e) {
      NaviComponent.hideLoading();
      NaviComponent.showAlert('오류: ' + e.message, null, { icon: '⚠️' });
    }
  }

  // ─── 공개 API ────────────────────────────────────────────────
  return {
    init:                init,
    renderSidebar:       renderSidebar,
    confirmDeleteCourse: confirmDeleteCourse,
    deleteCourse:        deleteCourse,
    showOpenCourseForm:  showOpenCourseForm,
    _onCourseNameBlur:   _onCourseNameBlur,
    // 하위 메뉴 핸들러
    _onSubmenuAll:          _onSubmenuAll,
    _onSubmenuSummary:      _onSubmenuSummary,
    _onSubmenuDownloadAll:  _onSubmenuDownloadAll,
    _doDownloadAllFiles:    _doDownloadAllFiles,
    downloadStudentTemplate: downloadStudentTemplate,
    handleFileSelect:    handleFileSelect,
    handleFileDrop:      handleFileDrop,
    clearFile:           clearFile,
    saveCourse:          saveCourse,
    selectCourse:        selectCourse,
    openNoticeModal:     openNoticeModal,
    closeNoticeModal:    closeNoticeModal,
    downloadNoticeTmpl:  downloadNoticeTmpl,
    handleNoticeFileSelect: handleNoticeFileSelect,
    handleNoticeFileDrop:   handleNoticeFileDrop,
    clearNoticeFile:        clearNoticeFile,
    uploadNoticeFile:    uploadNoticeFile,
    saveAllNotice:              saveAllNotice,
    deleteAllNotice:            deleteAllNotice,
    handleAllNoticeFileSelect:  handleAllNoticeFileSelect,
    handleAllNoticeFileDrop:    handleAllNoticeFileDrop,
    clearAllNoticeFile:         clearAllNoticeFile,
    uploadAllNoticeToDrive:     uploadAllNoticeToDrive,
    deleteDriveFile:            deleteDriveFile,
    // ── 교과 학생 카드 기능 ──
    copyCardContent:            copyCardContent,
    copyCardEdit:               copyCardEdit,
    openCourseWriteModal:       openCourseWriteModal,
    closeCourseWriteModal:      closeCourseWriteModal,
    saveCourseWriteModal:       saveCourseWriteModal,
    saveCourseTeacherNote:      saveCourseTeacherNote,
    downloadStudentFiles:       downloadStudentFiles
  };

})();
