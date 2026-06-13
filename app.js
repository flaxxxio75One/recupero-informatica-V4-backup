const storeKey="arianna_recupero_app_v4";let state=loadState();let currentExam=[];let deferredPrompt=null;function defaultState(){return{profileReady:false,name:"Arianna",examDate:"2026-07-10",current:1,completed:[],scores:{},stars:0,examHistory:[],weak:{}}}function loadState(){
try{
  const v3 = localStorage.getItem(storeKey);
  if(v3) return {...defaultState(),...JSON.parse(v3)};
  const v3 = localStorage.getItem("arianna_recupero_app_v3");
  if(v3) return {...defaultState(),...JSON.parse(v3)};
  const v2 = localStorage.getItem("arianna_recupero_app_v2");
  if(v2) return {...defaultState(),...JSON.parse(v2)};
  return defaultState();
}catch{return defaultState()}
}function saveState(){
  localStorage.setItem(storeKey,JSON.stringify(state));
  scheduleCloudSave();
}function lesson(){return LESSONS.find(l=>l.id===state.current)||LESSONS[0]}function $(id){return document.getElementById(id)}function toast(msg){const t=$("toast");t.textContent=msg;t.style.display="block";setTimeout(()=>t.style.display="none",2300)}function init(){$("startBtn").onclick=()=>{state.name=$("studentName").value.trim()||"Arianna";state.examDate=$("examDate").value||"2026-07-10";state.profileReady=true;saveState();render()};$("prevLesson").onclick=()=>{if(state.current>1){state.current--;saveState();render()}};$("nextLesson").onclick=()=>{if(state.current<LESSONS.length){state.current++;saveState();render()}};$("completeLesson").onclick=completeLesson;$("checkQuiz").onclick=checkQuiz;$("startExam").onclick=startExam;$("gradeExam").onclick=gradeExam;$("resetBtn").onclick=resetAll;$("exportBtn").onclick=exportProgress;$("copyBackupBtn").onclick=copyBackup;$("importFile").onchange=importProgress;$("syncNowBtn").onclick=syncNow;$("pullCloudBtn").onclick=pullCloud;$("pushCloudBtn").onclick=pushCloud;$("toggleDetail").onclick=toggleDetail;document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab,b));window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});$("installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$("installBtn").classList.add("hidden")}};render()}function render(){if(!state.profileReady){$("loginScreen").classList.remove("hidden");$("appScreen").classList.add("hidden");$("studentName").value=state.name;$("examDate").value=state.examDate;return}$("loginScreen").classList.add("hidden");$("appScreen").classList.remove("hidden");const l=lesson();$("lessonTitle").textContent=`Giorno ${l.id} · ${l.title}`;$("lessonGoal").textContent=l.goal;$("daysLeft").textContent=daysLeft();const pct=Math.round(state.completed.length/LESSONS.length*100);$("progressLabel").textContent=`${pct}% completato`;$("progressBar").style.width=pct+"%";$("stars").textContent=state.stars;$("doneCount").textContent=state.completed.length;$("avgScore").textContent=averageScore()+"%";$("examGrade").textContent=lastExamGrade();renderTheory(l);renderMap(l);renderQuiz(l);renderPlan();renderChart();renderReport()}function daysLeft(){const today=new Date();today.setHours(0,0,0,0);const exam=new Date(state.examDate+"T00:00:00");return Math.max(0,Math.ceil((exam-today)/86400000))}function averageScore(){const vals=Object.values(state.scores);if(!vals.length)return 0;return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length)}function lastExamGrade(){if(!state.examHistory.length)return "—";return state.examHistory[state.examHistory.length-1].grade.toFixed(1)}function renderTheory(l){$("theoryBox").innerHTML=l.theory.map(x=>`<div class="theory-item">${escapeHtml(x)}</div>`).join("");$("detailBox").classList.add("hidden");$("toggleDetail").textContent="Apri spiegazione dettagliata";$("detailBox").innerHTML=l.detail.map(x=>`<div class="detail-item">${escapeHtml(x)}</div>`).join("")}function toggleDetail(){const b=$("detailBox");b.classList.toggle("hidden");$("toggleDetail").textContent=b.classList.contains("hidden")?"Apri spiegazione dettagliata":"Chiudi spiegazione dettagliata"}function renderMap(l){$("mapBox").innerHTML=l.map.map((x,i)=>`<div class="map-node">${i?"→ ":""}${escapeHtml(x)}</div>`).join("")}function renderQuiz(l){$("quizResult").textContent="";$("quizBox").innerHTML=l.quiz.map((q,qi)=>`<div class="quiz-q"><p>${qi+1}. ${escapeHtml(q.q)}</p>${q.options.map((o,oi)=>`<label><input type="radio" name="q${qi}" value="${oi}"> ${escapeHtml(o)}</label>`).join("")}</div>`).join("")}function renderPlan(){$("planBox").innerHTML=LESSONS.map(l=>{const done=state.completed.includes(l.id);const score=state.scores[l.id]!=null?` · Quiz ${state.scores[l.id]}%`:"";return`<div class="plan-item ${done?"done":""}" onclick="goLesson(${l.id})"><div><b>Giorno ${l.id}</b> · ${escapeHtml(l.date)}<br>${escapeHtml(l.title)} <small>${score}</small></div><span class="badge">${done?"Fatto ⭐":"Da fare"}</span></div>`}).join("")}function renderChart(){const vals=LESSONS.map(l=>state.scores[l.id]??0).slice(0,14);$("chartBars").innerHTML=vals.map(v=>`<div class="bar" title="${v}%" style="height:${Math.max(4,v)}%"></div>`).join("")}function goLesson(id){state.current=id;saveState();render();window.scrollTo({top:0,behavior:"smooth"})}window.goLesson=goLesson;function completeLesson(){if(!state.completed.includes(state.current)){state.completed.push(state.current);state.stars+=1}if(state.current<LESSONS.length)state.current+=1;saveState();render();toast("Lezione completata. Stella guadagnata ⭐")}function checkQuiz(){const l=lesson();let correct=0;l.quiz.forEach((q,qi)=>{const selected=document.querySelector(`input[name="q${qi}"]:checked`);if(selected&&Number(selected.value)===q.a)correct++;else markWeak(l.area)});const score=Math.round(correct/l.quiz.length*100);state.scores[l.id]=score;if(score>=80&&!state.completed.includes(l.id)){state.stars+=1}saveState();renderChart();renderPlan();renderReport();$("avgScore").textContent=averageScore()+"%";$("quizResult").innerHTML=score>=80?`<span class="good">Ottimo: ${score}% · ${correct}/${l.quiz.length}</span>`:score>=60?`<span class="mid">Sufficiente ma da rinforzare: ${score}% · ${correct}/${l.quiz.length}</span>`:`<span class="bad">Da ripassare: ${score}% · ${correct}/${l.quiz.length}</span>`}function markWeak(area){state.weak[area]=(state.weak[area]||0)+1}function startExam(){const pool=LESSONS.flatMap(l=>l.quiz.map(q=>({...q,area:l.area,lesson:l.title})));currentExam=shuffle(pool).slice(0,10);$("examBox").innerHTML=currentExam.map((q,qi)=>`<div class="exam-q"><p>${qi+1}. ${escapeHtml(q.q)} <small>(${escapeHtml(q.area)})</small></p>${q.options.map((o,oi)=>`<label><input type="radio" name="e${qi}" value="${oi}"> ${escapeHtml(o)}</label>`).join("")}</div>`).join("");$("examResult").innerHTML="";toast("Simulazione avviata")}function gradeExam(){if(!currentExam.length){toast("Prima avvia una simulazione");return}let correct=0;const areaStats={};currentExam.forEach((q,qi)=>{areaStats[q.area]=areaStats[q.area]||{ok:0,tot:0};areaStats[q.area].tot++;const selected=document.querySelector(`input[name="e${qi}"]:checked`);if(selected&&Number(selected.value)===q.a){correct++;areaStats[q.area].ok++}else markWeak(q.area)});const percent=Math.round(correct/currentExam.length*100);const grade=Math.max(4,Math.round((4+percent/100*6)*10)/10);state.examHistory.push({date:new Date().toISOString(),percent,grade,areaStats});if(grade>=6)state.stars+=2;saveState();renderReport();$("examGrade").textContent=grade.toFixed(1);$("examResult").innerHTML=`<h3>Voto finale: ${grade.toFixed(1)}/10</h3><p>${correct}/10 corrette · ${percent}%</p>`+renderAreaStats(areaStats)}function renderAreaStats(stats){return Object.entries(stats).map(([area,s])=>{const p=Math.round(s.ok/s.tot*100);return`<div class="area-row"><b>${escapeHtml(area)} · ${p}%</b>${s.ok}/${s.tot} corrette<div class="area-bar"><div style="width:${p}%"></div></div></div>`}).join("")}function renderReport(){const byArea={};LESSONS.forEach(l=>{if(state.scores[l.id]!=null){byArea[l.area]=byArea[l.area]||[];byArea[l.area].push(state.scores[l.id])}});let html="<h3>Situazione per area</h3>";if(!Object.keys(byArea).length)html+="<p>Fai almeno un quiz per vedere il report.</p>";Object.entries(byArea).forEach(([area,vals])=>{const avg=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);const cls=avg>=80?"good":avg>=60?"mid":"bad";html+=`<div class="area-row"><b class="${cls}">${escapeHtml(area)} · ${avg}%</b><div class="area-bar"><div style="width:${avg}%"></div></div></div>`});const weak=Object.entries(state.weak).sort((a,b)=>b[1]-a[1]).slice(0,3);html+="<h3>Punti da rinforzare</h3>";html+=weak.length?weak.map(([a,n])=>`<p>⚠️ <b>${escapeHtml(a)}</b>: ${n} errori registrati. Ripassare mappe e spiegazione dettagliata.</p>`).join(""):"<p>Nessun punto debole registrato.</p>";html+="<h3>Punti forti</h3>";const strong=Object.entries(byArea).map(([a,v])=>[a,Math.round(v.reduce((x,y)=>x+y,0)/v.length)]).filter(x=>x[1]>=80);html+=strong.length?strong.map(([a,p])=>`<p>✅ <b>${escapeHtml(a)}</b>: ${p}% medio.</p>`).join(""):"<p>Completa altri quiz per individuare i punti forti.</p>";$("reportBox").innerHTML=html}function resetAll(){if(confirm("Vuoi azzerare profilo, stelle, quiz, esami e completamenti?")){state=defaultState();saveState();render()}}function switchTab(id,btn){document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));btn.classList.add("active");$(id).classList.add("active");if(id==="report")renderReport();if(id==="backup")renderBackup();if(id==="cloud")renderCloud()}function shuffle(a){return[...a].sort(()=>Math.random()-.5)}function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function backupPayload(){
  return {
    app:"Arianna Recupero Informatica",
    version:"3",
    exportedAt:new Date().toISOString(),
    state:state
  };
}
function renderBackup(){
  const last = state.examHistory && state.examHistory.length ? state.examHistory[state.examHistory.length-1] : null;
  const size = JSON.stringify(backupPayload()).length;
  $("backupBox").innerHTML =
    `<div class="area-row"><b>Stato attuale</b>
    Stelle: ${state.stars}<br>
    Giorni completati: ${state.completed.length}/${LESSONS.length}<br>
    Media quiz: ${averageScore()}%<br>
    Ultimo voto esame: ${last ? last.grade.toFixed(1)+"/10" : "nessuna simulazione"}<br>
    Dimensione backup: ${Math.round(size/1024)} KB
    </div>
    <p><b>Consiglio:</b> esporta un backup ogni 2-3 giorni e salvalo su iCloud Drive o OneDrive.</p>`;
}
function exportProgress(){
  const payload = JSON.stringify(backupPayload(), null, 2);
  const blob = new Blob([payload], {type:"application/json"});
  const date = new Date().toISOString().slice(0,10);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `arianna-progressi-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  toast("Backup esportato");
  renderBackup();
}
async function copyBackup(){
  const payload = JSON.stringify(backupPayload(), null, 2);
  try{
    await navigator.clipboard.writeText(payload);
    toast("Backup copiato negli appunti");
  }catch(e){
    $("backupBox").innerHTML = `<p>Non riesco a copiare automaticamente. Copia manualmente questo testo:</p><div class="backup-code">${escapeHtml(payload)}</div>`;
  }
}
function importProgress(ev){
  const file = ev.target.files && ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      const importedState = parsed.state || parsed;
      if(!importedState || typeof importedState !== "object") throw new Error("Formato non valido");
      if(!confirm("Importare questo backup? I progressi attuali verranno sostituiti.")) return;
      state = {...defaultState(), ...importedState, profileReady:true};
      saveState();
      render();
      renderBackup();
      toast("Backup importato correttamente");
    }catch(err){
      alert("File backup non valido.");
    }finally{
      ev.target.value = "";
    }
  };
  reader.readAsText(file);
}


let cloudReady=false, db=null, auth=null, cloudTimer=null, cloudUser=null;

async function initCloud(){
  try{
    if(typeof FIREBASE_SETTINGS==="undefined" || !FIREBASE_SETTINGS.enabled){
      cloudReady=false;
      return;
    }
    firebase.initializeApp(FIREBASE_SETTINGS.firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    const cred = await auth.signInAnonymously();
    cloudUser = cred.user;
    cloudReady=true;
    await pullCloudSilent();
    renderCloud();
    toast("Cloud collegato");
  }catch(e){
    console.warn(e);
    cloudReady=false;
    renderCloud();
  }
}
function cloudDoc(){
  const sid = (FIREBASE_SETTINGS && FIREBASE_SETTINGS.studentId) ? FIREBASE_SETTINGS.studentId : "arianna";
  return db.collection("students").doc(sid).collection("progress").doc("main");
}
function cleanStateForCloud(){
  return JSON.parse(JSON.stringify(state));
}
function scheduleCloudSave(){
  if(!cloudReady) return;
  clearTimeout(cloudTimer);
  cloudTimer=setTimeout(()=>pushCloud(true),1200);
}
async function pushCloud(silent=false){
  if(!cloudReady){ if(!silent) toast("Cloud non configurato"); renderCloud(); return; }
  try{
    await cloudDoc().set({
      state: cleanStateForCloud(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      device: navigator.userAgent
    }, {merge:true});
    if(!silent) toast("Progressi salvati su cloud");
    renderCloud();
  }catch(e){
    console.warn(e);
    if(!silent) alert("Errore salvataggio cloud");
  }
}
async function pullCloud(){
  if(!cloudReady){ toast("Cloud non configurato"); renderCloud(); return; }
  if(!confirm("Recuperare i progressi dal cloud? I dati locali verranno sostituiti.")) return;
  await pullCloudSilent(true);
}
async function pullCloudSilent(showToast=false){
  if(!cloudReady) return;
  try{
    const snap = await cloudDoc().get();
    if(snap.exists && snap.data().state){
      state = {...defaultState(), ...snap.data().state, profileReady:true};
      localStorage.setItem(storeKey, JSON.stringify(state));
      render();
      if(showToast) toast("Progressi recuperati dal cloud");
    }else{
      await pushCloud(true);
    }
  }catch(e){
    console.warn(e);
    if(showToast) alert("Errore recupero cloud");
  }
}
async function syncNow(){
  if(!cloudReady){ toast("Cloud non configurato"); renderCloud(); return; }
  await pushCloud(true);
  await pullCloudSilent(false);
  render();
  toast("Sincronizzazione completata");
}
function renderCloud(){
  const box = $("cloudBox");
  const status = $("cloudStatus");
  if(!box || !status) return;
  if(typeof FIREBASE_SETTINGS==="undefined" || !FIREBASE_SETTINGS.enabled){
    status.innerHTML = '<span class="cloud-no">Stato cloud: non configurato</span>';
    box.innerHTML = `<div class="area-row">
      <b>Per attivare il cloud</b>
      1. Crea un progetto Firebase gratuito.<br>
      2. Attiva Authentication anonima.<br>
      3. Attiva Firestore Database.<br>
      4. Incolla i dati in <code>firebase-config.js</code>.<br>
      5. Imposta <code>enabled: true</code>.<br>
      6. Ricarica i file su GitHub.
    </div>`;
    return;
  }
  if(cloudReady){
    status.innerHTML = '<span class="cloud-ok">Stato cloud: collegato</span>';
    box.innerHTML = `<div class="area-row">
      <b>Cloud attivo</b>
      Studente: ${escapeHtml(FIREBASE_SETTINGS.studentId || "arianna")}<br>
      Stelle locali: ${state.stars}<br>
      Giorni completati: ${state.completed.length}/${LESSONS.length}<br>
      Media quiz: ${averageScore()}%
    </div>`;
  }else{
    status.innerHTML = '<span class="cloud-warn">Stato cloud: configurato ma non connesso</span>';
    box.innerHTML = `<p>Controlla la configurazione Firebase, Authentication e Firestore.</p>`;
  }
}

init();
initCloud();