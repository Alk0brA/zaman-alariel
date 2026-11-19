"use strict";
const CATS={
  tv:{e:"📡",n:"التلفزيون والقنوات"},
  kids:{e:"🧸",n:"برامج الأطفال والكرتون"},
  ball:{e:"⚽",n:"الكورة والحارة"},
  chips:{e:"🍟",n:"الشبسات والحلويات"},
  video:{e:"📼",n:"الفيديو والكستات"},
  family:{e:"🏠",n:"الجمعات العائلية"},
  school:{e:"🎒",n:"المدرسة"},
  eid:{e:"🌙",n:"رمضان والعيد"},
  games:{e:"🕹️",n:"الألعاب والأتاري"},
  other:{e:"✨",n:"أخرى"}
};
const PROMPTS=[
 "متى كانت القناة الأولى تقفل عندكم بالليل؟ ووش كنتم تسوون بعدها؟",
 "مين كان المسؤول يطلع السطح يعدّل الأريل؟ وكيف كانت التعليمات من تحت؟",
 "وش أغلى جايزة طلعت لك من كيس شبس؟ ولا عمرك ما كمّلت المجموعة؟",
 "وش أول فيلم شفتوه على الفيديو؟ ومن وين كنتم تأجرون الأشرطة؟",
 "وين كان ملعب الحارة؟ ومين صاحب الكورة اللي إذا زعل خذها وراح؟",
 "وش برنامج الأطفال اللي ما تفوّته أبد؟ وكم الساعة كان يبدأ؟",
 "كيف كانت جمعة العيد عند بيت الجد أو الجدة؟",
 "وش أول جهاز ألعاب دخل بيتكم؟ ومين كان يحتكره؟",
 "تذكر شريط كاست كنتم تشغلونه بالسيارة في كل مشوار؟",
 "وش كنت تشتري بالفسحة؟ وبكم كانت؟",
 "مين أول بيت في الحارة ركّب دش؟",
 "وش المسلسل اللي كانت العائلة كلها تتجمع عشانه بعد الفطور في رمضان؟",
 "وش أكثر لعبة شعبية كنتم تلعبونها بالحارة؟",
 "تذكر أول مرة سجلت صوتك على شريط كاست؟"
];
const QUIZ=[
 {q:"برنامج أطفال تعليمي لتعليم الحروف العربية، من أشهر شخصياته (أبو الحروف).",a:"المناهل",o:["افتح يا سمسم","المناهل","سلامتك","المدرسة"]},
 {q:"نسخة عربية من برنامج دمى عالمي، فيه شخصيات مثل نعمان وملسون وكعكي.",a:"افتح يا سمسم",o:["افتح يا سمسم","المناهل","سلامتك","مدينة الدمى"]},
 {q:"برنامج أطفال كويتي توعوي يعلّم الصحة والنظافة والعادات الصحية بأسلوب ممتع.",a:"سلامتك",o:["سلامتك","المناهل","افتح يا سمسم","صحتك بالدنيا"]},
 {q:"كرتون عن فتى قوي يعيش في جزيرة بعد كارثة عظيمة، ويبحث عن صديقته اللي خطفوها لمدينة اسمها (إندستريا).",a:"عدنان ولينا",o:["عدنان ولينا","سندباد","جزيرة الكنز","ماوكلي"]},
 {q:"كرتون كورة، بطله لاعب يسدد تسديدات خيالية والملعب يطول حلقات كاملة قبل ما يوصل المرمى.",a:"كابتن ماجد",o:["الهداف","كابتن ماجد","أبطال الملاعب","كابتن رابح"]},
 {q:"كرتون روبوت عملاق يقوده (دايسكي)، ويدافع عن الأرض ضد غزاة من الفضاء.",a:"جريندايزر",o:["مازنجر","جريندايزر","فولترون","الرجل الحديدي"]},
 {q:"كائنات زرقاء صغيرة تعيش في قرية من بيوت على شكل فطر، وعدوها ساحر شرير معه قطوه.",a:"السنافر",o:["السنافر","الدببة المحبوبة","ساندي بل","الحوت الأبيض"]},
 {q:"مسلسل كوميدي سعودي رمضاني، كل حلقة قصة مستقلة، بطولة ناصر القصبي وعبدالله السدحان.",a:"طاش ما طاش",o:["طاش ما طاش","درب الزلق","خالتي قماشة","سيلفي"]},
 {q:"برنامج مسابقات ثقافية على التلفزيون السعودي، ارتبط اسمه بالمذيع القدير ماجد الشبل.",a:"حروف وألوف",o:["من سيربح المليون","حروف وألوف","بنك المعلومات","المسابقة الكبرى"]},
 {q:"كرتون عن بحّار شاب يسافر في رحلات مغامرة، ومعه طائر يتكلم.",a:"مغامرات سندباد",o:["مغامرات سندباد","جزيرة الكنز","عدنان ولينا","علاء الدين"]}
];
const STICKERS=[
 {e:"🍟",n:"أول ذكرى",d:"أضف ذكراك الأولى",t:s=>s.mine>=1},
 {e:"📻",n:"حكواتي الحارة",d:"أضف ٥ ذكريات",t:s=>s.mine>=5},
 {e:"📼",n:"أرشيف العائلة",d:"أضف ١٠ ذكريات",t:s=>s.mine>=10},
 {e:"📷",n:"صاحب الصورة",d:"أضف ذكرى معها صورة",t:s=>s.photos>=1},
 {e:"🎨",n:"متنوّع",d:"اكتب في ٣ تصنيفات",t:s=>s.cats>=3},
 {e:"🕰️",n:"ولد الثمانينات",d:"ذكرى قبل ١٩٩٠",t:s=>s.old>=1},
 {e:"🤝",n:"ذاكرة جماعية",d:"اضغط (أتذكرها) ٥ مرات",t:s=>s.gave>=5},
 {e:"⭐",n:"كلنا عشناها",d:"ذكرى يتذكرها ٣ أشخاص",t:s=>s.bestOne>=3},
 {e:"🏆",n:"نجم الجلسة",d:"١٥ (أتذكرها) على ذكرياتك",t:s=>s.got>=15},
 {e:"🕹️",n:"لاعب أتاري",d:"العب ٥ مرات في الصالة",t:s=>s.games>=5},
 {e:"🎮",n:"جامع الأشرطة",d:"جرّب ٤ ألعاب مختلفة",t:s=>s.gameKinds>=4},
 {e:"💬",n:"ابن الديوانية",d:"أرسل ٥ رسائل في الدواوين",t:s=>s.chat>=5},
 {e:"🔤",n:"أبو الحروف",d:"جاوب ٥ صح في خمّن",t:s=>s.quiz>=5},
 {e:"🧠",n:"عبقري الشاشة",d:"العلامة الكاملة في خمّن",t:s=>s.quiz>=QUIZ.length},
 {e:"🌙",n:"سهران",d:"افتح المنصة بعد نهاية الإرسال",t:s=>s.night}
];

const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
function uid(){try{if(crypto&&crypto.randomUUID)return crypto.randomUUID().replace(/-/g,"")}catch(e){}return "x"+Date.now().toString(36)+Math.random().toString(36).slice(2,12)}
const DEV=(()=>{let d=LS.get("za_dev",null);if(typeof d!=="string"||!/^[A-Za-z0-9_-]{6,64}$/.test(d)){d=uid();LS.set("za_dev",d)}return d})();

const S={token:LS.get("za_token",""),me:null,settings:null,mems:[],rems:[],stats:LS.get("za_stats",{}),loaded:false,tab:"feed",fCat:"all",fDec:"all",fYear:null,sort:"new",
  promptI:0,answering:null,cat:"other",file:null,listening:false,busy:{},delArm:null,prevUnlocked:null,q:null,lastV:null,
  regResolve:null,regTimer:null,events:[],evI:0,room:null,lastMsgId:0,chatRev:null,chatTimer:null,roomsTimer:null,best:{}};

const $=id=>document.getElementById(id);
function h(tag,attrs,...kids){const el=document.createElement(tag);if(attrs)for(const k in attrs){const v=attrs[k];if(v==null||v===false)continue;if(k==="class")el.className=v;else if(k==="text")el.textContent=v;else if(k.startsWith("on"))el.addEventListener(k.slice(2),v);else el.setAttribute(k,v===true?"":v)}for(const c of kids.flat()){if(c==null||c===false)continue;el.append(c.nodeType?c:document.createTextNode(String(c)))}return el}
const ar=n=>Number(n).toLocaleString("ar-SA");
let toastT;function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2800)}
function note(msg){const n=$("note");n.textContent=msg||"";n.classList.toggle("show",!!msg)}
const rtf=(()=>{try{return new Intl.RelativeTimeFormat("ar",{numeric:"auto"})}catch(e){return null}})();
function ago(ts){if(!ts||!rtf)return"";const s=(ts-Date.now())/1000;const a=Math.abs(s);if(a<60)return"الحين";if(a<3600)return rtf.format(Math.round(s/60),"minute");if(a<86400)return rtf.format(Math.round(s/3600),"hour");return rtf.format(Math.round(s/86400),"day")}
function hhmm(ts){try{return new Date(ts).toLocaleTimeString("ar-SA",{hour:"numeric",minute:"2-digit"})}catch(e){return""}}
function nameOf(m){if(m.official)return m.authorName||"أرشيف زمن الأريل";if(m.author===DEV)return"أنت";return m.authorName||"واحد من الجيل"}
function saveStats(patch){S.stats=Object.assign({},S.stats,patch);LS.set("za_stats",S.stats);renderStickers()}
function prompts(){const p=S.settings&&S.settings.prompts;return p&&p.length?p:PROMPTS}

/* ---------- API ---------- */
async function api(path,opt){
  opt=opt||{};const headers=Object.assign({},opt.body?{"Content-Type":"application/json"}:{},S.token?{"x-za-token":S.token}:{});
  const r=await fetch("/api"+path,{method:opt.method||(opt.body?"POST":"GET"),headers,body:opt.body?JSON.stringify(opt.body):undefined});
  let b=null;try{b=await r.json()}catch(e){}
  if(!r.ok){const err=new Error((b&&b.error)||("http_"+r.status));err.code=(b&&b.error)||("http_"+r.status);err.status=r.status;throw err}
  return b
}
function writeErr(e){
  const m=(e&&(e.code||e.message))||"";
  if(m==="auth"){setMe(null);toast("سجّل دخولك أول");openReg("عشان تكمل، سجّل اسمك وبريدك.")}
  else if(m==="banned")toast("حسابك موقوف. تواصل مع إدارة المنصة");
  else if(m==="not_allowed")toast("ما تقدر تحذف هذي الذكرى");
  else if(m==="rate_limited")toast("شوي شوي 😅 جرّب بعد دقيقة");
  else if(m==="too_large")toast("الصورة كبيرة، جرّب صورة ثانية");
  else if(m==="disabled")toast("هذي الميزة موقفة حالياً");
  else if(/fetch|network|Failed/i.test(m))toast("فيه مشكلة في الاتصال، جرّب مرة ثانية");
  else toast("صار خطأ، جرّب مرة ثانية");
}

/* ---------- boot ---------- */
(async function init(){
  S.promptI=Math.floor(Math.random()*PROMPTS.length);
  renderPrompt();renderFilters();renderQuiz();renderAll();renderCarts();
  note("جاري ضبط الأريل… 📡");
  try{
    const d=await api("/boot?device="+encodeURIComponent(DEV));
    S.settings=d.settings;
    if(d.banned){S.token="";LS.set("za_token","");toast("حسابك موقوف")}
    setMe(d.me);
    applySettings();
  }catch(e){note("المنصة ما تستجيب الحين… حدّث الصفحة بعد شوي (أول تشغيل ممكن ياخذ دقيقة).");}
  await refresh();
  loadEvents();
  setInterval(pollV,4000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
  loadBest();
  if(isNight()&&!S.stats.night)saveStats({night:true});
  if(window.SpeechRecognition||window.webkitSpeechRecognition)setupDictation();
  scheduleReg();
})();

function applySettings(){
  const s=S.settings||{};const f=s.features||{};
  $("siteTitle").textContent=s.siteTitle||"زمن الأريل";
  const an=$("announce");an.textContent=s.announcement||"";an.classList.toggle("show",!!s.announcement);
  const vis={feed:f.memories!==false,games:f.games!==false,chat:f.chat!==false,quiz:f.quiz!==false||f.stickers!==false};
  document.querySelectorAll("nav.bottom button").forEach(b=>b.classList.toggle("hidden",!vis[b.dataset.tab]));
  if(!vis[S.tab]){const first=Object.keys(vis).find(k=>vis[k]);if(first)switchTab(first)}
  $("fab").classList.toggle("hidden",f.memories===false||S.tab!=="feed");
  renderPrompt();renderCarts();
}
function setMe(me){
  S.me=me||null;
  if(!me){S.token="";LS.set("za_token","")}
  const c=$("userChip");
  if(S.me){c.textContent="👤 "+S.me.display;c.classList.remove("cta")}else{c.textContent="سجّل دخولك";c.classList.add("cta")}
  $("fNameWrap").classList.toggle("hidden",!!S.me||!!(S.settings&&S.settings.memoriesNeedReg));
}

/* ---------- registration ---------- */
function scheduleReg(){
  clearTimeout(S.regTimer);
  if(S.me||!S.settings)return;
  let later=false;try{later=sessionStorage.getItem("za_reg_later")==="1"}catch(e){}
  if(later&&!S.settings.regRequired)return;
  const delay=Math.max(0,+S.settings.regDelaySec||0)*1000;
  S.regTimer=setTimeout(()=>{if(!S.me&&!$("regOv").classList.contains("show"))openReg()},delay);
}
function openReg(reason){
  return new Promise(res=>{
    if(S.me){res(true);return}
    if(S.regResolve){const prev=S.regResolve;S.regResolve=v=>{prev(v);res(v)}}else S.regResolve=res;
    $("regReason").textContent=reason||"سجّل اسمك عشان تشارك ذكرياتك، وتلعب وتدخل لوحة الأبطال، وتسولف في الدواوين.";
    $("regLater").classList.toggle("hidden",!!(S.settings&&S.settings.regRequired));
    $("regErr").textContent="";
    $("regOv").classList.add("show");
    setTimeout(()=>{try{$("rName").focus()}catch(e){}},200);
  })
}
function closeReg(ok){
  $("regOv").classList.remove("show");
  const r=S.regResolve;S.regResolve=null;if(r)r(!!ok);
}
function needReg(reason){if(S.me)return Promise.resolve(true);return openReg(reason)}
function syncShowRadio(){const nick=$("rNick").value.trim();$("rShowWrap").style.opacity=nick?"1":".5";document.querySelectorAll('input[name=rShow]').forEach(r=>r.disabled=!nick);if(!nick)document.querySelector('input[name=rShow][value=real]').checked=true}
$("rNick").addEventListener("input",()=>{syncShowRadio();if($("rNick").value.trim())document.querySelector('input[name=rShow][value=nick]').checked=true});
syncShowRadio();
$("regLater").addEventListener("click",()=>{try{sessionStorage.setItem("za_reg_later","1")}catch(e){}closeReg(false)});
$("regForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const name=$("rName").value.trim(),nick=$("rNick").value.trim(),email=$("rEmail").value.trim(),phone=$("rPhone").value.trim();
  const err=$("regErr");err.textContent="";
  if(name.length<2){err.textContent="اكتب اسمك";$("rName").focus();return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){err.textContent="اكتب بريد إلكتروني صحيح";$("rEmail").focus();return}
  const ph=phone.replace(/[\s-]/g,"");
  if(ph&&!/^\+?[0-9]{8,15}$/.test(ph)){err.textContent="رقم الجوال غير صحيح (أو اتركه فاضي)";$("rPhone").focus();return}
  if(!$("rConsent").checked){err.textContent="لازم توافق على سياسة الخصوصية عشان تكمل";return}
  const btn=$("regBtn");btn.disabled=true;btn.textContent="لحظة…";
  try{
    const showReal=!nick||document.querySelector('input[name=rShow]:checked').value==="real";
    const d=await api("/register",{body:{name,nickname:nick,showReal,email,phone:ph,consent:true,marketing:$("rMk").checked,device:DEV}});
    S.token=d.token;LS.set("za_token",d.token);setMe(d.me);
    closeReg(true);toast("حيّاك يا "+d.me.display+" 🎉");
  }catch(x){
    const c=x.code;err.textContent=c==="email"?"البريد غير صحيح":c==="phone"?"رقم الجوال غير صحيح":c==="name"?"اكتب اسمك":c==="rate_limited"?"محاولات كثيرة، جرّب بعد دقيقة":"ما قدرنا نسجلك، جرّب مرة ثانية";
  }finally{btn.disabled=false;btn.textContent="ادخل المنصة 🎉"}
});
$("openPrivacy").addEventListener("click",()=>$("privOv").classList.add("show"));
$("privClose").addEventListener("click",()=>$("privOv").classList.remove("show"));
$("userChip").addEventListener("click",()=>{if(!S.me){openReg();return}openProfile()});
function openProfile(){
  const m=S.me;$("profInfo").textContent=m.name+" · "+m.email+(m.phone?" · "+m.phone:"");
  $("pNick").value=m.nickname||"";document.querySelector('input[name=pShow][value='+(m.showReal||!m.nickname?"real":"nick")+']').checked=true;$("pMk").checked=!!m.marketing;
  $("profOv").classList.add("show");
}
$("profClose").addEventListener("click",()=>$("profOv").classList.remove("show"));
$("profSave").addEventListener("click",async()=>{
  try{const nick=$("pNick").value.trim();const d=await api("/me",{body:{nickname:nick,showReal:!nick||document.querySelector('input[name=pShow]:checked').value==="real",marketing:$("pMk").checked}});setMe(d.me);$("profOv").classList.remove("show");toast("انحفظ ✔️")}catch(e){writeErr(e)}
});
$("logout").addEventListener("click",()=>{setMe(null);$("profOv").classList.remove("show");toast("سجلت خروج من هذا الجهاز")});

/* ---------- memories ---------- */
let refreshing=false,again=false;
async function refresh(){
  if(refreshing){again=true;return}
  refreshing=true;
  try{const d=await api("/state");S.lastV=d.v;S.mems=d.mems;S.rems=d.rems;if(!S.loaded){S.loaded=true;note("")}renderAll()}
  catch(e){if(!S.loaded)note("المنصة ما تستجيب الحين… حدّث الصفحة بعد شوي (أول تشغيل ممكن ياخذ دقيقة).")}
  finally{refreshing=false;if(again){again=false;setTimeout(refresh,200)}}
}
async function pollV(){if(document.hidden)return;try{const d=await api("/v");if(S.lastV!==null&&d.v!==S.lastV)refresh();if(S.chatRev!==null&&d.c!==S.chatRev&&S.room){S.chatRev=d.c;loadRoom(true)}}catch(e){}}
function remMap(){const m={};for(const r of S.rems){if(r.m)m[r.m]=(m[r.m]||0)+1}return m}
function myRem(mid){return S.rems.some(r=>r.m===mid&&r.u===DEV)}
const tokens=()=>LS.get("za_tokens",{});
function myStats(){
  const rm=remMap();const mine=S.mems.filter(m=>m.author===DEV);
  let got=0,best=0;for(const m of mine){const c=rm[m.id]||0;got+=c;if(c>best)best=c}
  const gk=S.stats.gameKinds||{};
  return{mine:mine.length,photos:mine.filter(m=>m.photo).length,cats:new Set(mine.map(m=>m.cat)).size,old:mine.filter(m=>m.year&&m.year<1990).length,
    gave:S.rems.filter(r=>r.u===DEV).length,got,bestOne:best,quiz:+(S.stats.quizBest||0),night:!!S.stats.night,
    games:+(S.stats.games||0),gameKinds:Object.keys(gk).length,chat:+(S.stats.chat||0)}
}
function renderAll(){renderCounters();renderFeed();renderTimeline();renderStickers();renderEventCard()}
function renderCounters(){
  $("cMem").textContent=ar(S.mems.length);$("cRem").textContent=ar(S.rems.length);
  const ppl=new Set([...S.mems.map(m=>m.author),...S.rems.map(r=>r.u)].filter(Boolean));$("cPpl").textContent=ar(ppl.size);
}
function renderPrompt(){const p=prompts();$("promptQ").textContent=p[S.promptI%p.length]}
function renderFilters(){
  const dec=$("decFilters");dec.replaceChildren();
  [["all","كل السنين"],["1980","الثمانينات"],["1990","التسعينات"],["2000","الألفينات"]].forEach(([k,n])=>{
    dec.append(h("button",{class:"chip"+(S.fDec===k&&S.fYear==null?" on":""),onclick:()=>{S.fDec=k;S.fYear=null;renderFilters();renderFeed()}},n))});
  if(S.fYear!=null)dec.prepend(h("button",{class:"chip x",onclick:()=>{S.fYear=null;renderFilters();renderFeed()}},(S.fYear==="none"?"بدون سنة":"سنة "+S.fYear)+" ✕"));
  const cat=$("catFilters");cat.replaceChildren();
  cat.append(h("button",{class:"chip"+(S.fCat==="all"?" on":""),onclick:()=>{S.fCat="all";renderFilters();renderFeed()}},"كل المواضيع"));
  for(const k in CATS)cat.append(h("button",{class:"chip"+(S.fCat===k?" on":""),onclick:()=>{S.fCat=k;renderFilters();renderFeed()}},CATS[k].e+" "+CATS[k].n));
}
function filtered(rm){
  let a=S.mems.slice();
  if(S.fCat!=="all")a=a.filter(m=>m.cat===S.fCat);
  if(S.fYear!=null)a=a.filter(m=>S.fYear==="none"?!m.year:m.year===S.fYear);
  else if(S.fDec!=="all"){const d=+S.fDec;a=a.filter(m=>m.year>=d&&m.year<d+10)}
  if(S.sort==="top")a.sort((x,y)=>(rm[y.id]||0)-(rm[x.id]||0)||(y.createdAt||0)-(x.createdAt||0));
  return a
}
function renderFeed(){
  const feed=$("feed");const rm=remMap();const list=filtered(rm);feed.replaceChildren();
  $("feedCount").textContent=list.length?ar(list.length)+" ذكرى":"";
  if(!list.length){
    const any=S.mems.length>0;
    feed.append(h("div",{class:"empty"},h("div",{class:"big"},any?"🔍":"📡"),
      h("h3",{text:any?"ما فيه ذكريات بهالفلتر":(S.loaded?"الشاشة تنتظر أول ذكرى":"جاري ضبط الأريل…")}),
      h("p",{text:any?"جرّب تصنيف أو سنة ثانية":"كن أول واحد يشارك! جاوب على سؤال (تذكر؟) فوق أو اضغط (أضف ذكرى)."})));
    return
  }
  for(const m of list)feed.append(card(m,rm[m.id]||0));
}
function safePhoto(u){return typeof u==="string"&&/^\/api\/photo\/[0-9a-f-]{36}$/i.test(u)?u:null}
function card(m,count){
  const c=CATS[m.cat]||CATS.other;const own=m.author===DEV;const on=myRem(m.id);
  const remBtn=h("button",{class:"rem"+(own?" own":on?" on":""),"aria-pressed":on?"true":"false",onclick:e=>{if(!own)toggleRem(m.id,e.currentTarget)}},
    own?("👥 "+ar(count)+" يتذكرونها"):((on?"✓ أتذكرها":"📺 أتذكرها")+(count?" · "+ar(count):"")));
  const del=tokens()[m.id]?h("button",{class:"del"+(S.delArm===m.id?" sure":""),onclick:()=>delMem(m)},S.delArm===m.id?"متأكد؟ احذف":"حذف"):null;
  const ph=safePhoto(m.photo);
  return h("article",{class:"card"+(m.official?" official":"")},
    h("div",{class:"top"},m.official?h("span",{class:"tag offtag"},"📺 من أرشيف المنصة"):null,h("span",{class:"tag"},c.e+" "+c.n),m.year?h("span",{class:"tag year"},String(m.year)):null,m.city?h("span",{class:"tag city"},"📍 "+m.city):null),
    m.prompt?h("div",{class:"ans"},"جواب على: "+m.prompt):null,
    m.title?h("h3",{text:m.title}):null,
    h("p",{class:"txt",text:m.text||""}),
    ph?h("img",{src:ph,alt:m.title||"صورة الذكرى",loading:"lazy"}):null,
    h("div",{class:"foot"},h("div",{class:"who"},h("b",{text:nameOf(m)})," · "+ago(m.createdAt),del?" ":null,del),remBtn)
  )
}
async function loadEvents(){try{const d=await api("/events");S.events=d.events||[];S.evI=Math.floor(Math.random()*Math.max(1,S.events.length));renderEventCard();renderTimeline()}catch(e){}}
function renderEventCard(){
  const box=$("evCard");if(!box)return;
  if(!S.events.length){box.classList.add("hidden");return}
  const e=S.events[S.evI%S.events.length];
  const yrMems=S.mems.filter(m=>m.year===e.year).length;
  box.replaceChildren(h("div",{class:"evlbl"},"📅 من ذاك الزمن"),
    h("div",{class:"evrow"},h("span",{class:"evyear"},String(e.year)),h("span",{class:"evemo"},e.emoji||"📅"),h("div",null,h("b",{text:e.title}),e.body?h("p",{text:e.body}):null)),
    h("div",{class:"row"},h("button",{class:"btn ghost",onclick:()=>{S.evI++;renderEventCard()}},"حدث ثاني ↻"),
      h("button",{class:"btn ghost",onclick:()=>{S.fYear=e.year;S.fCat="all";renderFilters();renderFeed();document.getElementById("feed").scrollIntoView({behavior:"smooth"})}},yrMems?("ذكريات "+e.year+" ("+ar(yrMems)+")"):"شارك ذكرى من "+e.year),
      h("button",{class:"btn ghost",onclick:()=>{switchTab("time");window.scrollTo({top:0})}},"الخط الزمني")));
  box.classList.remove("hidden");
}
function renderTimeline(){
  const box=$("timeline");box.replaceChildren();
  const by={};let none=0;for(const m of S.mems){if(m.year)by[m.year]=(by[m.year]||0)+1;else none++}
  const evBy={};for(const e of S.events){(evBy[e.year]=evBy[e.year]||[]).push(e)}
  const years=[...new Set([...Object.keys(by),...Object.keys(evBy)].map(Number))].sort((a,b)=>a-b);
  if(!years.length&&!none){box.append(h("div",{class:"empty"},h("div",{class:"big"},"📅"),h("h3",{text:"الخط الزمني فاضي"}),h("p",{text:"حدد السنة لما تضيف ذكرى، وبتطلع هنا."})));return}
  const max=Math.max(1,...Object.values(by),none);let lastDec=null;let tl=null;
  const decName=d=>d===1970?"السبعينات":d===1980?"الثمانينات":d===1990?"التسعينات":d===2000?"الألفينات":"عقد "+d;
  for(const y of years){
    const d=Math.floor(y/10)*10;
    if(d!==lastDec){lastDec=d;box.append(h("div",{class:"dec"},decName(d)));tl=h("div",{class:"tl"});box.append(tl)}
    if(by[y])tl.append(yearRow(y,by[y],max));
    else tl.append(h("div",{class:"tly tly-ev"},h("span",{class:"y"},String(y)),h("span",{class:"n",style:"width:auto;color:var(--muted)"},"شارك أول ذكرى من هالسنة"),h("button",{class:"chip",onclick:()=>openComposer(null).then(()=>{try{$("fYear").value=String(y)}catch(e){}})},"＋ ذكرى")));
    for(const e of (evBy[y]||[]))tl.append(h("div",{class:"tlev"},h("span",{class:"e"},e.emoji||"📅"),h("div",null,h("b",{text:e.title}),e.body?h("p",{text:e.body}):null)));
  }
  if(none){box.append(h("div",{class:"dec"},"بدون سنة"));const t=h("div",{class:"tl"});t.append(yearRow("none",none,max));box.append(t)}
}
function yearRow(y,n,max){
  return h("button",{class:"tly",onclick:()=>{S.fYear=y;S.fCat="all";renderFilters();switchTab("feed");renderFeed()}},
    h("span",{class:"y"},y==="none"?"؟":String(y)),h("span",{class:"bar"},h("i",{style:"width:"+Math.round(n/max*100)+"%"})),h("span",{class:"n"},ar(n)+" ذكرى"))
}
function renderStickers(){
  const s=myStats();const grid=$("stickers");grid.replaceChildren();let n=0;const unlocked=[];
  STICKERS.forEach((k,i)=>{const on=!!k.t(s);if(on){n++;unlocked.push(i)}
    grid.append(h("div",{class:"stk "+(on?"on":"off")},h("div",{class:"e"},on?k.e:"❔"),h("b",{text:on?k.n:"جائزة مخفية"}),h("small",{text:k.d})))});
  $("stkBar").style.width=Math.round(n/STICKERS.length*100)+"%";
  $("stkCount").textContent="جمعت "+ar(n)+" من "+ar(STICKERS.length)+" جوائز"+(n===STICKERS.length?" — كمّلت المجموعة! 🎉":"");
  if(S.loaded){
    if(S.prevUnlocked){const fresh=unlocked.filter(i=>!S.prevUnlocked.includes(i));if(fresh.length){const k=STICKERS[fresh[0]];setTimeout(()=>toast("🎉 طلعت لك جائزة: "+k.e+" "+k.n),400)}}
    S.prevUnlocked=unlocked;
  }
}
async function toggleRem(mid,btn){
  const key="r"+mid;if(S.busy[key])return;S.busy[key]=1;
  const has=myRem(mid);const before=S.rems.slice();
  S.rems=has?S.rems.filter(r=>!(r.m===mid&&r.u===DEV)):S.rems.concat([{m:mid,u:DEV}]);
  if(!has)popAt(btn);renderAll();
  try{await api("/remember",{body:{memory:mid,device:DEV,on:!has}})}catch(e){S.rems=before;renderAll();writeErr(e)}finally{delete S.busy[key]}
}
function popAt(btn){try{const r=btn.getBoundingClientRect();const p=h("span",{class:"pop",style:"left:"+(r.left+r.width/2-11)+"px;top:"+(r.top+window.scrollY-10)+"px;position:absolute"},"📺");document.body.append(p);setTimeout(()=>p.remove(),950)}catch(e){}}
async function delMem(m){
  if(S.delArm!==m.id){S.delArm=m.id;renderFeed();setTimeout(()=>{if(S.delArm===m.id){S.delArm=null;renderFeed()}},4000);return}
  S.delArm=null;
  try{await api("/memories/"+m.id+"/delete",{body:{token:tokens()[m.id]||""}});S.mems=S.mems.filter(x=>x.id!==m.id);renderAll();toast("انحذفت الذكرى")}catch(e){writeErr(e)}
}

/* ---------- tabs ---------- */
function switchTab(t){
  if(t!=="chat")leaveRoom();
  S.tab=t;["feed","time","games","chat","quiz"].forEach(k=>$("tab-"+k).classList.toggle("hidden",k!==t));
  const navT=t==="time"?"feed":t;
  document.querySelectorAll("nav.bottom button").forEach(b=>b.classList.toggle("on",b.dataset.tab===navT));
  const f=(S.settings&&S.settings.features)||{};
  $("fab").classList.toggle("hidden",t!=="feed"||f.memories===false);
  clearInterval(S.roomsTimer);
  if(t==="chat"){loadRooms();S.roomsTimer=setInterval(()=>{if(!document.hidden&&!S.room)loadRooms()},10000)}
  if(t==="games")loadBest();
}
document.querySelectorAll("nav.bottom button").forEach(b=>b.addEventListener("click",()=>{switchTab(b.dataset.tab);window.scrollTo({top:0,behavior:"smooth"})}));
document.querySelectorAll(".seg button").forEach(b=>b.addEventListener("click",()=>{S.sort=b.dataset.sort;document.querySelectorAll(".seg button").forEach(x=>x.classList.toggle("on",x===b));renderFeed()}));
$("promptNext").addEventListener("click",()=>{S.promptI=(S.promptI+1)%prompts().length;renderPrompt()});
$("promptAns").addEventListener("click",()=>openComposer(prompts()[S.promptI%prompts().length]));
$("fab").addEventListener("click",()=>openComposer(null));
$("openTimeline").addEventListener("click",()=>{switchTab("time");window.scrollTo({top:0})});
$("backFromTimeline").addEventListener("click",()=>switchTab("feed"));

/* ---------- composer ---------- */
(function buildComposer(){
  const sel=$("fYear");sel.append(h("option",{value:""},"مو متأكد"));
  for(let y=2010;y>=1975;y--)sel.append(h("option",{value:String(y)},String(y)));
  renderCatPicker();$("fName").value=LS.get("za_name","");
})();
function renderCatPicker(){const box=$("fCats");box.replaceChildren();for(const k in CATS)box.append(h("button",{type:"button",class:"chip"+(S.cat===k?" on":""),onclick:()=>{S.cat=k;renderCatPicker()}},CATS[k].e+" "+CATS[k].n))}
async function openComposer(prompt){
  if(S.settings&&S.settings.memoriesNeedReg){const ok=await needReg("سجّل اسمك عشان تنشر ذكراك ويعرف الجيل مين صاحبها.");if(!ok)return}
  S.answering=prompt;const ab=$("ansBox");ab.textContent=prompt?"تجاوب على: "+prompt:"";ab.classList.toggle("show",!!prompt);
  $("composer").classList.add("show");document.body.style.overflow="hidden";
  setTimeout(()=>{try{$("fText").focus()}catch(e){}},150);
}
function closeComposer(){$("composer").classList.remove("show");document.body.style.overflow="";stopDictation()}
function resetComposer(){$("fText").value="";$("fTitle").value="";$("fYear").value="";$("fCity").value="";S.cat="other";renderCatPicker();clearPhoto();$("partial").textContent="";S.answering=null}
$("cmpClose").addEventListener("click",closeComposer);
$("composer").addEventListener("click",e=>{if(e.target.id==="composer")closeComposer()});
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;["privOv","profOv"].forEach(id=>$(id).classList.remove("show"));if($("composer").classList.contains("show"))closeComposer()});
$("fPhoto").addEventListener("change",e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  if(!/^image\//.test(f.type)){toast("اختر صورة فقط");return}
  S.file=f;$("photoImg").src=URL.createObjectURL(f);$("photoPrev").classList.add("show");
});
$("photoRm").addEventListener("click",clearPhoto);
function clearPhoto(){S.file=null;$("fPhoto").value="";$("photoPrev").classList.remove("show");$("photoImg").removeAttribute("src")}
function compressToData(file){return new Promise((res,rej)=>{const img=new Image();const url=URL.createObjectURL(file);
  img.onload=()=>{const M=1280;let w=img.naturalWidth,ht=img.naturalHeight;const k=Math.min(1,M/Math.max(w,ht));w=Math.round(w*k);ht=Math.round(ht*k);
    const c=document.createElement("canvas");c.width=w;c.height=ht;c.getContext("2d").drawImage(img,0,0,w,ht);URL.revokeObjectURL(url);
    try{res(c.toDataURL("image/jpeg",.8))}catch(e){rej(e)}};
  img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("img"))};img.src=url})}
$("submitBtn").addEventListener("click",async()=>{
  const text=$("fText").value.trim();
  if(text.length<5){toast("اكتب سالفتك أول ✍️");$("fText").focus();return}
  let authorName="";
  if(!S.me){
    if(S.settings&&S.settings.memoriesNeedReg){const ok=await needReg();if(!ok)return}
    else{authorName=$("fName").value.trim();if(!authorName){toast("اكتب اسمك أو لقبك 🙂");$("fName").focus();return}LS.set("za_name",authorName)}
  }
  const btn=$("submitBtn");btn.disabled=true;btn.textContent="جاري البث… 📡";
  try{
    stopDictation();
    let photo=null;if(S.file){try{photo=await compressToData(S.file)}catch(e){toast("ما قدرنا نقرأ الصورة")}}
    const y=parseInt($("fYear").value,10);
    const d=await api("/memories",{body:{title:$("fTitle").value.trim().slice(0,70),text:text.slice(0,3000),cat:S.cat in CATS?S.cat:"other",
      year:isFinite(y)?y:null,city:$("fCity").value.trim().slice(0,30),prompt:S.answering||null,authorName,author:DEV,photo}});
    const t=tokens();t[d.id]=d.token;LS.set("za_tokens",t);
    closeComposer();resetComposer();
    toast(d.photoFailed?"انبثّت ذكراك، بس الصورة ما ارتفعت":"انبثّت ذكراك 🎉");
    await refresh();
  }catch(e){writeErr(e)}
  finally{btn.disabled=false;btn.textContent="انشر الذكرى 📡"}
});

/* dictation */
let REC=null;
function stopDictation(){try{if(REC&&S.listening)REC.stop()}catch(e){}}
function setupDictation(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const btn=$("micBtn");btn.classList.remove("hidden");
  const setL=on=>{S.listening=on;btn.classList.toggle("rec",on);btn.textContent=on?"⏹️ وقّف التسجيل":"🎙️ سجّل بصوتك";if(!on)$("partial").textContent=""};
  btn.addEventListener("click",()=>{
    if(S.listening){stopDictation();return}
    try{
      REC=new SR();REC.lang="ar-SA";REC.continuous=true;REC.interimResults=true;
      REC.onstart=()=>setL(true);REC.onend=()=>setL(false);
      REC.onerror=e=>{if(e.error==="not-allowed"||e.error==="service-not-allowed"){btn.classList.add("hidden");toast("المايك مقفل، تقدر تكتب بدل التسجيل ✍️")}else if(e.error!=="no-speech"&&e.error!=="aborted")toast("ما اشتغل التسجيل، جرّب مرة ثانية")};
      REC.onresult=e=>{let interim="";for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];
        if(r.isFinal){const ta=$("fText");ta.value=(ta.value&&!/\s$/.test(ta.value)?ta.value+" ":ta.value)+r[0].transcript.trim()+" "}else interim+=r[0].transcript}
        $("partial").textContent=interim?"… "+interim:""};
      REC.start();
    }catch(e){toast("التسجيل الصوتي غير متاح في هالمتصفح")}
  });
}

/* ---------- games ---------- */
S.console="all";S.mine={};
async function loadBest(){
  try{const [b,m]=await Promise.all([api("/scores/best"),S.me?api("/scores/me"):Promise.resolve({mine:{}})]);S.best=b.best||{};S.mine=m.mine||{};renderCarts()}catch(e){}
  loadHall();
}
async function loadHall(){
  const box=$("hall");if(!box)return;
  try{
    const d=await api("/hall");
    if(d.disabled||!Object.keys(d.games||{}).length){box.classList.add("hidden");return}
    const names={};if(typeof ZAGames!=="undefined")ZAGames.list().forEach(x=>names[x.id]=x.emoji+" "+x.name);
    box.replaceChildren(h("h3",null,"🏆 لوحة الشرف"),h("div",{class:"hall-grid"},...Object.entries(d.games).map(([gid,rows])=>h("div",{class:"hall-g"},h("div",{class:"t",text:names[gid]||gid}),
      ...rows.map((r,i)=>h("div",{class:"r"},h("span",{text:["🥇","🥈","🥉"][i]+" "+r.name}),h("b",null,ar(r.score))))))));
    box.classList.remove("hidden");
  }catch(e){box.classList.add("hidden")}
}
function renderCarts(){
  const tabs=$("consoleTabs"),shelves=$("shelves");if(!tabs||typeof ZAGames==="undefined")return;
  const en=(S.settings&&S.settings.games)||{},C=ZAGames.consoles();
  const list=ZAGames.list().filter(g=>en[g.id]!==false);
  tabs.replaceChildren(h("button",{class:S.console==="all"?"on":"",onclick:()=>{S.console="all";renderCarts()}},"🎛️ كل الأجهزة"),
    ...Object.entries(C).filter(([k])=>list.some(g=>g.console===k)).map(([k,c])=>h("button",{class:S.console===k?"on":"",onclick:()=>{S.console=k;renderCarts()}},c.emoji+" "+c.name)));
  shelves.replaceChildren();
  if(!list.length){shelves.append(h("div",{class:"empty"},h("div",{class:"big"},"🕹️"),h("h3",{text:"الصالة مقفلة حالياً"})));return}
  for(const [k,c] of Object.entries(C)){
    if(S.console!=="all"&&S.console!==k)continue;
    const games=list.filter(g=>g.console===k);if(!games.length)continue;
    const grid=h("div",{class:"carts"});
    for(const gm of games){
      const b=S.best[gm.id],mine=S.mine[gm.id];
      grid.append(h("button",{class:"cart","data-c":k,onclick:()=>ZAGames.open(gm.id),"aria-label":"العب "+gm.name},
        h("div",{class:"shell"},h("div",{class:"label",style:"background:"+gm.color},
          h("div",{class:"em"},gm.emoji),h("div",{class:"nm",text:gm.name}),
          h("div",{class:"best",text:(b?("🏆 "+b.name+" — "+ar(b.score)):"🏆 ما أحد سجّل للحين")+(mine?("\n⭐ أفضلك: "+ar(mine.score)):"")})),
          h("div",{class:"grip"},h("i"),h("i"),h("i"),h("i"),h("i")))));
    }
    shelves.append(h("section",{class:"shelf"},h("div",{class:"shelf-h","data-c":k},h("span",{class:"e"},c.emoji),h("div",null,h("b",{text:c.name}),h("small",{text:c.sub})),h("span",{class:"yr"},c.year)),grid));
  }
}
if(typeof ZAGames!=="undefined"){
  ZAGames.setBoard(async id=>{
    const [d,m]=await Promise.all([api("/scores?game="+id),S.me?api("/scores/me"):Promise.resolve({mine:{}})]);
    const mine=m.mine&&m.mine[id]?ar(m.mine[id].score):null;
    return{hidden:!!d.hidden,top:(d.top||[]).map(x=>({name:x.name,score:ar(x.score)})),mine};
  });
  ZAGames.onStart(id=>{const gk=Object.assign({},S.stats.gameKinds||{});gk[id]=1;saveStats({games:(+(S.stats.games||0))+1,gameKinds:gk})});
  ZAGames.onEnd(async(id,score)=>{
    if(!(score>0))return null;
    if(!S.me){
      const ok=await needReg("سجّل اسمك عشان تنحفظ نتيجتك ("+ar(score)+") في لوحة الأبطال!");
      if(!ok)return{message:"سجّل دخولك المرة الجاية عشان تنحفظ نتيجتك"};
    }
    try{
      const d=await api("/scores",{body:{game:id,score}});loadBest();
      if(d.hidden)return{message:"🤫 انحفظت نتيجتك — لوحة الأبطال سرية وبتنعلن لاحقاً"+(d.best>score?" · أفضلك "+ar(d.best):"")};
      const pb=d.best!=null&&score>=d.best?" · رقم شخصي جديد! ⭐":"";
      return{message:(d.rank===1?"🥇 أنت الأول في لوحة الأبطال!":"ترتيبك #"+ar(d.rank)+" في لوحة الأبطال")+pb};
    }catch(e){if(e.code==="auth"){setMe(null)}return{message:"ما انحفظت النتيجة"}}
  });
}

/* ---------- chat ---------- */
const COLORS=["#c0392b","#16a085","#8e44ad","#d35400","#2c3e50","#27ae60","#2980b9","#b7950b"];
const colorOf=s=>{let x=0;for(const ch of String(s))x=(x*31+ch.charCodeAt(0))>>>0;return COLORS[x%COLORS.length]};
async function loadRooms(){
  const box=$("rooms");
  try{
    const d=await api("/rooms");box.replaceChildren();
    if(!d.rooms.length){box.append(h("div",{class:"empty"},h("div",{class:"big"},"💬"),h("h3",{text:"ما فيه دواوين مفتوحة الحين"})));return}
    for(const r of d.rooms)box.append(h("button",{class:"room",onclick:()=>enterRoom(r)},
      h("div",{class:"re"},r.emoji||"💬"),
      h("div",null,h("div",{class:"rn",text:r.name}),r.description?h("div",{class:"rd",text:r.description}):null),
      h("div",{class:"rm"},r.online?h("div",{class:"on"},"● "+ar(r.online)+" متواجد"):null,h("div",null,ar(r.count)+" رسالة"),r.lastAt?h("div",null,ago(r.lastAt)):null)));
  }catch(e){if(!box.children.length)box.replaceChildren(h("div",{class:"empty"},h("h3",{text:"تعذّر تحميل الدواوين"})))}
}
function enterRoom(r){
  S.room=r;S.lastMsgId=0;S.chatRev=null;
  $("roomTitle").textContent=(r.emoji||"💬")+" "+r.name;$("roomOnline").textContent="";
  $("msgs").replaceChildren(h("div",{class:"daysep"},"جاري التحميل…"));
  $("roomView").classList.remove("hidden");$("fab").classList.add("hidden");
  loadRoom(true);
  clearInterval(S.chatTimer);S.chatTimer=setInterval(()=>{if(!document.hidden)loadRoom(false)},2500);
}
function leaveRoom(){clearInterval(S.chatTimer);S.room=null;$("roomView").classList.add("hidden")}
$("roomBack").addEventListener("click",()=>{leaveRoom();loadRooms()});
let roomLoading=false;
async function loadRoom(full){
  if(!S.room||roomLoading)return;roomLoading=true;const rid=S.room.id;
  try{
    const d=await api("/rooms/"+rid+"/messages?device="+encodeURIComponent(DEV)+"&after="+(full?0:S.lastMsgId));
    if(!S.room||S.room.id!==rid)return;
    if(S.chatRev!==null&&d.rev!==S.chatRev&&!full){S.chatRev=d.rev;roomLoading=false;return loadRoom(true)}
    S.chatRev=d.rev;
    $("roomOnline").textContent=d.online?("● "+ar(d.online)+" متواجد الحين"):"";
    const box=$("msgs");const near=box.scrollHeight-box.scrollTop-box.clientHeight<120;
    if(full){box.replaceChildren();S.lastMsgId=0;if(!d.messages.length)box.append(h("div",{class:"daysep",id:"emptyRoom"},"ما فيه رسائل للحين — افتح السالفة أنت! 👋"))}
    if(d.messages.length){const er=$("emptyRoom");if(er)er.remove()}
    for(const m of d.messages)if(m.id>S.lastMsgId){box.append(msgEl(m));S.lastMsgId=m.id}
    if(full||near)box.scrollTop=box.scrollHeight;
  }catch(e){if(e.code==="no_room"){toast("هذي الديوانية انقفلت");leaveRoom();loadRooms()}}
  finally{roomLoading=false}
}
function msgEl(m){
  const mine=S.me&&m.user===S.me.id;
  return h("div",{class:"cmsg"+(mine?" me":"")},mine?null:h("div",{class:"mn",style:"color:"+colorOf(m.user||m.name),text:m.name}),h("div",{class:"bub",text:m.text}),h("div",{class:"mt"},hhmm(m.at)))
}
$("chatForm").addEventListener("submit",async e=>{
  e.preventDefault();const inp=$("chatInput");const text=inp.value.trim();if(!text||!S.room)return;
  if(S.settings&&S.settings.chatNeedsReg!==false||!S.me){const ok=await needReg("سجّل اسمك عشان تسولف مع الجماعة في الدواوين.");if(!ok)return}
  inp.value="";
  try{
    const d=await api("/rooms/"+S.room.id+"/messages",{body:{text}});
    const box=$("msgs");const er=$("emptyRoom");if(er)er.remove();
    if(d.message.id>S.lastMsgId){box.append(msgEl(d.message));S.lastMsgId=d.message.id}
    box.scrollTop=box.scrollHeight;saveStats({chat:(+(S.stats.chat||0))+1});
  }catch(x){inp.value=text;writeErr(x)}
});

/* ---------- quiz ---------- */
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function newQuiz(){S.q={order:shuffle(QUIZ.map((_,i)=>i)),i:0,score:0,picked:null,opts:null}}
function renderQuiz(){
  if(!S.q)newQuiz();const q=S.q;const box=$("quiz");box.replaceChildren();
  if(q.i>=q.order.length){
    const best=Math.max(q.score,+(S.stats.quizBest||0));
    const msg=q.score===QUIZ.length?"أسطورة التلفزيون! 📺":q.score>=7?"واضح إنك عشت الزمن الجميل 👌":q.score>=4?"مو بطال، بس فيه برامج فاتتك 😄":"شكلك كنت تلعب كورة وقت البرامج ⚽";
    box.append(h("div",{class:"qend"},h("div",{class:"sc"},ar(q.score)+"/"+ar(QUIZ.length)),h("p",{text:msg}),h("p",{style:"color:#9fc4b9;font-size:14px"},"أفضل نتيجة لك: "+ar(best)),
      h("button",{class:"btn pri",onclick:()=>{newQuiz();renderQuiz()}},"العب مرة ثانية ↻")));
    return
  }
  const item=QUIZ[q.order[q.i]];if(!q.opts)q.opts=shuffle(item.o);
  box.append(h("div",{class:"meta"},h("span",null,"سؤال "+ar(q.i+1)+" من "+ar(q.order.length)),h("span",null,"النتيجة: "+ar(q.score))),
    h("div",{class:"qq",text:item.q}));
  const opts=h("div",{class:"opts"});
  q.opts.forEach(o=>{
    let cls="opt";if(q.picked){if(o===item.a)cls+=" ok";else if(o===q.picked)cls+=" bad"}
    opts.append(h("button",{class:cls,disabled:q.picked?true:null,onclick:()=>pick(o)},o))});
  box.append(opts);
  box.append(h("div",{class:"fb"},q.picked?(q.picked===item.a?"صح عليك! 🎉":"لا، الجواب: "+item.a):""));
  if(q.picked)box.append(h("button",{class:"btn pri",onclick:nextQ},q.i+1<q.order.length?"التالي ←":"شوف نتيجتك"));
}
function pick(o){const q=S.q;if(q.picked)return;q.picked=o;if(o===QUIZ[q.order[q.i]].a)q.score++;renderQuiz()}
function nextQ(){const q=S.q;q.i++;q.picked=null;q.opts=null;
  if(q.i>=q.order.length&&q.score>(+(S.stats.quizBest||0)))saveStats({quizBest:q.score});
  renderQuiz()}

/* ---------- sign-off ---------- */
function isNight(){const hr=new Date().getHours();return hr>=0&&hr<5}
let actx=null,osc=null;
function stopTone(){try{if(osc){osc.stop();osc.disconnect()}}catch(e){}osc=null;$("soTone").textContent="🔊 صوت الإرسال"}
function showSignoff(){const d=new Date();$("soClock").textContent=d.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});$("signoff").classList.add("show")}
$("offBtn").addEventListener("click",showSignoff);
$("soStay").addEventListener("click",()=>{stopTone();$("signoff").classList.remove("show")});
$("soTone").addEventListener("click",()=>{
  if(osc){stopTone();return}
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==="suspended")actx.resume();
    const g=actx.createGain();g.gain.value=.06;osc=actx.createOscillator();osc.type="sine";osc.frequency.value=1000;osc.connect(g).connect(actx.destination);osc.start();
    $("soTone").textContent="🔇 أوقف الصوت"}catch(e){toast("الصوت غير متاح")}
});
(function(){if(isNight()){let seen=false;try{seen=sessionStorage.getItem("signoffSeen")==="1";sessionStorage.setItem("signoffSeen","1")}catch(e){}if(!seen)showSignoff()}})();

