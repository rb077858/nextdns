import { el, reportError } from './util.js';

export function card(title, desc, content, extraClass = '') {
  return el('div', { class: `card ${extraClass}` }, [
    title ? el('h3', { class: 'card__title' }, title) : null,
    desc ? el('p', { class: 'card__desc' }, desc) : null,
    content,
  ]);
}

export function skeletonLines(n = 4) {
  const wrap = el('div', {});
  for (let i = 0; i < n; i++) {
    wrap.appendChild(el('div', { class: 'skeleton', style: `height:18px;margin-bottom:12px;width:${70 + Math.random() * 25}%` }));
  }
  return wrap;
}

export function toggleSwitch({ checked, disabled = false, onChange }) {
  const input = el('input', { type: 'checkbox' });
  input.checked = !!checked;
  input.disabled = !!disabled;
  const label = el('label', { class: 'switch' }, [
    input,
    el('span', { class: 'switch__track' }),
  ]);
  input.addEventListener('change', async () => {
    const prev = !input.checked; // the value before this click
    input.disabled = true;
    try {
      await onChange(input.checked);
    } catch (e) {
      input.checked = prev;
      reportError(e);
    } finally {
      input.disabled = disabled;
    }
  });
  return { node: label, input };
}

export function settingRow({ title, desc, checked, disabled, onChange }) {
  const { node: switchNode } = toggleSwitch({ checked, disabled, onChange });
  return el('div', { class: 'setting-row' }, [
    el('div', { class: 'setting-row__text' }, [
      el('strong', {}, title),
      desc ? el('span', {}, desc) : null,
    ]),
    switchNode,
  ]);
}

export function statCard(label, value) {
  return el('div', { class: 'card stat-card' }, [
    el('span', { class: 'stat-card__label' }, label),
    el('span', { class: 'stat-card__value' }, String(value)),
  ]);
}

export function tabsBar(tabs, activeKey, onSelect) {
  const bar = el('div', { class: 'tabs' });
  tabs.forEach((t) => {
    const btn = el('button', {
      class: `tab ${t.key === activeKey ? 'active' : ''}`,
      onclick: () => onSelect(t.key),
    }, `${t.icon} ${t.label}`);
    bar.appendChild(btn);
  });
  return bar;
}

export function hintBanner(html) {
  return el('div', { class: 'hint-banner' }, [el('span', {}, '💡'), el('div', { html })]);
}

export function emptyState(text) {
  return el('div', { class: 'empty-state' }, text);
}

export function confirmModal({ title, body, confirmLabel = 'אישור', danger = false }) {
  return new Promise((resolve) => {
    const backdrop = el('div', { class: 'modal-backdrop' });
    const close = (val) => { backdrop.remove(); resolve(val); };
    const modal = el('div', { class: 'modal' }, [
      el('h3', {}, title),
      el('p', { html: body }),
      el('div', { class: 'modal__actions' }, [
        el('button', { class: 'btn btn--ghost', onclick: () => close(false) }, 'ביטול'),
        el('button', { class: `btn ${danger ? 'btn--danger' : ''}`, onclick: () => close(true) }, confirmLabel),
      ]),
    ]);
    backdrop.appendChild(modal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
    document.body.appendChild(backdrop);
  });
}

export function spinner() {
  return el('div', { class: 'loader-page' }, [el('div', { class: 'spinner spinner--dark' }), 'טוען...']);
}
