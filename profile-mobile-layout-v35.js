(() => {
  const style=document.createElement('style');
  style.textContent=`
    @media(max-width:560px){
      html,body{
        max-width:100%;
        overflow-x:hidden;
      }
      .app{
        width:100%;
        max-width:100vw;
      }
      #profile,
      #fitnessProfileContent,
      #fitnessProfileContent > *,
      #fitnessProfileContent .fitness-grid,
      #fitnessProfileContent .fitness-card,
      #fitnessProfileContent .fitness-fields,
      #fitnessProfileContent .fitness-field,
      #fitnessProfileContent .weight-add{
        min-width:0!important;
        max-width:100%!important;
      }
      #profile,
      #fitnessProfileContent{
        width:100%;
        overflow-x:hidden;
      }
      #fitnessProfileContent .weight-add{
        grid-template-columns:1fr!important;
        gap:10px!important;
        width:100%;
      }
      #fitnessProfileContent .weight-add .fitness-field{
        width:100%;
      }
      #fitnessProfileContent .weight-add .fitness-field label{
        display:block;
        width:100%;
        line-height:1.25;
      }
      #fitnessProfileContent input,
      #fitnessProfileContent select{
        box-sizing:border-box;
        min-width:0!important;
        max-width:100%!important;
      }
      #fitnessProfileContent .weight-add input{
        display:block;
        width:100%!important;
        height:44px;
        margin:0;
        font-size:16px!important;
      }
      #fitnessProfileContent .weight-add input[type="date"]{
        -webkit-appearance:none;
        appearance:none;
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        text-align:left;
        padding:10px 12px;
        font-size:16px!important;
      }
      #fitnessProfileContent .weight-add input[type="date"]::-webkit-date-and-time-value{
        margin:0;
        min-width:0;
        min-height:0;
        text-align:left;
      }
      #fitnessProfileContent .weight-add .btn{
        grid-column:auto!important;
        width:100%;
        max-width:100%;
      }
    }
  `;
  document.head.appendChild(style);
})();
