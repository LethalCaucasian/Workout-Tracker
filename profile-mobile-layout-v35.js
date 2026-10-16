(() => {
  const style=document.createElement('style');
  style.textContent=`
    @media(max-width:560px){
      #fitnessProfileContent .weight-add{
        grid-template-columns:1fr!important;
        gap:10px!important;
      }
      #fitnessProfileContent .weight-add .fitness-field{
        min-width:0;
        width:100%;
      }
      #fitnessProfileContent .weight-add .fitness-field label{
        display:block;
        width:100%;
        line-height:1.25;
      }
      #fitnessProfileContent .weight-add input{
        min-width:0;
        width:100%;
      }
      #fitnessProfileContent .weight-add .btn{
        grid-column:auto!important;
        width:100%;
      }
    }
  `;
  document.head.appendChild(style);
})();
