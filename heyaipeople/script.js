(function(){
  var t=document.querySelector('.navtoggle'),n=document.querySelector('.navlinks');
  if(t&&n){t.addEventListener('click',function(){n.classList.toggle('open')});
    n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open')})});}
})();
