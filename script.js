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
  var totopBtn = document.getElementById('totop');
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
    if (totopBtn){
      var showTop = h.scrollTop > h.clientHeight * 0.6;
      totopBtn.classList.toggle('show', showTop);
      totopBtn.tabIndex = showTop ? 0 : -1;
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

  /* ── mega-menu: índice de capacidades na navegação ─────────────── */
  var mega = document.getElementById('mega');
  var navCapBtn = document.getElementById('navCap');
  if (mega && navCapBtn){
    var closeTimer = null;
    function isDesktopMega(){ return !window.matchMedia('(max-width:860px)').matches; }
    function openMega(){
      clearTimeout(closeTimer);
      mega.classList.add('open');
      navCapBtn.setAttribute('aria-expanded', 'true');
    }
    function closeMega(){
      mega.classList.remove('open');
      navCapBtn.setAttribute('aria-expanded', 'false');
    }
    function scheduleCloseMega(){ closeTimer = setTimeout(closeMega, 160); }
    navCapBtn.addEventListener('mouseenter', function(){ if (isDesktopMega()) openMega(); });
    navCapBtn.addEventListener('mouseleave', function(){ if (isDesktopMega()) scheduleCloseMega(); });
    mega.addEventListener('mouseenter', function(){ clearTimeout(closeTimer); });
    mega.addEventListener('mouseleave', function(){ if (isDesktopMega()) scheduleCloseMega(); });
    navCapBtn.addEventListener('focus', function(){ if (isDesktopMega()) openMega(); });
    navCapBtn.addEventListener('click', function(e){
      // em ecrãs estreitos o painel está oculto (display:none) — o link
      // navega normalmente para a secção #capacidades
      if (!isDesktopMega()) return;
      // se o painel já está aberto (por hover ou por foco de teclado), um
      // clique/Enter no próprio link fecha o painel e navega normalmente
      // para a secção — só o primeiro clique é que abre sem navegar
      if (mega.classList.contains('open')){ closeMega(); return; }
      e.preventDefault();
      openMega();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && mega.classList.contains('open')){
        closeMega();
        navCapBtn.focus();
      }
    });
    document.addEventListener('click', function(e){
      if (mega.classList.contains('open') && !mega.contains(e.target) && !navCapBtn.contains(e.target)){
        closeMega();
      }
    });
    mega.addEventListener('focusout', function(){
      setTimeout(function(){
        if (!mega.contains(document.activeElement) && document.activeElement !== navCapBtn){
          closeMega();
        }
      }, 0);
    });
  }

  /* ── diagramas de mecanismo: construção seletiva ao scroll ──────
     Só nas figuras marcadas com [data-mech] — a maioria dos diagramas
     do site é estática por escolha. A animação revela cada nó/seta/
     ramo do mecanismo pela ordem real do fluxo (data-i), nunca por
     decoração; respeita sempre "reduce" e a ausência de IO. ────── */
  var mechEls = document.querySelectorAll('[data-mech]');
  if (mechEls.length){
    if (reduce || !('IntersectionObserver' in window)){
      mechEls.forEach(function(el){ el.classList.add('mech-in'); });
    } else {
      var mio = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if (!en.isIntersecting) return;
          var el = en.target;
          var items = el.querySelectorAll('[data-i]');
          items.forEach(function(it){
            var i = parseInt(it.getAttribute('data-i'), 10) || 0;
            it.style.transitionDelay = (i * 110) + 'ms';
          });
          el.classList.add('mech-in');
          mio.unobserve(el);
        });
      }, { threshold: 0.35, rootMargin: '0px 0px -10% 0px' });
      mechEls.forEach(function(el){ mio.observe(el); });
    }
  }

  /* ── Fase 6/B: o efeito de scramble nos eyebrows foi removido — lia-se
     como "glitch"/hacker por uma fração de segundo, o oposto do registo
     de precisão que a marca quer transmitir. Os eyebrows já entram em
     cena pela mesma revelação opacity+translateY que cobre o bloco em
     que estão inseridos (.rv, acima) — sem texto a passar por estados
     ilegíveis em momento algum. Nenhuma substituição é necessária aqui. ── */

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
