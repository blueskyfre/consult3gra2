var NaviComponent = (function () {
  'use strict';
  var NAV_ITEMS = [
    { key: 'schedule',   label: '일정',        color: 'blue' },
    { key: 'suneung',    label: '수능과목선택', color: 'blue' },
    { key: 'university', label: '관심대학',     color: 'blue' },
    { key: 'record',     label: '생기부 기초자료', color: 'blue' },
    { key: 'class',      label: '수업자료',     color: 'blue' }
  ];
  var NAV_ITEMS_SUBJECT = ['class'];
  var PAGE_FILES = {
    schedule  : 'firstpage.html',
    suneung   : 'susel.html',
    university: 'univer.html',
    record    : 'record.html',
    class     : 'class.html'
  };
  var UNDERLINE_COLOR = {
    blue  : '#3b82f6',
    green : '#22c55e',
    purple: '#a855f7'
  };
  var ACTIVE_TEXT_COLOR = {
    blue  : '#2563eb',
    green : '#16a34a',
    purple: '#9333ea'
  };
  var _cfg = {};
  var _isDirty = false;
  var _loadingTimer = null;
  var _lockedElements = [];
  var _styleInjected = false;
  function _injectStyle() {
    if (_styleInjected) return;
    _styleInjected = true;
    var style = document.createElement('style');
    style.textContent = [
      '.navi-btn {',
      '  position: relative;',
      '  background: none;',
      '  border: none;',
      '  outline: none;',
      '  cursor: pointer;',
      '  padding: 6px 2px 4px;',
      '  font-size: 0.8rem;',
      '  font-weight: 500;',
      '  color: #6b7280;',
      '  letter-spacing: 0.01em;',
      '  transition: color 0.2s;',
      '}',
      '@media (min-width: 640px) {',
      '  .navi-btn { font-size: 0.875rem; padding: 6px 4px 4px; }',
      '}',
      '.navi-btn::after {',
      '  content: "";',
      '  position: absolute;',
      '  left: 0;',
      '  bottom: 0;',
      '  width: 100%;',
      '  height: 2px;',
      '  border-radius: 1px;',
      '  transform: scaleX(0);',
      '  transform-origin: left center;',
      '  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);',
      '}',
      '.navi-btn:hover::after, .navi-btn.navi-active::after {',
      '  transform: scaleX(1);',
      '}',
      '.navi-btn-blue::after  { background: #3b82f6; }',
      '.navi-btn-green::after { background: #22c55e; }',
      '.navi-btn-purple::after{ background: #a855f7; }',
      '.navi-btn-blue:hover,  .navi-btn-blue.navi-active  { color: #2563eb; }',
      '.navi-btn-green:hover, .navi-btn-green.navi-active { color: #16a34a; }',
      '.navi-btn-purple:hover,.navi-btn-purple.navi-active{ color: #9333ea; }',
      '.navi-btn-action {',
      '  position: relative;',
      '  background: none;',
      '  border: none;',
      '  outline: none;',
      '  cursor: pointer;',
      '  padding: 6px 2px 4px;',
      '  font-size: 0.75rem;',
      '  font-weight: 500;',
      '  color: #6b7280;',
      '  letter-spacing: 0.01em;',
      '  transition: color 0.2s;',
      '}',
      '@media (min-width: 640px) {',
      '  .navi-btn-action { font-size: 0.8rem; }',
      '}',
      '.navi-btn-action::after {',
      '  content: "";',
      '  position: absolute;',
      '  left: 0;',
      '  bottom: 0;',
      '  width: 100%;',
      '  height: 2px;',
      '  border-radius: 1px;',
      '  transform: scaleX(0);',
      '  transform-origin: left center;',
      '  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);',
      '}',
      '.navi-btn-action:hover::after { transform: scaleX(1); }',
      '.navi-btn-save::after  { background: #3b82f6; }',
      '.navi-btn-logout::after{ background: #ef4444; }',
      '.navi-btn-save:hover   { color: #2563eb; }',
      '.navi-btn-logout:hover { color: #dc2626; }'
    ].join('\n');
    document.head.appendChild(style);
  }
  function init(options) {
    options = options || {};
    var defaultGithub = (typeof Config !== 'undefined' && Config.GITHUB)
      ? Config.GITHUB
      : '';
    if (!defaultGithub) {
      console.error('[NaviComponent] 잘못된 주소를 참조했습니다.');
    }
    _cfg = {
      activePage   : options.activePage   || '',
      userName     : options.userName     || '',
      studentId    : options.studentId    || '',
      githubUrl    : options.githubUrl    || defaultGithub,
      menuAuth     : options.menuAuth     || '모든메뉴',
      onSave       : options.onSave       || null,
      onLogout     : options.onLogout     || null,
      classEnabled : (options.classEnabled !== false) 
    };
    if (options.classEnabled === undefined && options.studentId && options.userName) {
      _checkClassEnabled(options.studentId, options.userName);
    }
    _render();
  }
  function update(options) {
    options = options || {};
    if (options.userName  !== undefined) _cfg.userName  = options.userName;
    if (options.studentId !== undefined) _cfg.studentId = options.studentId;
    if (options.onSave    !== undefined) _cfg.onSave    = options.onSave;
    if (options.onLogout  !== undefined) _cfg.onLogout  = options.onLogout;
    var nameEl = document.getElementById('nav-user-info');
    if (nameEl) {
      nameEl.textContent = _cfg.userName ? (_cfg.userName + ' 학생') : '';
    }
  }
  function _checkClassEnabled(studentId, studentName) {
    var deploy = (typeof Config !== 'undefined' && Config.DEPLOY) ? Config.DEPLOY : '';
    if (!deploy) return;
    var qs = 'action=classGetCourses'
      + '&studentId='   + encodeURIComponent(studentId)
      + '&studentName=' + encodeURIComponent(studentName);
    fetch(deploy + '?' + qs)
      .then(function(r) { return r.json(); })
      .then(function(res) {
        var hasClass = res.success && res.data && res.data.length > 0;
        _cfg.classEnabled = hasClass;
        var btn = document.querySelector('[data-navkey="class"]');
        if (btn) {
          if (!hasClass) {
            btn.disabled = true;
            btn.style.opacity    = '0.35';
            btn.style.cursor     = 'not-allowed';
            btn.title = '수강 중인 과목이 없습니다.';
          } else {
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor  = '';
            btn.title = '';
          }
        }
      })
      .catch(function() {  });
  }
  function _render() {
    var container = document.getElementById('shared-nav');
    if (!container) {
      console.warn('[NaviComponent] id="shared-nav" 요소를 찾을 수 없습니다.');
      return;
    }
    _injectStyle();
    var visibleItems = (_cfg.menuAuth === '교과별메뉴')
      ? NAV_ITEMS.filter(function(item) { return NAV_ITEMS_SUBJECT.indexOf(item.key) >= 0; })
      : NAV_ITEMS;
    var btnHTML = visibleItems.map(function (item) {
      var isActive  = (item.key === _cfg.activePage);
      var isDisabled = (item.key === 'class' && !_cfg.classEnabled);
      var activeClass = isActive ? ' navi-active' : '';
      var disabledAttr = isDisabled
        ? ' disabled style="opacity:0.35;cursor:not-allowed;" title="수강 중인 과목이 없습니다."'
        : '';
      return '<button'
        + ' onclick="NaviComponent._onNavClick(\'' + item.key + '\')"'
        + ' class="navi-btn navi-btn-' + item.color + activeClass + '"'
        + ' data-navkey="' + item.key + '"'
        + disabledAttr
        + '>'
        + item.label
        + '</button>';
    }).join('\n          ');
    var saveHTML = _cfg.onSave
      ? '<button onclick="NaviComponent._onSave()"'
      +   ' class="navi-btn-action navi-btn-save">'
      +   '💾 저장'
      + '</button>'
      : '';
    var logoutHTML = _cfg.onLogout
      ? '<button onclick="NaviComponent._onLogout()"'
      +   ' class="navi-btn-action navi-btn-logout">'
      +   '로그아웃'
      + '</button>'
      : '';
    var userName = _cfg.userName ? (_cfg.userName + ' 학생') : '';
    container.innerHTML =
      '<nav class="bg-white shadow-sm sticky top-0 z-50">'
    + '  <div class="max-w-6xl mx-auto px-4 py-3">'
    + '    <div class="flex items-center justify-between">'
    + '      <div class="flex items-center gap-1 sm:gap-2 flex-wrap">'
    +          btnHTML
    + '      </div>'
    + '      <div class="flex items-center gap-2 sm:gap-3">'
    + '        <span id="nav-user-info" class="text-xs sm:text-sm text-gray-600 font-medium">' + userName + '</span>'
    +          saveHTML
    +          logoutHTML
    + '      </div>'
    + '    </div>'
    + '  </div>'
    + '</nav>';
  }
  function _doNavTo(pageKey) {
    var params = new URLSearchParams({
      studentId : _cfg.studentId,
      name      : _cfg.userName,
      menuAuth  : _cfg.menuAuth
    });
    var fileName = PAGE_FILES[pageKey];
    if (fileName) {
      showLoading('페이지 이동 중입니다...');
      window.location.href = _cfg.githubUrl + fileName + '?' + params.toString();
    }
  }
  function _onNavClick(pageKey) {
    if (pageKey === _cfg.activePage) return; 
    if (pageKey === 'class' && !_cfg.classEnabled) return; 
    if (_isDirty) {
      _showConfirm(function() { _doNavTo(pageKey); });
      return;
    }
    _doNavTo(pageKey);
  }
  function _onSave() {
    if (typeof _cfg.onSave === 'function') _cfg.onSave();
  }
  function _onLogout() {
    if (_isDirty) {
      _showConfirm(function() {
        if (typeof _cfg.onLogout === 'function') _cfg.onLogout();
      });
      return;
    }
    if (typeof _cfg.onLogout === 'function') _cfg.onLogout();
  }
  function _injectConfirmStyle() {
    if (document.getElementById('navi-confirm-style')) return;
    var style = document.createElement('style');
    style.id = 'navi-confirm-style';
    style.textContent = [
      '#navi-confirm-overlay {',
      '  display: none;',
      '  position: fixed;',
      '  inset: 0;',
      '  background: rgba(0,0,0,0.45);',
      '  z-index: 99999;',
      '  align-items: center;',
      '  justify-content: center;',
      '}',
      '#navi-confirm-overlay.navi-confirm-show { display: flex; }',
      '.navi-confirm-box {',
      '  background: #ffffff;',
      '  border-radius: 1rem;',
      '  padding: 2rem 1.75rem 1.5rem;',
      '  max-width: 360px;',
      '  width: 90%;',
      '  box-shadow: 0 8px 40px rgba(0,0,0,0.18);',
      '  text-align: center;',
      '}',
      '.navi-confirm-icon { font-size: 2rem; margin-bottom: 0.75rem; }',
      '.navi-confirm-title {',
      '  font-size: 1rem;',
      '  font-weight: 700;',
      '  color: #1f2937;',
      '  margin-bottom: 0.5rem;',
      '}',
      '.navi-confirm-desc {',
      '  font-size: 0.85rem;',
      '  color: #6b7280;',
      '  margin-bottom: 1.5rem;',
      '  line-height: 1.6;',
      '}',
      '.navi-confirm-btns { display: flex; gap: 0.75rem; justify-content: center; }',
      '.navi-confirm-btn-leave {',
      '  flex: 1; padding: 0.6rem 0; border-radius: 0.5rem;',
      '  border: 1px solid #e5e7eb; background: #f9fafb;',
      '  color: #6b7280; font-size: 0.875rem; font-weight: 600;',
      '  cursor: pointer; transition: background 0.15s;',
      '}',
      '.navi-confirm-btn-leave:hover { background: #f3f4f6; }',
      '.navi-confirm-btn-stay {',
      '  flex: 1; padding: 0.6rem 0; border-radius: 0.5rem;',
      '  border: none; background: #2563eb;',
      '  color: #ffffff; font-size: 0.875rem; font-weight: 600;',
      '  cursor: pointer; transition: background 0.15s;',
      '}',
      '.navi-confirm-btn-stay:hover { background: #1d4ed8; }'
    ].join('\n');
    document.head.appendChild(style);
  }
  function _ensureConfirmModal() {
    _injectConfirmStyle();
    if (document.getElementById('navi-confirm-overlay')) return;
    var div = document.createElement('div');
    div.id = 'navi-confirm-overlay';
    div.innerHTML = [
      '<div class="navi-confirm-box">',
      '  <div class="navi-confirm-icon">💾</div>',
      '  <div class="navi-confirm-title">저장하지 않은 내용이 있습니다</div>',
      '  <div class="navi-confirm-desc">이 페이지를 떠나면 작성한 내용이<br>사라집니다. 정말 이동하시겠습니까?</div>',
      '  <div class="navi-confirm-btns">',
      '    <button class="navi-confirm-btn-leave" id="navi-confirm-leave">저장 안 하고 이동</button>',
      '    <button class="navi-confirm-btn-stay" id="navi-confirm-stay">계속 작성하기</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(div);
  }
  function _showConfirm(onLeave) {
    _ensureConfirmModal();
    var overlay = document.getElementById('navi-confirm-overlay');
    overlay.classList.add('navi-confirm-show');
    document.getElementById('navi-confirm-stay').onclick = function() {
      overlay.classList.remove('navi-confirm-show');
    };
    document.getElementById('navi-confirm-leave').onclick = function() {
      overlay.classList.remove('navi-confirm-show');
      _isDirty = false;
      onLeave();
    };
  }
  function _injectSpinnerStyle() {
    if (document.getElementById('navi-spinner-style')) return;
    var style = document.createElement('style');
    style.id = 'navi-spinner-style';
    style.textContent = [
      '#navi-loading-overlay {',
      '  display: none;',
      '  position: fixed;',
      '  inset: 0;',
      '  background: rgba(0,0,0,0.35);',
      '  z-index: 99999;',
      '  align-items: center;',
      '  justify-content: center;',
      '}',
      '#navi-loading-overlay.navi-loading-show {',
      '  display: flex;',
      '}',
      '.navi-spinner {',
      '  width: 52px;',
      '  height: 52px;',
      '  border: 5px solid #e5e7eb;',
      '  border-top-color: #3b82f6;',
      '  border-radius: 50%;',
      '  animation: navi-spin 0.75s linear infinite;',
      '}',
      '.navi-loading-box {',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  gap: 16px;',
      '}',
      '.navi-loading-text {',
      '  color: #ffffff;',
      '  font-size: 0.95rem;',
      '  font-weight: 500;',
      '  letter-spacing: 0.03em;',
      '  animation: navi-pulse-text 1.4s ease-in-out infinite;',
      '}',
      '@keyframes navi-pulse-text {',
      '  0%, 100% { opacity: 1; }',
      '  50%       { opacity: 0.35; }',
      '}',
      '@keyframes navi-spin {',
      '  to { transform: rotate(360deg); }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }
  function _ensureOverlay() {
    if (document.getElementById('navi-loading-overlay')) return;
    var div = document.createElement('div');
    div.id = 'navi-loading-overlay';
    div.innerHTML = '<div class="navi-loading-box"><div class="navi-spinner"></div><p class="navi-loading-text">저장 중입니다.<br>잠시만 기다려주세요.</p></div>';
    document.body.appendChild(div);
  }
  function showLoading(message) {
    _injectSpinnerStyle();
    _ensureOverlay();
    var textEl = document.querySelector('#navi-loading-overlay .navi-loading-text');
    if (textEl) {
      textEl.innerHTML = (message || '처리 중입니다.<br>잠시만 기다려주세요.');
    }
    document.getElementById('navi-loading-overlay').classList.add('navi-loading-show');
    _lockedElements = [];
    var targets = document.querySelectorAll('button, a, select, input[type="button"], input[type="submit"]');
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      if (el.disabled || el.getAttribute('data-was-disabled') === 'true') {
        el.setAttribute('data-was-disabled', 'true');
        continue;
      }
      el.disabled = true;
      el.setAttribute('data-navi-locked', 'true');
      el.style.opacity = '0.4';
      el.style.cursor  = 'not-allowed';
      _lockedElements.push(el);
    }
    if (_loadingTimer) clearTimeout(_loadingTimer);
    _loadingTimer = setTimeout(function() {
      hideLoading();
      showAlert('요청 시간이 초과되었습니다.<br>다시 시도해 주세요.');
    }, 30000);
  }
  function hideLoading() {
    if (_loadingTimer) {
      clearTimeout(_loadingTimer);
      _loadingTimer = null;
    }
    var el = document.getElementById('navi-loading-overlay');
    if (el) el.classList.remove('navi-loading-show');
    for (var i = 0; i < _lockedElements.length; i++) {
      var locked = _lockedElements[i];
      locked.disabled = false;
      locked.removeAttribute('data-navi-locked');
      locked.style.opacity = '';
      locked.style.cursor  = '';
    }
    _lockedElements = [];
    var marked = document.querySelectorAll('[data-was-disabled="true"]');
    for (var j = 0; j < marked.length; j++) {
      marked[j].removeAttribute('data-was-disabled');
    }
  }
  function _ensureAlertModal() {
    _injectConfirmStyle();
    if (document.getElementById('navi-alert-overlay')) return;
    var div = document.createElement('div');
    div.id = 'navi-alert-overlay';
    div.style.cssText = [
      'display:none',
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.45)',
      'z-index:999999',
      'align-items:center',
      'justify-content:center'
    ].join(';');
    div.innerHTML = [
      '<div class="navi-confirm-box">',
      '  <div class="navi-confirm-icon" id="navi-alert-icon">ℹ️</div>',
      '  <div class="navi-confirm-title" id="navi-alert-title"></div>',
      '  <div class="navi-confirm-desc"  id="navi-alert-desc"></div>',
      '  <div class="navi-confirm-btns">',
      '    <button class="navi-confirm-btn-stay" id="navi-alert-ok" style="min-width:100px;">확인</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(div);
  }
  function showAlert(message, onOk, options) {
    options = options || {};
    _ensureAlertModal();
    var overlay = document.getElementById('navi-alert-overlay');
    var iconEl  = document.getElementById('navi-alert-icon');
    var titleEl = document.getElementById('navi-alert-title');
    var descEl  = document.getElementById('navi-alert-desc');
    if (options.title) {
      titleEl.innerHTML = options.title;
      descEl.innerHTML  = message || '';
    } else {
      titleEl.innerHTML = '';
      descEl.innerHTML  = message || '';
    }
    iconEl.innerHTML = options.icon || 'ℹ️';
    overlay.style.display = 'flex';
    var _autoCloseTimer = null;
    if (options.autoClose && typeof options.autoClose === 'number') {
      _autoCloseTimer = setTimeout(function() {
        overlay.style.display = 'none';
        if (typeof onOk === 'function') onOk();
      }, options.autoClose);
    }
    document.getElementById('navi-alert-ok').onclick = function() {
      if (_autoCloseTimer) {
        clearTimeout(_autoCloseTimer);
        _autoCloseTimer = null;
      }
      overlay.style.display = 'none';
      if (typeof onOk === 'function') onOk();
    };
  }
  function _ensureConfirmDialogModal() {
    _injectConfirmStyle();
    if (document.getElementById('navi-dialog-overlay')) return;
    var div = document.createElement('div');
    div.id = 'navi-dialog-overlay';
    div.style.cssText = [
      'display:none',
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.45)',
      'z-index:999999',
      'align-items:center',
      'justify-content:center'
    ].join(';');
    div.innerHTML = [
      '<div class="navi-confirm-box">',
      '  <div class="navi-confirm-icon" id="navi-dialog-icon">❓</div>',
      '  <div class="navi-confirm-title" id="navi-dialog-title"></div>',
      '  <div class="navi-confirm-desc"  id="navi-dialog-desc"></div>',
      '  <div class="navi-confirm-btns">',
      '    <button class="navi-confirm-btn-leave" id="navi-dialog-cancel">취소</button>',
      '    <button class="navi-confirm-btn-stay"  id="navi-dialog-ok">확인</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(div);
  }
  function showConfirmDialog(message, onOk, onCancel, options) {
    options = options || {};
    _ensureConfirmDialogModal();
    var overlay = document.getElementById('navi-dialog-overlay');
    var iconEl  = document.getElementById('navi-dialog-icon');
    var titleEl = document.getElementById('navi-dialog-title');
    var descEl  = document.getElementById('navi-dialog-desc');
    if (options.title) {
      titleEl.innerHTML = options.title;
      descEl.innerHTML  = message || '';
    } else {
      titleEl.innerHTML = '';
      descEl.innerHTML  = message || '';
    }
    iconEl.innerHTML = options.icon || '❓';
    document.getElementById('navi-dialog-ok').textContent     = options.okLabel     || '확인';
    document.getElementById('navi-dialog-cancel').textContent = options.cancelLabel || '취소';
    overlay.style.display = 'flex';
    document.getElementById('navi-dialog-ok').onclick = function() {
      overlay.style.display = 'none';
      if (typeof onOk === 'function') onOk();
    };
    document.getElementById('navi-dialog-cancel').onclick = function() {
      overlay.style.display = 'none';
      if (typeof onCancel === 'function') onCancel();
    };
  }
  function runScript(fnName, params, options) {
    options = options || {};
    var loadingMsg = options.loadingMessage || '처리 중입니다...';
    var onSuccess  = options.onSuccess  || null;
    var onFailure  = options.onFailure  || null;
    showLoading(loadingMsg);
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
      hideLoading();
      showAlert('google.script.run 환경이 아닙니다.', null, { icon: '⚠️' });
      return;
    }
    google.script.run
      .withSuccessHandler(function(result) {
        hideLoading();
        if (typeof onSuccess === 'function') onSuccess(result);
      })
      .withFailureHandler(function(err) {
        hideLoading();
        if (typeof onFailure === 'function') {
          onFailure(err);
        } else {
          showAlert(
            '오류가 발생했습니다.<br>' + (err && err.message ? err.message : String(err)),
            null,
            { icon: '⚠️' }
          );
        }
      })
      [fnName](params);
  }
  return {
    init        : init,
    update      : update,
    _onNavClick : _onNavClick,
    _onSave     : _onSave,
    _onLogout   : _onLogout,
    showLoading : showLoading,
    hideLoading : hideLoading,
    showAlert         : showAlert,
    showConfirmDialog : showConfirmDialog,
    runScript   : runScript,
    setDirty    : function(val) { _isDirty = !!val; },
    getDirty    : function() { return _isDirty; },
    showConfirm : _showConfirm
  };
})();
