import { el, reportError, toast } from '../util.js';
import { card, spinner, emptyState } from '../components.js';

export async function render(container, ctx) {
  const { api, profileId } = ctx;
  container.appendChild(spinner());
  let rewrites;
  try {
    rewrites = await api.getRewrites(profileId) || [];
  } catch (e) {
    container.innerHTML = '';
    container.appendChild(card('שגיאה בטעינת שכתובים', '', el('p', {}, e.message)));
    return;
  }
  container.innerHTML = '';

  const listWrap = el('div', {});
  const draw = () => {
    listWrap.innerHTML = '';
    if (!rewrites.length) { listWrap.appendChild(emptyState('לא הוגדרו שכתובי DNS')); return; }
    rewrites.forEach((r) => {
      listWrap.appendChild(el('div', { class: 'list-row' }, [
        el('span', { class: 'list-row__domain' }, r.name),
        el('span', {}, '→'),
        el('span', { class: 'list-row__domain' }, r.content),
        el('button', {
          class: 'btn btn--ghost btn--sm',
          onclick: async () => {
            try { await api.removeRewrite(profileId, r.id); rewrites.splice(rewrites.indexOf(r), 1); draw(); toast('הוסר', 'success'); }
            catch (e) { reportError(e); }
          },
        }, 'הסר'),
      ]));
    });
  };
  draw();

  const nameInput = el('input', { placeholder: 'domain.local', style: 'direction:ltr;text-align:left' });
  const contentInput = el('input', { placeholder: 'IP או דומיין יעד (192.168.1.10)', style: 'direction:ltr;text-align:left' });
  const add = async () => {
    const name = nameInput.value.trim();
    const content = contentInput.value.trim();
    if (!name || !content) { toast('יש למלא שם ויעד', 'error'); return; }
    try {
      const created = await api.addRewrite(profileId, name, content);
      rewrites.push({ id: created?.id || created, name, content });
      nameInput.value = ''; contentInput.value = '';
      draw();
      toast('נוסף שכתוב', 'success');
    } catch (e) { reportError(e); }
  };

  container.appendChild(card(
    '🔀 שכתובי DNS (Rewrites)',
    'הפניית דומיין פנימי (כמו router.local) לכתובת IP או דומיין אחר - שימושי לרשת הבית',
    el('div', {}, [
      el('div', { class: 'inline-form', style: 'margin-bottom:14px' }, [
        el('div', { class: 'field' }, [el('label', {}, 'דומיין'), nameInput]),
        el('div', { class: 'field' }, [el('label', {}, 'יעד'), contentInput]),
        el('button', { class: 'btn', onclick: add }, 'הוסף'),
      ]),
      listWrap,
    ]),
  ));
}
