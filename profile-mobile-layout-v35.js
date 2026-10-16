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
        box-sizing:border-box;
        display:block;
        min-width:0;
        max-width:100%;
        width:100%;
        height:44px;
        margin:0;
      }
      #fitnessProfileContent .weight-add input[type="date"]{
        -webkit-appearance:none;
        appearance:none;
        text-align:left;
        padding:10px 12px;
        font:inherit;
      }
      #fitnessProfileContent .weight-add input[type="date"]::-webkit-date-and-time-value{
        margin:0;
        min-height:0;
        text-align:left;
      }
      #fitnessProfileContent .weight-add .btn{
        grid-column:auto!important;
        width:100%;
      }
    }
  `;
  document.head.appendChild(style);
})();
