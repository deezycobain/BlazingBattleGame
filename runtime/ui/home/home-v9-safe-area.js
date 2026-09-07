(()=>{
'use strict';

const STYLE_ID='bb-home-v9-safe-area-style';
if(document.getElementById(STYLE_ID))return;

const style=document.createElement('style');
style.id=STYLE_ID;
style.textContent=`
@media (min-width:621px){
  #bbHomeApproved.bb-home-v9 .bb-home-v4-dock{
    transform:translateY(-4px)!important;
  }
}
`;
document.head.appendChild(style);
})();
