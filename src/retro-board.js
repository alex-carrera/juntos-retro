import { RETRO_COLUMNS, RETRO_PHASES, PHASE_LABELS, exportRetroMarkdown } from '../shared/retro.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountRetro(root,{getState,dispatch,notify,share,leave,showHistory}){
  const board=getState().retro;
  root.innerHTML=`<section class="retro-intro"><div><div class="eyebrow">DE JUGAR JUNTOS A MEJORAR JUNTOS</div><h1 id="retro-title"></h1><p>Hablemos del squad: lo que nos ayudó, lo que nos frenó y qué haremos diferente.</p></div><span class="retro-save" id="retro-save" role="status"></span></section><div class="retro-toolbar"><div class="retro-phases" id="retro-phases"></div><div class="retro-tools"><button class="ghost" data-action="title">Renombrar</button><button class="secondary" data-action="share">Compartir ↗</button><button class="secondary" data-action="export">Descargar notas ↓</button><button class="ghost" data-action="history">Historial</button><button class="ghost" data-action="leave">Salir</button></div></div><div class="retro-ambience"><div><a class="secondary retro-spotify" id="retro-spotify" href="https://open.spotify.com/artist/7CvWoscqVQJvqb0OcBRQO7" target="_blank" rel="noopener noreferrer" aria-label="Escuchar Hola Beats en Spotify, en otra pestaña">♫ Escuchar Hola Beats ↗</a><span>La música de esta retro · inicia la reproducción en Spotify</span></div></div><div class="retro-presence"><div id="retro-people"></div><span id="retro-votes"></span></div><div class="retro-session-note" id="retro-session-note"></div><div class="retro-search"><label for="retro-filter">Buscar en las tarjetas</label><input type="search" id="retro-filter" placeholder="Una idea, una palabra o un compañero…"/></div><div class="retro-columns">${RETRO_COLUMNS.map(c=>`<section class="retro-column ${c.color}"><header><span class="column-icon">${c.icon}</span><div><h2>${c.title}</h2><p>${c.hint}</p></div><span class="column-count" id="count-${esc(c.id)}">0</span></header><form class="retro-composer" data-column="${esc(c.id)}"><label class="sr-only" for="draft-${esc(c.id)}">Nueva idea en ${c.title}</label><textarea id="draft-${esc(c.id)}" maxlength="600" rows="3" placeholder="Escribe una idea por tarjeta…"></textarea><div><small id="limit-${esc(c.id)}">0 / 600</small><button class="primary" type="submit">Añadir ＋</button></div></form><div class="retro-cards" id="cards-${esc(c.id)}"></div></section>`).join('')}</div><p class="retro-privacy">El enlace privado permite leer y participar en esta retro. Comparte el acceso con tu squad. Las notas no se publican en GitHub.</p>`;
  const $=selector=>root.querySelector(selector);
  $('#retro-spotify').addEventListener('click',()=>{
    notify('Hola Beats se abre en Spotify. Inicia la reproducción allí; cada persona escucha por su cuenta.');
  });
  let currentKey='',pending=new Map();
  const drafts={};
  for(const col of RETRO_COLUMNS){
    const textarea=$(`#draft-${col.id}`);try{textarea.value=localStorage.getItem(`retro-draft:${board.id}:${col.id}`)||'';}catch{}
    drafts[col.id]=textarea;
    textarea.oninput=()=>{$(`#limit-${col.id}`).textContent=`${textarea.value.length} / 600`;try{localStorage.setItem(`retro-draft:${board.id}:${col.id}`,textarea.value);}catch{}};
    $(`form[data-column="${col.id}"]`).onsubmit=e=>{
      e.preventDefault();const text=textarea.value.trim();if(!text)return textarea.focus();
      pending.set(col.id,text);textarea.disabled=true;e.currentTarget.querySelector('button').disabled=true;
      dispatch({type:'retro-add',column:col.id,text});
    };
  }
  $('#retro-filter').oninput=()=>{currentKey='';update();};
  root.addEventListener('click',e=>{
    const button=e.target.closest('button[data-action]');if(!button)return;
    const s=getState(),b=s.retro;
    if(button.dataset.action==='share')share();
    if(button.dataset.action==='history')showHistory();
    if(button.dataset.action==='leave')leave();
    if(button.dataset.action==='phase')dispatch({type:'retro-phase',phase:button.dataset.phase});
    if(button.dataset.action==='vote')dispatch({type:'retro-vote',id:button.dataset.id});
    if(button.dataset.action==='done'){const c=b.cards.find(c=>c.id===button.dataset.id);dispatch({type:'retro-done',id:c.id,version:c.version,done:!c.done});}
    if(button.dataset.action==='edit'){const c=b.cards.find(c=>c.id===button.dataset.id);if(c)edit(c);}
    if(button.dataset.action==='title')rename();
    if(button.dataset.action==='export'){
      const blob=new Blob([exportRetroMarkdown(b)],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`soporte-tier-3-retro-${b.createdAt.slice(0,10)}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Notas descargadas. Incluyen votos, responsables y acciones.');
    }
  });
  function update(){
    const s=getState(),b=s.retro,host=s.hostId===s.selfId,canWrite=['write','action'].includes(b.phase),mine=b.cards.filter(c=>c.voters.includes(s.selfId)).length;
    $('#retro-title').textContent=b.title;
    $('#retro-save').textContent=b.persistence==='demo'?'Demo · notas locales':b.saveStatus==='saved'?'✓ Historial guardado':b.saveStatus==='error'?'⚠ No se pudo guardar · reintentando':'◌ Guardando historial…';
    $('#retro-save').classList.toggle('save-error',b.saveStatus==='error');
    $('#retro-phases').innerHTML=RETRO_PHASES.map((phase,i)=>`<button data-action="phase" data-phase="${phase}" class="retro-phase ${b.phase===phase?'selected':''}" ${host?'':'disabled'} aria-pressed="${b.phase===phase}"><i>${i+1}</i>${PHASE_LABELS[phase]}</button>`).join('');
    root.querySelector('[data-action="title"]').hidden=!host;
    $('#retro-people').innerHTML=s.players.filter(p=>p.connected).map(p=>`<span><i style="background:${p.color}"></i>${esc(p.name)}${p.id===s.selfId?' · tú':''}${p.id===s.hostId?' ♔':''}</span>`).join('');
    $('#retro-votes').textContent=`${Math.max(0,3-mine)} de 3 votos disponibles`;
    const messages={write:'Una idea por tarjeta. Primero escribimos; después escuchamos y votamos.',vote:'Cada persona tiene tres votos. Puedes retirar un voto para cambiar de idea.',action:'Conviertan las ideas en acciones concretas, con una persona responsable.',closed:'Retro cerrada. Pueden consultar el historial o descargar las notas. Quien facilita puede reabrirla.'};
    $('#retro-session-note').textContent=(b.persistence==='demo'?'Esta es una demo local: sus notas no se guardan en el historial. ':'')+messages[b.phase];
    for(const col of RETRO_COLUMNS){
      const form=$(`form[data-column="${col.id}"]`),textarea=drafts[col.id],text=pending.get(col.id);
      if(text&&b.cards.some(c=>c.authorId===s.selfId&&c.column===col.id&&c.text===text)){textarea.value='';pending.delete(col.id);textarea.oninput();}
      textarea.disabled=!canWrite||pending.has(col.id);form.querySelector('button').disabled=textarea.disabled;form.classList.toggle('composer-closed',!canWrite);
    }
    const key=JSON.stringify([b.revision,s.selfId,s.hostId,$('#retro-filter').value]);if(currentKey===key)return;currentKey=key;
    const filter=$('#retro-filter').value.toLocaleLowerCase('es');
    for(const col of RETRO_COLUMNS){
      const cards=b.cards.filter(c=>c.column===col.id);$(`#count-${col.id}`).textContent=cards.length;
      const visible=cards.filter(c=>(c.text+' '+c.authorName+' '+c.assignee).toLocaleLowerCase('es').includes(filter));
      if(b.phase!=='write')visible.sort((a,b)=>b.voters.length-a.voters.length);
      $(`#cards-${col.id}`).innerHTML=visible.map(c=>{
        const edit=(c.authorId===s.selfId||host)&&b.phase!=='closed',voted=c.voters.includes(s.selfId),canVote=['vote','action'].includes(b.phase);
        return `<article class="retro-note ${c.done?'done':''}"><div class="note-text">${esc(c.text)}</div>${c.assignee?`<div class="note-assignee">↳ ${esc(c.assignee)}</div>`:''}<div class="note-author">${esc(c.authorName)}</div><div class="note-actions"><button data-action="vote" data-id="${esc(c.id)}" class="note-vote ${voted?'voted':''}" ${canVote?'':'disabled'} aria-pressed="${voted}" aria-label="${voted?'Retirar voto':'Votar tarjeta'}">♥ ${c.voters.length}</button><span>${c.column==='action'?`<button data-action="done" data-id="${esc(c.id)}" ${edit?'':'disabled'} aria-label="${c.done?'Marcar pendiente':'Marcar acción completada'}">${c.done?'✓ Hecha':'○ Pendiente'}</button>`:''}${edit?`<button data-action="edit" data-id="${esc(c.id)}">Editar ↗</button>`:''}</span></div></article>`;
      }).join('')||`<div class="retro-empty">${filter?'Sin coincidencias.':'La primera idea puede ser la tuya.'}</div>`;
    }
  }
  function modal(html){const layer=document.createElement('div');layer.className='modal-layer';layer.innerHTML=`<div class="modal retro-edit" role="dialog" aria-modal="true">${html}</div>`;document.body.append(layer);layer.querySelector('[data-close]').onclick=()=>layer.remove();return layer;}
  function edit(card){
    const layer=modal(`<h2>Una idea más clara.</h2><form><label for="edit-note">Tarjeta</label><textarea id="edit-note" rows="6" maxlength="600" required>${esc(card.text)}</textarea><label for="edit-column">Columna</label><select id="edit-column">${RETRO_COLUMNS.map(c=>`<option value="${esc(c.id)}" ${c.id===card.column?'selected':''}>${c.title}</option>`).join('')}</select><label for="edit-owner">Responsable de la acción · opcional</label><input id="edit-owner" maxlength="40" value="${esc(card.assignee)}" placeholder="¿Quién dará el siguiente paso?"/><div class="modal-actions"><button type="button" class="ghost danger" id="delete-note">Eliminar</button><button type="button" class="ghost" data-close>Cancelar</button><button class="primary" type="submit">Guardar</button></div></form>`);
    layer.querySelector('textarea').focus();layer.querySelector('form').onsubmit=e=>{e.preventDefault();dispatch({type:'retro-edit',id:card.id,version:card.version,text:layer.querySelector('textarea').value,column:layer.querySelector('select').value,assignee:layer.querySelector('input').value});layer.remove();};
    layer.querySelector('#delete-note').onclick=()=>{dispatch({type:'retro-delete',id:card.id,version:card.version});layer.remove();};
  }
  function rename(){const layer=modal(`<h2>Nombre de la retro</h2><form><label for="retro-new-title">Título</label><input id="retro-new-title" maxlength="80" value="${esc(getState().retro.title)}" required/><div class="modal-actions"><button type="button" class="ghost" data-close>Cancelar</button><button class="primary">Guardar</button></div></form>`);layer.querySelector('input').focus();layer.querySelector('form').onsubmit=e=>{e.preventDefault();dispatch({type:'retro-title',title:layer.querySelector('input').value});layer.remove();};}
  return {update,onError(){pending.clear();update();},destroy(){root.innerHTML='';}};
}
