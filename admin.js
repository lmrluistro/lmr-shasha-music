/* LMR ❤️ SHASHA — secure admin interface */
(() => {
  const URL = "https://biyhitzvjbnwaebkxtpt.supabase.co";
  const KEY = "sb_publishable_KLoCOyiPECc54Cs3qQhowA_4-tys8lj";
  const ADMIN = "unicohijo87@gmail.com";
  const db = window.supabase?.createClient(URL, KEY);
  const $ = id => document.getElementById(id);
  const safe = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let session = null;

  const login = document.createElement("section");
  login.className = "admin-panel";
  login.id = "admin-login-panel";
  login.innerHTML = `<h2>Admin sign in</h2><p class="admin-help">Sign in with ${ADMIN}. Only this account can upload music and moderate notes.</p><form id="admin-login-form" class="message-form"><label>Email<input id="login-email" type="email" value="${ADMIN}" required autocomplete="username"></label><label>Password<input id="login-password" type="password" required minlength="8" autocomplete="current-password"></label><button class="primary-btn" type="submit">Sign in</button><button id="admin-signup" class="primary-btn" type="button">Create admin account</button><p id="login-status" class="form-status" role="status"></p></form>`;
  document.querySelector(".admin-main")?.prepend(login);
  const setupStatus = $("setup-status");
  function message(el, text, good=false) { if (el) {el.textContent=text; el.style.color=good?"#73e0ad":"";} }
  function setLocked(locked) {
    document.querySelectorAll("#song-form input,#song-form button,#admin-songs,#admin-messages").forEach(el=>el.disabled=locked);
    $("admin-login-panel").hidden=!locked;
    document.querySelectorAll(".admin-panel").forEach(el=>{ if(el.id!=="admin-login-panel") el.hidden=locked; });
  }
  async function checkSession() {
    const {data}=await db.auth.getSession(); session=data.session;
    if(session && session.user.email?.toLowerCase()===ADMIN) {
      setLocked(false); message(setupStatus,"Connected to Supabase. Signed in as "+ADMIN,true); await loadSongs(); await loadMessages();
    } else {
      if(session) await db.auth.signOut();
      session=null; setLocked(true); message(setupStatus,"Sign in with the configured admin account to manage music.");
    }
  }
  $("admin-login-form").addEventListener("submit", async e=>{
    e.preventDefault(); const btn=e.submitter; btn.disabled=true;
    const email=$("login-email").value.trim().toLowerCase(), password=$("login-password").value;
    if(email!==ADMIN){ message($("login-status"),"Use the configured admin email."); btn.disabled=false; return; }
    const {error}=await db.auth.signInWithPassword({email,password});
    message($("login-status"),error?.message||"Signed in.",!error); btn.disabled=false;
    if(!error) await checkSession();
  });
  $("admin-signup").addEventListener("click", async e=>{
    const btn=e.currentTarget; btn.disabled=true;
    const email=$("login-email").value.trim().toLowerCase(), password=$("login-password").value;
    if(email!==ADMIN){ message($("login-status"),"Use the configured admin email."); btn.disabled=false; return; }
    if(password.length<8){ message($("login-status"),"Choose a password with at least 8 characters."); btn.disabled=false; return; }
    const {error}=await db.auth.signUp({email,password,options:{emailRedirectTo:"https://lmrluistro.github.io/lmr-shasha-music/admin.html"}});
    message($("login-status"),error?.message || "Account request created. Check your email to confirm, then return here and sign in.",!error); btn.disabled=false;
  });
  async function loadSongs() {
    const {data,error}=await db.from("songs").select("*").order("sort_order").order("created_at");
    if(error){message(setupStatus,"Could not load songs: "+error.message);return;}
    $("admin-count").textContent=data.length;
    $("admin-songs").innerHTML=data.length?data.map(s=>`<div class="admin-song-row" style="display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid rgba(255,255,255,.1)"><span><strong>${safe(s.title)}</strong><br><small>${safe(s.artist||"LMR")} · ${s.published?"Published":"Hidden"}</small></span><button class="delete-song" data-id="${safe(s.id)}" data-audio="${safe(s.audio_url)}" data-cover="${safe(s.cover_url||"")}" type="button">Delete</button></div>`).join(""):'<p>No songs uploaded yet.</p>';
    $("admin-songs").querySelectorAll(".delete-song").forEach(b=>b.addEventListener("click",async()=>{
      if(!confirm("Delete this song from the library?"))return;
      const {error}=await db.from("songs").delete().eq("id",b.dataset.id);
      if(error){alert("Could not delete song: "+error.message);return;}
      await loadSongs();
    }));
  }
  async function loadMessages() {
    const {data,error}=await db.from("messages").select("*").order("created_at",{ascending:false}).limit(200);
    if(error){message(setupStatus,"Could not load messages: "+error.message);return;}
    $("admin-messages").innerHTML=data.length?data.map(m=>`<article class="note-card" style="padding:12px;border-bottom:1px solid rgba(255,255,255,.12)"><strong>${safe(m.name)}</strong> <small>· ${new Date(m.created_at).toLocaleString()}</small><p style="white-space:pre-wrap;overflow-wrap:anywhere">${safe(m.message)}</p><small>${m.approved?"Approved":"Pending approval"}</small><div style="display:flex;gap:8px;margin-top:8px">${m.approved?"":`<button type="button" data-approve="${safe(m.id)}">Approve</button>`}<button type="button" data-delete-message="${safe(m.id)}">Delete</button></div></article>`).join(""):'<p>No messages yet.</p>';
    $("admin-messages").querySelectorAll("[data-approve]").forEach(b=>b.addEventListener("click",async()=>{const {error}=await db.from("messages").update({approved:true}).eq("id",b.dataset.approve);if(error)alert(error.message);else loadMessages();}));
    $("admin-messages").querySelectorAll("[data-delete-message]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("Delete this message?"))return;const {error}=await db.from("messages").delete().eq("id",b.dataset.deleteMessage);if(error)alert(error.message);else loadMessages();}));
  }
  $("song-form").addEventListener("submit",async e=>{
    e.preventDefault(); if(!session || session.user.email?.toLowerCase()!==ADMIN){message($("admin-status"),"Please sign in as Admin.");return;}
    const btn=e.submitter; btn.disabled=true; const old=btn.textContent; btn.textContent="Uploading…";
    let audioPath=null,coverPath=null;
    try {
      const title=$("title").value.trim(), artist=$("artist").value.trim()||"LMR", audioFile=$("audio-file").files[0], coverFile=$("cover-file").files[0];
      if(!audioFile)throw new Error("Choose an audio file.");
      if(audioFile.size>50*1024*1024)throw new Error("Audio must be 50 MB or smaller.");
      const audioExt=(audioFile.name.split(".").pop()||"mp3").toLowerCase().replace(/[^a-z0-9]/g,"");
      audioPath=`${crypto.randomUUID()}.${audioExt}`;
      const au=await db.storage.from("songs").upload(audioPath,audioFile,{upsert:false,contentType:audioFile.type||"audio/mpeg"});
      if(au.error)throw au.error;
      let coverUrl=null;
      if(coverFile){
        if(coverFile.size>10*1024*1024)throw new Error("Cover image must be 10 MB or smaller.");
        const ext=(coverFile.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
        coverPath=`${crypto.randomUUID()}.${ext}`;
        const cu=await db.storage.from("covers").upload(coverPath,coverFile,{upsert:false,contentType:coverFile.type||"image/jpeg"});
        if(cu.error)throw cu.error;
        coverUrl=db.storage.from("covers").getPublicUrl(coverPath).data.publicUrl;
      }
      const audioUrl=db.storage.from("songs").getPublicUrl(audioPath).data.publicUrl;
      const {error}=await db.from("songs").insert({title,artist,audio_url:audioUrl,cover_url:coverUrl,published:true});
      if(error)throw error;
      e.target.reset(); message($("admin-status"),"Song uploaded successfully! ❤️",true); await loadSongs();
    } catch(err) {
      console.error(err);
      if(audioPath) await db.storage.from("songs").remove([audioPath]);
      if(coverPath) await db.storage.from("covers").remove([coverPath]);
      message($("admin-status"),"Upload failed: "+(err.message||"Unknown error"));
    } finally {btn.disabled=false;btn.textContent=old;}
  });
  if(!db) {message(setupStatus,"Supabase client failed to load. Refresh this page.");return;}
  db.auth.onAuthStateChange(()=>{setTimeout(checkSession,0);});
  setLocked(true); checkSession();
})();