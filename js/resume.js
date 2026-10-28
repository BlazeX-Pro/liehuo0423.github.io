/**
 * 首页「在线简历」原地翻页
 *
 * 设计原则：
 * - 内容 100% 来自 Markdown 渲染结果，本脚本只做「分组 + 显隐」，不生成任何正文；
 * - 以每个 h3 标题为分页边界，h3 之前的内容（章节快捷导航）保持常驻；
 * - 无 JS 环境自动降级为普通长页滚动，内容永不丢失。
 *
 * 页面结构约定（来自 source/index/index.md）：
 *   h2#在线简历 → 章节快捷导航(p) → h3 章节一 → … → h3 章节N → <center> 页脚链接
 */
(function () {
  'use strict';

  // ---------- 1. 定位简历区域（仅首页有 h2#在线简历） ----------
  var heading = document.getElementById('在线简历');
  if (!heading || heading.tagName !== 'H2') return;

  var nodes = [];
  var el = heading.nextElementSibling;
  while (el) {
    if (el.tagName === 'CENTER') break; // <center> 页脚链接不参与翻页
    nodes.push(el);
    el = el.nextElementSibling;
  }

  // ---------- 2. 按 h3 切页 ----------
  var pages = [];
  var quickNav = [];
  var current = null;
  nodes.forEach(function (node) {
    if (node.tagName === 'H3') {
      current = [node];
      pages.push(current);
    } else if (current) {
      current.push(node);
    } else {
      quickNav.push(node); // 第一个 h3 之前的元素（锚点快捷导航）
    }
  });
  if (!pages.length) return;

  // ---------- 3. 注入样式（细边框 + 透明底色，与主题纸片风一致，暗色模式友好） ----------
  var style = document.createElement('style');
  style.textContent = [
    '.mr-toolbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5em;margin:1.2em 0 .6em;padding:.6em .9em;border:1px solid rgba(127,127,127,.4);border-radius:10px}',
    '.mr-title{font-weight:bold;font-size:1em}',
    '.mr-btn{cursor:pointer;border:1px solid rgba(127,127,127,.5);background:transparent;color:inherit;border-radius:6px;padding:.3em .9em;font-size:.92em;margin:0 .2em;font-family:inherit}',
    '.mr-btn:disabled{opacity:.35;cursor:not-allowed}',
    '.mr-btn:hover:not(:disabled){background:rgba(127,127,127,.15)}',
    '.mr-indicator{font-size:.92em;opacity:.8}',
    '.mr-page{display:none}',
    '.mr-page.mr-active{display:block;animation:mr-fade .25s ease}',
    '@keyframes mr-fade{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}',
    '.mr-dots{text-align:center;margin:.4em 0 1em}',
    '.mr-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:rgba(127,127,127,.4);margin:0 4px;cursor:pointer}',
    '.mr-dot.mr-active{background:currentColor;transform:scale(1.2)}'
  ].join('');
  document.head.appendChild(style);

  // ---------- 4. 把每组元素包进 .mr-page 容器 ----------
  var pageEls = pages.map(function (group) {
    var wrap = document.createElement('div');
    wrap.className = 'mr-page';
    group[0].parentNode.insertBefore(wrap, group[0]);
    group.forEach(function (node) { wrap.appendChild(node); });
    return wrap;
  });
  var total = pageEls.length;

  // ---------- 5. 工具栏：标题 + 上一页/下一页 + 页码 ----------
  var toolbar = document.createElement('div');
  toolbar.className = 'mr-toolbar';

  var title = document.createElement('span');
  title.className = 'mr-title';
  title.textContent = ('').trim();

  var prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'mr-btn';
  prev.textContent = '‹ 上一页';

  var indicator = document.createElement('span');
  indicator.className = 'mr-indicator';

  var next = document.createElement('button');
  next.type = 'button';
  next.className = 'mr-btn';
  next.textContent = '下一页 ›';

  var controls = document.createElement('span');
  controls.appendChild(prev);
  controls.appendChild(indicator);
  controls.appendChild(next);

  toolbar.appendChild(title);
  toolbar.appendChild(controls);
  heading.parentNode.insertBefore(toolbar, heading.nextSibling);

  // ---------- 6. 圆点导航（标题取 h3 冒号/竖线/间隔点前的简称） ----------
  var dotsBar = document.createElement('div');
  dotsBar.className = 'mr-dots';
  var dots = pages.map(function (group, i) {
    var text = (group[0].textContent || '').trim();
    var dot = document.createElement('span');
    dot.className = 'mr-dot';
    dot.title = text.split(/[：:｜|·]/)[0].trim() || text;
    dot.addEventListener('click', function () { show(i); });
    dotsBar.appendChild(dot);
    return dot;
  });
  toolbar.parentNode.insertBefore(dotsBar, toolbar.nextSibling);

  // ---------- 7. 翻页核心 ----------
  var cur = 0;

  function show(i) {
    if (i < 0 || i >= total) return;
    cur = i;
    pageEls.forEach(function (p, k) { p.classList.toggle('mr-active', k === i); });
    dots.forEach(function (d, k) { d.classList.toggle('mr-active', k === i); });
    indicator.textContent = (i + 1) + ' / ' + total;
    prev.disabled = (i === 0);
    next.disabled = (i === total - 1);
  }

  prev.addEventListener('click', function () { show(cur - 1); });
  next.addEventListener('click', function () { show(cur + 1); });

  // ---------- 8. 章节快捷导航：点击翻到对应页并滚动到位 ----------
  function jumpToId(id) {
    var target = document.getElementById(id);
    if (!target) return false;
    for (var i = 0; i < pageEls.length; i++) {
      if (pageEls[i].contains(target)) {
        show(i);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
    }
    return false;
  }

  quickNav.forEach(function (node) {
    if (!node.addEventListener) return;
    node.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== node && t.tagName !== 'A') t = t.parentNode;
      if (!t || t.tagName !== 'A') return;
      var href = t.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      var id = decodeURIComponent(href.slice(1));
      if (id && jumpToId(id)) e.preventDefault();
    });
  });

  // ---------- 9. 键盘翻页（简历在视口内时响应 ← →） ----------
  document.addEventListener('keydown', function (e) {
    var rect = toolbar.getBoundingClientRect();
    var inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;
    if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });

  // ---------- 10. 初始状态：支持 #锚点 深链接，否则显示第一页 ----------
  var hash = location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
  if (!(hash && jumpToId(hash))) show(0);
})();
