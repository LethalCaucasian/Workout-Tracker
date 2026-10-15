(() => {
  function clearUnifiedDaySetup(){
    document.querySelector('.editor-modal #unifiedDaySetup')?.remove();
  }

  if(typeof window.openRoutineBuilder==='function'){
    const baseOpenRoutineBuilder=window.openRoutineBuilder;
    window.openRoutineBuilder=function(...args){
      // The routine editor modal is reused between openings. Remove the
      // injected day-setup panel so app-polish rebuilds it from the newly
      // selected day's custom plan every time the editor opens.
      clearUnifiedDaySetup();
      return baseOpenRoutineBuilder.apply(this,args);
    };
  }

  if(typeof window.selectDay==='function'){
    const baseSelectDay=window.selectDay;
    window.selectDay=function(day){
      const result=baseSelectDay.apply(this,arguments);
      clearUnifiedDaySetup();
      return result;
    };
  }

  window.addEventListener('workout-profile-store-change',clearUnifiedDaySetup);
})();
