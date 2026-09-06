(function(){
  "use strict";
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── reveal on scroll ─────────────────────────────────────── */
  var els = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window) || reduce) {
    els.forEach(function(e){ e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en, i){
        if (!en.isIntersecting) return;
        var el = en.target;
        el.style.transitionDelay = Math.min(i, 3) * 55 + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    els.forEach(function(e){ io.observe(e); });
  }

  /* ── progress bar + scroll-spy + parallax (um único ticker) ──── */
  var prog = document.getElementById('prog');
  // #nav e #rail apontam para os mesmos 12 destinos, pela mesma ordem — o
  // índice "ativo" é calculado uma única vez a partir de #nav (a lista
  // canónica) e depois aplicado às duas listas, para não haver dois
  // conjuntos de secções a competerem pelo mesmo índice.
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('#nav a'));
  var railLinks = Array.prototype.slice.call(document.querySelectorAll('#rail a'));
  var secs = navLinks.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  var parallaxEls = reduce ? [] : Array.prototype.slice.call(document.querySelectorAll('.hero .art'));
  var ticking = false;
  function update(){
    ticking = false;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    var probe = h.scrollTop + h.clientHeight * 0.28;
    var active = -1;
    for (var i = 0; i < secs.length; i++){ if (secs[i] && secs[i].offsetTop <= probe) active = i; }
    navLinks.forEach(function(a, i){
      var isActive = i === active;
      a.classList.toggle('on', isActive);
      if (isActive) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    railLinks.forEach(function(a, i){ a.classList.toggle('on', i === active); });
    var totop = document.getElementById('totop');
    if (totop){
      var showTop = h.scrollTop > h.clientHeight * 0.6;
      totop.classList.toggle('show', showTop);
      totop.tabIndex = showTop ? 0 : -1;
    }
    if (parallaxEls.length){
      parallaxEls.forEach(function(el){
        var r = el.getBoundingClientRect();
        var mid = r.top + r.height / 2 - h.clientHeight / 2;
        var shift = Math.max(-24, Math.min(24, mid * -0.035));
        el.style.transform = 'translateY(' + shift + 'px)';
      });
    }
  }
  function onScroll(){ if (!ticking){ ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('load', update);
  update();

  /* ── rail nav: indicador decorativo — clique ainda funciona para rato,
     mas já não é um link (sem href), por isso o "salto" é feito aqui ──── */
  document.querySelectorAll('#rail a[data-target]').forEach(function(a){
    a.addEventListener('click', function(){
      var target = document.querySelector(a.getAttribute('data-target'));
      if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ── nav mobile toggle ─────────────────────────────────────── */
  var navToggle = document.getElementById('navToggle');
  var navEl = document.getElementById('nav');
  if (navToggle && navEl){
    function closeMobileNav(returnFocus){
      navEl.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Abrir menu');
      if (returnFocus) navToggle.focus();
    }
    navToggle.addEventListener('click', function(){
      var open = navEl.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
    navEl.addEventListener('click', function(e){
      if (e.target.tagName === 'A'){
        closeMobileNav(false);
      }
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && navEl.classList.contains('open')){
        closeMobileNav(true);
      }
    });
  }

  /* ── back to top ───────────────────────────────────────────── */
  var totopBtn = document.getElementById('totop');
  if (totopBtn){
    totopBtn.addEventListener('click', function(){
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ── contadores animados (stat b com data-count) ─────────────── */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length){
    if (reduce || !('IntersectionObserver' in window)){
      // sem animação: mostra já o valor final, nunca fica preso em "0"
      counters.forEach(function(el){
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        el.textContent = target + suffix;
      });
    } else {
      var cio = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if (!en.isIntersecting) return;
          var el = en.target;
          var target = parseFloat(el.getAttribute('data-count'));
          var suffix = el.getAttribute('data-suffix') || '';
          var dur = 1100, start = null;
          function step(ts){
            if (!start) start = ts;
            var p = Math.min(1, (ts - start) / dur);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (Math.round(target * eased * 10) / 10) + suffix;
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
          cio.unobserve(el);
        });
      }, { threshold: 0.5 });
      counters.forEach(function(c){ cio.observe(c); });
    }
  }

  /* ── hero: rede de sensores animada em canvas ─────────────────── */
  var canvas = document.getElementById('netfx');
  if (canvas && !reduce){
    var ctx = canvas.getContext('2d');
    var wrap = canvas.parentElement;
    var pts = [], W, H, DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize(){
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
      var n = Math.max(18, Math.min(46, Math.round((W*H)/26000)));
      pts = [];
      for (var i=0;i<n;i++){
        pts.push({
          x: Math.random()*W, y: Math.random()*H,
          vx: (Math.random()-0.5)*0.18, vy: (Math.random()-0.5)*0.18,
          r: 1 + Math.random()*1.6
        });
      }
    }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(wrap); else window.addEventListener('resize', resize);
    resize();

    var maxDist = 130;
    function frame(){
      ctx.clearRect(0,0,W,H);
      for (var i=0;i<pts.length;i++){
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (var a=0; a<pts.length; a++){
        for (var b=a+1; b<pts.length; b++){
          var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y;
          var d = Math.sqrt(dx*dx+dy*dy);
          if (d < maxDist){
            ctx.strokeStyle = 'rgba(232,118,58,' + (0.14 * (1 - d/maxDist)) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pts[a].x,pts[a].y); ctx.lineTo(pts[b].x,pts[b].y); ctx.stroke();
          }
        }
      }
      for (var i2=0;i2<pts.length;i2++){
        var p2 = pts[i2];
        ctx.beginPath(); ctx.arc(p2.x,p2.y,p2.r,0,Math.PI*2);
        ctx.fillStyle = 'rgba(240,146,95,.55)'; ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ── decodificação de texto (scramble) nos eyebrows ────────────── */
  if (!reduce && 'IntersectionObserver' in window){
    var SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%/=-·';
    function scramble(el){
      var final = el.textContent;
      var frame = 0, total = 14;
      (function step(){
        var reveal = Math.floor((frame / total) * final.length);
        var out = '';
        for (var i = 0; i < final.length; i++){
          out += (i < reveal || final[i] === ' ' || final[i] === '—') ? final[i] : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
        }
        el.textContent = out;
        frame++;
        if (frame <= total) requestAnimationFrame(step); else el.textContent = final;
      })();
    }
    var eio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        scramble(en.target);
        eio.unobserve(en.target);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.eyebrow').forEach(function(el){ eio.observe(el); });
  }

  /* ── iniciar avaliação técnica: validação e envio acessíveis ───── */
  var assessForm = document.getElementById('assessForm');
  if (assessForm){
    var statusEl = document.getElementById('assessStatus');
    var submitBtn = document.getElementById('assessSubmit');

    function setStatus(kind, msg){
      statusEl.textContent = msg;
      statusEl.className = 'assess-status show ' + kind;
    }

    function validate(){
      var ok = true, firstInvalid = null;
      var required = assessForm.querySelectorAll('[required]');
      for (var i = 0; i < required.length; i++){
        var input = required[i];
        var field = input.closest('.field');
        var valid = input.checkValidity();
        if (field) field.classList.toggle('invalid', !valid);
        input.setAttribute('aria-invalid', valid ? 'false' : 'true');
        if (!valid){ ok = false; if (!firstInvalid) firstInvalid = input; }
      }
      if (firstInvalid) firstInvalid.focus();
      return ok;
    }

    Array.prototype.forEach.call(assessForm.querySelectorAll('[required]'), function(input){
      input.addEventListener('input', function(){
        var field = input.closest('.field');
        if (field && field.classList.contains('invalid') && input.checkValidity()){
          field.classList.remove('invalid');
          input.setAttribute('aria-invalid', 'false');
        }
      });
    });

    assessForm.addEventListener('submit', function(e){
      e.preventDefault();
      if (!validate()){
        setStatus('bad', 'Por favor corrija os campos assinalados antes de enviar.');
        return;
      }
      var action = assessForm.getAttribute('action') || '';
      if (action.indexOf('YOUR_FORM_ID') !== -1){
        setStatus('bad', 'Este formulário ainda não está ligado a um destino de envio. Use o contacto direto ao lado enquanto a configuração é concluída.');
        return;
      }
      submitBtn.disabled = true;
      var data = new FormData(assessForm);
      fetch(action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
        .then(function(res){
          submitBtn.disabled = false;
          if (res.ok){
            setStatus('ok', 'Pedido enviado. Entraremos em contacto para os próximos passos.');
            assessForm.reset();
          } else {
            setStatus('bad', 'Não foi possível enviar agora. Tente novamente ou use o contacto direto ao lado.');
          }
        })
        .catch(function(){
          submitBtn.disabled = false;
          setStatus('bad', 'Não foi possível enviar agora. Tente novamente ou use o contacto direto ao lado.');
        });
    });
  }
})();
