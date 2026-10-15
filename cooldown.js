(() => {
  const baseGetDraft = getDraft;
  getDraft = function(){
    const d = baseGetDraft();
    if(typeof d.cooldown !== 'string') d.cooldown = '';
    return d;
  };

  function injectCooldown(){
    const grid = document.querySelector('#todayContent .bottomgrid');
    if(!grid || grid.querySelector('.cooldown-card')) return;

    const d = getDraft();
    const card = document.createElement('div');
    card.className = 'card cooldown-card';

    const title = document.createElement('h3');
    title.textContent = '🧘 Cooldown';

    const area = document.createElement('textarea');
    area.placeholder = 'e.g. 25 BW decline push-ups, stretching, easy bike...';
    area.value = d.cooldown || '';
    area.addEventListener('input', () => {
      getDraft().cooldown = area.value;
      save();
    });

    card.append(title, area);

    const notesCard = [...grid.querySelectorAll('.card')].find(c => c.querySelector('h3')?.textContent.includes('Notes'));
    if(notesCard) grid.insertBefore(card, notesCard);
    else grid.appendChild(card);
  }

  const baseRenderToday = renderToday;
  renderToday = function(){
    baseRenderToday();
    injectCooldown();
  };

  const baseSaveWorkout = window.saveWorkout;
  window.saveWorkout = function(){
    const cooldown = getDraft().cooldown || '';
    const before = state.history.length;
    baseSaveWorkout();
    if(state.history.length > before){
      state.history[state.history.length - 1].cooldown = cooldown;
      save();
      renderHistory();
    }
  };

  summaryText = function(h){
    if(!h) return 'No saved workouts yet.';
    const lines = [`${h.date} — Day ${h.day}: ${h.name}`];

    if(h.warmupEntries?.length){
      lines.push('Warm-up:');
      h.warmupEntries.forEach(e => lines.push(`- ${e.name}: ${formatWarmupEntry(e)}`));
    } else if(h.warmup){
      lines.push('Warm-up: complete');
    }

    h.exercises.forEach(e => {
      const sets = e.sets.map(s => e.type === 'sec'
        ? `${s.weight ? `${s.weight} lb × ` : ''}${s.value}s${s.done ? ' ✓' : ''}`
        : `${s.weight ? `${s.weight} lb × ` : ''}${s.value} reps${s.done ? ' ✓' : ''}`
      ).join(' | ');
      lines.push(`${e.name}: ${sets}`);
    });

    if(h.cooldown) lines.push(`Cooldown: ${h.cooldown}`);
    if(h.notes) lines.push(`Notes: ${h.notes}`);
    return lines.join('\n');
  };

  window.copyCurrent = () => {
    const p = selectedPlan(), d = getDraft(), warmups = warmupsForDay(p.day);
    const h = {
      date: d.date,
      day: p.day,
      name: p.name,
      warmup: d.warmup,
      cooldown: d.cooldown || '',
      notes: d.notes,
      warmupEntries: warmups.map((w,i) => ({
        name: w[0],
        type: w[2],
        weight: parseFloat(d.warmupEntries[i].weight) || 0,
        value: parseFloat(d.warmupEntries[i].value) || 0,
        done: d.warmupEntries[i].done
      })),
      exercises: p.exercises.map((ex,i) => ({
        name: ex[0],
        type: ex[3],
        sets: d.sets[i].map(s => ({
          weight: parseFloat(s.weight) || 0,
          value: parseFloat(s.value) || 0,
          done: s.done
        }))
      }))
    };
    copyText(summaryText(h));
  };

  const baseRenderHistory = renderHistory;
  renderHistory = function(){
    baseRenderHistory();
    const items = [...document.querySelectorAll('#historyList .history-item')];
    const history = [...state.history].reverse();

    items.forEach((item, i) => {
      const h = history[i];
      if(!h?.cooldown || item.querySelector('.history-cooldown')) return;

      const row = document.createElement('div');
      row.className = 'history-ex history-cooldown';
      const label = document.createElement('b');
      label.textContent = 'Cooldown:';
      row.append(label, document.createTextNode(` ${h.cooldown}`));

      const notes = [...item.querySelectorAll('.history-ex')].find(el => el.querySelector('b')?.textContent === 'Notes:');
      const toolbar = item.querySelector('.toolbar');
      item.insertBefore(row, notes || toolbar || null);
    });
  };

  renderToday();
  renderHistory();
})();
