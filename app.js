'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = $('.site-header');
  const hero = $('.hero');
  const art = $('.hero-art');
  const cut = $('.cut-story');
  const panel = $('.technical-panel');
  const buttons = [...document.querySelectorAll('.dimension-button')];
  const dimensions = [
    ['THICKNESS', 'Measured across the board’s narrow edge.'],
    ['WIDTH', 'Measured across the broad face of the board.'],
    ['LENGTH', 'Measured from one end of the board to the other.']
  ];
  let selectedDimension = 0;
  const setDimension = (index) => {
    if (!Number.isInteger(index) || index < 0 || index > 2) return;
    selectedDimension = index;
    panel.dataset.active = String(index);
    buttons.forEach((button, i) => {
      button.classList.toggle('active', i === index);
      button.setAttribute('aria-pressed', String(i === index));
    });
    $('.drawing-current').textContent = dimensions[index][0];
    $('.drawing-description').textContent = dimensions[index][1];
    $('.drawing-count').replaceChildren(document.createTextNode(`0${index + 1} `), Object.assign(document.createElement('i'), {textContent: '/ 03'}));
    $('.drawing-meta span:last-child').textContent = `DIMENSION STUDY — 0${index + 1}`;
  };
  buttons.forEach((button) => button.addEventListener('click', () => setDimension(Number(button.dataset.dimension))));
  let ticking = false;
  const drawScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 80);
    if (!reduceMotion.matches) {
      if (y < hero.offsetHeight + 100) art.style.transform = `translate3d(0,${Math.min(y * .12, 90)}px,0) scale(${1.035 - Math.min(y / 12000, .06)})`;
      const rect = cut.getBoundingClientRect();
      if (window.innerWidth > 800) {
        const progress = Math.max(0, Math.min(1, (86 - rect.top) / Math.max(1, rect.height - window.innerHeight)));
        panel.style.setProperty('--cut-progress', String(progress));
        if (rect.top < 120 && rect.bottom > window.innerHeight * .6) {
          const next = Math.min(2, Math.floor(progress * 3));
          if (next !== selectedDimension) setDimension(next);
        }
      }
    }
    ticking = false;
  };
  const queueScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(drawScroll); } };
  window.addEventListener('scroll', queueScroll, {passive: true});
  window.addEventListener('resize', queueScroll, {passive: true});
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) art.style.transform = '';
    queueScroll();
  });
  drawScroll();
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold: .08});
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
    document.documentElement.classList.add('has-reveal');
  }

  const form = $('#enquiry-form');
  const dialog = $('#enquiry-dialog');
  const summary = $('#enquiry-summary');
  const status = $('#enquiry-status');
  const numericKeys = ['thickness', 'width', 'length', 'quantity'];
  const textKeys = ['destination', 'name', 'email'];
  const validateEnquiry = (input) => {
    if (!input || typeof input !== 'object') throw new Error('Please provide your enquiry details.');
    const data = {};
    numericKeys.forEach((key) => {
      const number = Number(input[key]);
      const min = key === 'quantity' ? .01 : .1;
      if (!Number.isFinite(number) || number < min) throw new Error(`Please enter a valid ${key}.`);
      data[key] = number;
    });
    textKeys.forEach((key) => {
      if (typeof input[key] !== 'string' || !input[key].trim()) throw new Error(`Please enter your ${key}.`);
      data[key] = input[key].trim();
    });
    if (data.destination.length > 150 || data.name.length > 120 || data.email.length > 254) throw new Error('Please shorten the contact details.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Please enter a valid email address.');
    data.notes = typeof input.notes === 'string' ? input.notes.trim() : '';
    if (data.notes.length > 2000) throw new Error('Please keep additional requirements under 2,000 characters.');
    return data;
  };
  const makeEnquiryText = (data) => [
    'To ZHONGXINWOOD', '', 'Enquiry: Okoume sawn timber', 'Species: Aucoumea klaineana', '',
    `Requested thickness: ${data.thickness} mm`, `Requested width: ${data.width} mm`,
    `Requested length: ${data.length} mm`, `Requested quantity: ${data.quantity} m³`,
    `Destination / port: ${data.destination}`, '',
    ...(data.notes ? [`Additional requirements: ${data.notes}`, ''] : []),
    'Please confirm availability, specifications, packing and quotation.', '',
    `Name: ${data.name}`, `Email: ${data.email}`
  ].join('\n');
  let focusBeforeDialog = null;
  const prepareEnquiry = (input) => {
    const data = validateEnquiry(input);
    const text = makeEnquiryText(data);
    Object.entries(data).forEach(([key, value]) => { if (form.elements.namedItem(key)) form.elements.namedItem(key).value = String(value); });
    summary.value = text;
    status.textContent = '';
    if (!dialog.open) { focusBeforeDialog = document.activeElement; dialog.showModal(); }
    return {status: 'prepared_not_sent', enquiry: text};
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try { prepareEnquiry(Object.fromEntries(new FormData(form))); }
    catch (error) { $('.form-note').textContent = error.message; }
  });
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { if (focusBeforeDialog && typeof focusBeforeDialog.focus === 'function') focusBeforeDialog.focus(); });
  $('#copy-enquiry').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(summary.value);
      status.textContent = 'Copied. Your enquiry is ready to share.';
    } catch {
      summary.focus(); summary.select();
      status.textContent = 'Text selected. Use your device’s Copy command, or download the file.';
    }
  });
  $('#download-enquiry').addEventListener('click', () => {
    const blob = new Blob([summary.value], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), {href: url, download: 'ZHONGXINWOOD-okoume-enquiry.txt'});
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    status.textContent = 'Your download has started. This enquiry has not been sent.';
  });
  const context = document.modelContext;
  if (context?.registerTool) {
    const lifecycle = new AbortController();
    const properties = Object.fromEntries(numericKeys.map((key) => [key, {type: 'number', minimum: key === 'quantity' ? .01 : .1, description: key === 'quantity' ? 'Requested volume in cubic metres' : `Requested ${key} in millimetres`}])) ;
    Object.assign(properties, {destination: {type:'string',minLength:1,maxLength:150}, name: {type:'string',minLength:1,maxLength:120}, email: {type:'string',format:'email',maxLength:254}, notes: {type:'string',maxLength:2000}});
    try {
      Promise.resolve(context.registerTool({
        name: 'prepare_timber_enquiry', title: 'Prepare a timber enquiry',
        description: 'Fill the visible enquiry form and open a review of the requested Okoume timber dimensions. Stages text for copying or downloading; does not send or persist any enquiry.',
        inputSchema: {type:'object',properties,required:[...numericKeys,...textKeys],additionalProperties:false},
        annotations: {readOnlyHint:false,untrustedContentHint:true},
        execute: prepareEnquiry
      }, {signal:lifecycle.signal})).catch(() => {});
      window.addEventListener('pagehide', (event) => { if (!event.persisted) lifecycle.abort(); }, {once:true});
    } catch { /* The page works independently of optional browser tools. */ }
  }
})();
