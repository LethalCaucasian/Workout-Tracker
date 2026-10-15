(() => {
  if(typeof state === 'undefined') return;

  const SECTION_KEYS = ['warmupEnabled','cooldownEnabled','cooldowns','rest'];
  const clone = value => JSON.parse(JSON.stringify(value));

  document.addEventListener('click', event => {
    const saveButton = event.target.closest?.('#editorSave');
    if(!saveButton) return;

    const day = Number(state.selectedDay) || 1;
    const before = state.customPlans?.[day];
    if(!before) return;

    const preserved = {};
    SECTION_KEYS.forEach(key => {
      if(Object.prototype.hasOwnProperty.call(before,key)) preserved[key] = clone(before[key]);
    });
    if(!Object.keys(preserved).length) return;

    setTimeout(() => {
      const current = state.customPlans?.[day];
      if(!current) return;
      Object.assign(current,preserved);
      if(typeof save === 'function') save();
      if(typeof renderToday === 'function') renderToday();
    },0);
  }, true);
})();
