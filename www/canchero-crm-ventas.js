/**
 * canchero-crm-ventas.js — Módulo compartido de Ventas / Reportes / WhatsApp para CRMs.
 * Funciona en cualquier CRM de negocio (complejo, profesional, organización, tienda).
 * Inyecta items de menú + páginas y se apoya en la tabla `business_sales` y `restock_requests`.
 *
 * Requisitos: window.supabase client global como `sb`, y variables BIZ / BIZ_EMAIL.
 * Uso: incluir <script src="canchero-crm-ventas.js"></script> al final del CRM.
 */
(function(){
  'use strict';

  var _ownClient = null;
  function _sb(){
    if (window.sb) return window.sb;
    if (window._sb) return window._sb;
    if (_ownClient) return _ownClient;
    try {
      if (window.supabase && window.supabase.createClient) {
        _ownClient = window.supabase.createClient('https://dofbxgqzcvfjpnvcvdjb.supabase.co','sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA');
        return _ownClient;
      }
    } catch(e){}
    return null;
  }
  function _email(){ return window.BIZ_EMAIL || (window.BIZ && window.BIZ.email) || ''; }
  function _biz(){ return window.BIZ || {}; }
  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(v){ return '$' + (Math.round(v)||0).toLocaleString('es-UY'); }

  // ── Inyección de UI ──────────────────────────────────────────────
  function injectUI(){
    if (document.getElementById('cv-page-ventas')) return; // ya inyectado
    var sidebar = document.querySelector('.sidebar-section') || document.getElementById('crm-sidebar');
    var content = document.querySelector('.main-content') || document.querySelector('.content') || document.querySelector('main') || document.body;
    if (!content) return;

    // Items de menú (en la primera sección del sidebar)
    var navHost = document.querySelector('#crm-sidebar .sidebar-section') || document.querySelector('.sidebar-section');
    if (navHost) {
      var mkNav = function(name,icon,label,badge){
        var d = document.createElement('div');
        d.className = 'nav-item';
        d.setAttribute('data-cv-nav', name);
        d.onclick = function(){ window.CRMVentas.show(name, d); };
        d.innerHTML = "<i class='bx "+icon+"'></i> "+label+(badge?(' <span id="'+badge+'" style="display:none;margin-left:auto;background:#ffaa00;color:#000;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:900;"></span>'):'');
        navHost.appendChild(d);
      };
      mkNav('ventas','bx-cart','Ventas');
      mkNav('reportes','bx-line-chart','Reportes');
      mkNav('restock','bx-bell','Avisos de stock','cv-restock-badge');
    }

    // Páginas
    var pages = document.createElement('div');
    pages.innerHTML =
      pageVentas() + pageReportes() + pageRestock();
    // Insertar las páginas como hermanas de las existentes (.page)
    var anchor = document.querySelector('.page');
    if (anchor && anchor.parentElement) {
      while (pages.firstChild) anchor.parentElement.appendChild(pages.firstChild);
    } else {
      content.appendChild(pages);
    }
  }

  function pageVentas(){
    return '<div id="cv-page-ventas" class="page" style="display:none;">' +
      '<h2 style="font-size:20px;font-weight:900;margin-bottom:6px;">Ventas</h2>' +
      '<p style="color:#888;font-size:12px;margin-bottom:14px;">Cargá ventas hechas por WhatsApp, Instagram o presencial. Se suman a tus reportes junto con las de Canchero.</p>' +
      '<div class="card" style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:16px;margin-bottom:16px;">' +
        '<h3 style="font-size:14px;font-weight:800;margin-bottom:12px;">Nueva venta</h3>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">' +
          '<div><label style="font-size:10px;color:#888;font-weight:800;letter-spacing:1px;">PRODUCTO / SERVICIO</label><select id="cv-name" style="'+ipt()+'" onchange="CRMVentas._onProductPick(this)"><option value="">-- Cargando productos... --</option></select></div>' +
          fld('cv-qty','Cantidad','number','1') +
          fld('cv-price','Precio unitario','number') +
          '<div><label style="font-size:10px;color:#888;font-weight:800;letter-spacing:1px;">CANAL</label><select id="cv-channel" style="'+ipt()+'"><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="presencial">Presencial</option><option value="canchero">Canchero</option><option value="otro">Otro</option></select></div>' +
          fld('cv-client','Cliente (nombre)','text') +
          fld('cv-phone','Cliente (tel.)','text') +
        '</div>' +
        '<button onclick="CRMVentas.addSale()" style="margin-top:14px;background:var(--accent,#baff00);color:#000;border:none;border-radius:10px;padding:10px 18px;font-weight:900;cursor:pointer;"><i class="bx bx-check"></i> Registrar venta</button>' +
      '</div>' +
      '<div class="card" style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:8px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="text-align:left;color:#888;font-size:11px;"><th style="padding:8px;">Fecha</th><th>Producto</th><th>Cant</th><th>Total</th><th>Canal</th><th>Cliente</th><th>Estado</th><th></th></tr></thead><tbody id="cv-list"></tbody></table></div>' +
    '</div>';
  }
  function pageReportes(){
    return '<div id="cv-page-reportes" class="page" style="display:none;">' +
      '<h2 style="font-size:20px;font-weight:900;margin-bottom:6px;">Reportes y estadísticas</h2>' +
      '<p style="color:#888;font-size:12px;margin-bottom:14px;">Ventas dentro y fuera de Canchero, por canal y período.</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px;">' +
        kpi('cv-rep-today','VENTAS HOY') + kpi('cv-rep-month','VENTAS MES') + kpi('cv-rep-units','UNIDADES MES') + kpi('cv-rep-avg','TICKET PROM.') +
      '</div>' +
      '<div class="card" style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:14px;margin-bottom:14px;"><h3 style="font-size:14px;font-weight:800;margin-bottom:10px;">Por canal (30 días)</h3><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="text-align:left;color:#888;font-size:11px;"><th style="padding:6px;">Canal</th><th>Ventas</th><th>Unid.</th><th>%</th></tr></thead><tbody id="cv-rep-channels"></tbody></table></div>' +
      '<div class="card" style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:14px;"><h3 style="font-size:14px;font-weight:800;margin-bottom:10px;">Top productos (30 días)</h3><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="text-align:left;color:#888;font-size:11px;"><th style="padding:6px;">Producto</th><th>Unid.</th><th>Total</th></tr></thead><tbody id="cv-rep-top"></tbody></table></div>' +
    '</div>';
  }
  function pageRestock(){
    return '<div id="cv-page-restock" class="page" style="display:none;">' +
      '<h2 style="font-size:20px;font-weight:900;margin-bottom:6px;">Avisos de stock</h2>' +
      '<p style="color:#888;font-size:12px;margin-bottom:14px;">Clientes que pidieron que les avises cuando vuelva un producto.</p>' +
      '<div class="card" style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:8px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="text-align:left;color:#888;font-size:11px;"><th style="padding:8px;">Fecha</th><th>Talle</th><th>Cliente</th><th>Email</th><th>Estado</th><th></th></tr></thead><tbody id="cv-rr-list"></tbody></table></div>' +
    '</div>';
  }
  function ipt(){ return 'width:100%;background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;border-radius:8px;padding:9px 10px;font-size:13px;box-sizing:border-box;'; }
  function fld(id,label,type,val){ return '<div><label style="font-size:10px;color:#888;font-weight:800;letter-spacing:1px;">'+label.toUpperCase()+'</label><input id="'+id+'" type="'+type+'"'+(val?(' value="'+val+'"'):'')+' style="'+ipt()+'"></div>'; }
  function kpi(id,label){ return '<div class="card" style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:14px;"><div style="font-size:10px;color:#888;letter-spacing:1px;font-weight:800;">'+label+'</div><div id="'+id+'" style="font-size:22px;font-weight:900;color:var(--accent,#baff00);margin-top:6px;">$0</div></div>'; }

  // ── Navegación ───────────────────────────────────────────────────
  window.CRMVentas = {
    show: function(name, el){
      document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); p.style.display='none'; });
      var pg = document.getElementById('cv-page-'+name);
      if (pg){ pg.classList.add('active'); pg.style.display='block'; }
      document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
      if (el) el.classList.add('active');
      var title = document.getElementById('page-title'); if (title) title.textContent = {ventas:'Ventas',reportes:'Reportes',restock:'Avisos de stock'}[name]||name;
      if (name==='ventas'){ CRMVentas._loadProductPicker(); CRMVentas.loadSales(); }
      if (name==='reportes') CRMVentas.loadReports();
      if (name==='restock') CRMVentas.loadRestock();
    },
    addSale: async function(){
      var sb=_sb(); if(!sb||!_email()) return;
      var name=(document.getElementById('cv-name').value||'').trim();
      if(!name){ alert('Producto/servicio requerido.'); return; }
      var qty=Math.max(1,parseInt(document.getElementById('cv-qty').value)||1);
      var price=parseFloat(document.getElementById('cv-price').value)||0;
      var total=price*qty;
      var channel=document.getElementById('cv-channel').value||'otro';
      var client=(document.getElementById('cv-client').value||'').trim()||null;
      var phone=(document.getElementById('cv-phone').value||'').trim()||null;
      try{
        await sb.from('business_sales').insert({ business_email:_email(), product_name:name, qty:qty, unit_price:price, total:total, channel:channel, client_name:client, client_phone:phone, status:'entregada' });
        ['cv-name','cv-qty','cv-price','cv-client','cv-phone'].forEach(function(id){ var e=document.getElementById(id); if(e) e.value=(id==='cv-qty'?'1':''); });
        CRMVentas.loadSales();
      }catch(e){ alert('No se pudo guardar: '+(e.message||e)); }
    },
    loadSales: async function(){
      var sb=_sb(); if(!sb||!_email()) return;
      try{
        var r=await sb.from('business_sales').select('*').eq('business_email',_email()).order('sold_at',{ascending:false}).limit(100);
        var tb=document.getElementById('cv-list'); if(!tb) return;
        var data=(r&&r.data)||[];
        if(!data.length){ tb.innerHTML='<tr><td colspan="8" style="text-align:center;color:#666;padding:24px;">Sin ventas cargadas.</td></tr>'; return; }
        tb.innerHTML=data.map(function(s){
          var fecha=new Date(s.sold_at||s.created_at).toLocaleDateString('es-UY',{day:'2-digit',month:'2-digit',year:'2-digit'});
          var ch={whatsapp:'#25d366',instagram:'#e1306c',canchero:'#baff00',presencial:'#888',otro:'#aaa'}[s.channel]||'#aaa';
          var stc=s.status==='entregada'?'#00e676':s.status==='cancelada'?'#ff5555':'#ffaa00';
          return '<tr style="border-top:1px solid #1a1a1a;"><td style="padding:8px;">'+fecha+'</td><td>'+esc(s.product_name)+(s.size?(' · '+esc(s.size)):'')+'</td><td>'+(s.qty||1)+'</td><td>'+fmt(s.total||0)+'</td><td><span style="color:'+ch+';font-weight:700;font-size:11px;text-transform:uppercase;">'+esc(s.channel)+'</span></td><td>'+esc(s.client_name||'—')+(s.client_phone?(' · '+esc(s.client_phone)):'')+'</td><td><span style="color:'+stc+';font-size:11px;font-weight:700;">'+esc((s.status||'').toUpperCase())+'</span></td><td><button onclick="CRMVentas.delSale(\''+s.id+'\')" style="background:none;border:none;color:#ff5555;cursor:pointer;">✕</button></td></tr>';
        }).join('');
      }catch(e){ console.warn('loadSales',e); }
    },
    delSale: async function(id){ if(!confirm('¿Borrar venta?'))return; try{ await _sb().from('business_sales').delete().eq('id',id); CRMVentas.loadSales(); }catch(e){ alert(e.message||e); } },
    loadReports: async function(){
      var sb=_sb(); if(!sb||!_email()) return;
      try{
        var now=new Date();
        var todayISO=new Date(now.getFullYear(),now.getMonth(),now.getDate()).toISOString();
        var monthISO=new Date(now.getFullYear(),now.getMonth(),1).toISOString();
        var d30=new Date(Date.now()-30*24*3600000).toISOString();
        var res=await Promise.all([
          sb.from('business_sales').select('total').eq('business_email',_email()).gte('sold_at',todayISO),
          sb.from('business_sales').select('total,qty').eq('business_email',_email()).gte('sold_at',monthISO),
          sb.from('business_sales').select('total,qty,channel,product_name').eq('business_email',_email()).gte('sold_at',d30)
        ]);
        var today=(res[0].data||[]).reduce(function(a,b){return a+(parseFloat(b.total)||0);},0);
        var month=(res[1].data||[]).reduce(function(a,b){return a+(parseFloat(b.total)||0);},0);
        var units=(res[1].data||[]).reduce(function(a,b){return a+(parseInt(b.qty)||0);},0);
        var avg=(res[1].data||[]).length?month/(res[1].data||[]).length:0;
        var set=function(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; };
        set('cv-rep-today',fmt(today)); set('cv-rep-month',fmt(month)); set('cv-rep-units',units); set('cv-rep-avg',fmt(avg));
        var byCh={}; (res[2].data||[]).forEach(function(r){ var k=r.channel||'otro'; if(!byCh[k])byCh[k]={t:0,q:0}; byCh[k].t+=parseFloat(r.total)||0; byCh[k].q+=parseInt(r.qty)||0; });
        var grand=Object.values(byCh).reduce(function(a,b){return a+b.t;},0)||1;
        var ch=document.getElementById('cv-rep-channels');
        if(ch) ch.innerHTML=Object.keys(byCh).map(function(k){var v=byCh[k];return '<tr style="border-top:1px solid #1a1a1a;"><td style="padding:6px;text-transform:uppercase;font-weight:700;">'+esc(k)+'</td><td>'+fmt(v.t)+'</td><td>'+v.q+'</td><td>'+(v.t/grand*100).toFixed(0)+'%</td></tr>';}).join('')||'<tr><td colspan="4" style="text-align:center;color:#666;padding:18px;">Sin ventas en 30 días.</td></tr>';
        var byP={}; (res[2].data||[]).forEach(function(r){ var k=r.product_name||'—'; if(!byP[k])byP[k]={t:0,q:0}; byP[k].t+=parseFloat(r.total)||0; byP[k].q+=parseInt(r.qty)||0; });
        var top=Object.keys(byP).map(function(k){return {n:k,t:byP[k].t,q:byP[k].q};}).sort(function(a,b){return b.q-a.q;}).slice(0,10);
        var tp=document.getElementById('cv-rep-top');
        if(tp) tp.innerHTML=top.map(function(r){return '<tr style="border-top:1px solid #1a1a1a;"><td style="padding:6px;">'+esc(r.n)+'</td><td>'+r.q+'</td><td>'+fmt(r.t)+'</td></tr>';}).join('')||'<tr><td colspan="3" style="text-align:center;color:#666;padding:18px;">Sin ventas en 30 días.</td></tr>';
      }catch(e){ console.warn('loadReports',e); }
    },
    loadRestock: async function(){
      var sb=_sb(); if(!sb||!_email()) return;
      try{
        var r=await sb.from('restock_requests').select('*').eq('business_email',_email()).order('created_at',{ascending:false}).limit(200);
        var data=(r&&r.data)||[];
        var tb=document.getElementById('cv-rr-list'); if(!tb) return;
        if(!data.length){ tb.innerHTML='<tr><td colspan="6" style="text-align:center;color:#666;padding:24px;">Nadie pidió aviso todavía.</td></tr>'; return; }
        tb.innerHTML=data.map(function(x){
          var fecha=new Date(x.created_at).toLocaleDateString('es-UY',{day:'2-digit',month:'2-digit',year:'2-digit'});
          return '<tr style="border-top:1px solid #1a1a1a;"><td style="padding:8px;">'+fecha+'</td><td>'+esc(x.size||'—')+'</td><td>'+esc(x.user_name||'')+'</td><td><a href="mailto:'+esc(x.user_email)+'" style="color:var(--accent,#baff00);">'+esc(x.user_email)+'</a></td><td><span style="color:'+(x.notified?'#00e676':'#ffaa00')+';font-weight:700;font-size:11px;">'+(x.notified?'NOTIFICADO':'PENDIENTE')+'</span></td><td>'+(x.notified?'':'<button onclick="CRMVentas.notifyRestock(\''+x.id+'\',\''+esc(x.user_email)+'\',\''+esc(x.size||'')+'\')" style="background:var(--accent,#baff00);color:#000;border:none;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;">Avisar</button>')+'</td></tr>';
        }).join('');
        var pending=data.filter(function(x){return !x.notified;}).length;
        var bg=document.getElementById('cv-restock-badge'); if(bg){ if(pending>0){bg.textContent=pending;bg.style.display='inline-block';}else bg.style.display='none'; }
      }catch(e){ console.warn('loadRestock',e); }
    },
    notifyRestock: async function(id,userEmail,size){
      var sb=_sb(); if(!sb) return;
      try{
        await sb.from('restock_requests').update({notified:true}).eq('id',id);
        try{ await sb.from('messages').insert({ sender_email:_email(), sender_name:(_biz().name)||_email(), recipient_email:userEmail, content:'¡Ya tenemos stock'+(size?(' (talle '+size+')'):'')+'! Pasá por la tienda en Canchero.', read:false }); }catch(e){}
        CRMVentas.loadRestock();
      }catch(e){ alert(e.message||e); }
    },
    _productCache: null,
    _loadProductPicker: async function(){
      var sel=document.getElementById('cv-name'); if(!sel||sel.tagName!=='SELECT') return;
      var sb=_sb(); if(!sb||!_email()) return;
      try{
        var r=await sb.from('products').select('id,name,price,category').eq('seller_email',_email()).order('name');
        var prods=(r&&r.data)||[];
        CRMVentas._productCache=prods;
        var html='<option value="">-- Elegir producto/servicio --</option>';
        prods.forEach(function(p){
          html+='<option value="'+esc(p.name)+'" data-price="'+(p.price||0)+'">'+esc(p.name)+(p.price?' · $'+Math.round(p.price):'')+(p.category?' ('+esc(p.category)+')':'')+'</option>';
        });
        html+='<option value="__custom__">+ Producto suelto (escribir nombre)</option>';
        sel.innerHTML=html;
      }catch(e){
        sel.innerHTML='<option value="">-- Escribir nombre --</option><option value="__custom__">+ Producto suelto</option>';
      }
    },
    _onProductPick: function(sel){
      if(sel.value==='__custom__'){
        var inp=document.createElement('input');
        inp.id='cv-name'; inp.type='text'; inp.placeholder='Nombre del producto o servicio';
        inp.style.cssText=ipt();
        sel.parentElement.replaceChild(inp,sel);
        inp.focus();
        return;
      }
      var opt=sel.options[sel.selectedIndex];
      var price=opt?opt.getAttribute('data-price'):null;
      if(price){ var el=document.getElementById('cv-price'); if(el) el.value=price; }
    }
  };

  // Auto-init: esperar a que BIZ esté listo
  var tries=0;
  var iv=setInterval(function(){
    tries++;
    if (_email()){ injectUI(); CRMVentas.loadRestock(); clearInterval(iv); }
    if (tries>40) clearInterval(iv);
  }, 500);

  console.log('[canchero-crm-ventas] ✅ módulo de ventas/reportes/restock cargado');
})();
