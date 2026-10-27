/* LMR ❤️ SHASHA — Supabase-connected public music player */
(() => {
  const SUPABASE_URL = "https://biyhitzvjbnwaebkxtpt.supabase.co";
  const SUPABASE_KEY = "sb_publishable_KLoCOyiPECc54Cs3qQhowA_4-tys8lj";
  const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = (id) => document.getElementById(id);
  let songs = [], currentIndex = 0, shuffle = false, repeat = false;

  const audio = $("audio");
  const safe = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const time = (n) => Number.isFinite(n) ? `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,"0")}` : "0:00";
  function status(msg) { const el = $("player-status"); if (el) el.textContent = msg; }
  function renderPlaylist() {
    const list = $("playlist");
    if (!list) return;
    $("song-count").textContent = songs.length;
    if (!songs.length) {
      list.innerHTML = '<div class="empty-state">Your love-song collection will appear here. 💗</div>';
      return;
    }
    list.innerHTML = songs.map((s,i) => `<button class="track-row ${i===currentIndex?"active":""}" data-index="${i}" style="display:flex;width:100%;align-items:center;gap:12px;text-align:left;padding:12px;border:0;border-bottom:1px solid rgba(255,255,255,.08);background:transparent;color:inherit;cursor:pointer"><span style="width:42px;height:42px;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:#44254e;flex-shrink:0">${s.cover_url ? `<img src="${safe(s.cover_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : "♥"}</span><span style="min-width:0;flex:1"><strong style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${safe(s.title)}</strong><small>${safe(s.artist || "LMR")}</small></span><span>▶</span></button>`).join("");
    list.querySelectorAll("[data-index]").forEach(b => b.addEventListener("click", () => playSong(Number(b.dataset.index))));
    const fav = $("favorite-song");
    if (fav) {
      const old = fav.value;
      fav.innerHTML = '<option value="">Any song / just a message</option>' + songs.map(s => `<option value="${safe(s.id)}">${safe(s.title)}</option>`).join("");
      if (songs.some(s => s.id === old)) fav.value = old;
    }
  }
  function playSong(i) {
    if (!songs.length) return;
    currentIndex = (i + songs.length) % songs.length;
    const s = songs[currentIndex];
    audio.src = s.audio_url;
    $("track-title").textContent = s.title;
    $("track-artist").textContent = s.artist || "LMR";
    const cover = $("cover"), placeholder = $("cover-placeholder");
    if (cover && placeholder) {
      if (s.cover_url) { cover.src = s.cover_url; cover.classList.remove("hidden"); placeholder.classList.add("hidden"); }
      else { cover.classList.add("hidden"); placeholder.classList.remove("hidden"); }
    }
    renderPlaylist();
    audio.play().then(() => { $("play").textContent = "⏸"; status("Now playing: " + s.title); }).catch(() => status("Press play to listen to " + s.title + "."));
  }
  async function loadSongs() {
    if (!db) { status("Music service did not load. Refresh and try again."); return; }
    const { data, error } = await db.from("songs").select("id,title,artist,audio_url,cover_url,sort_order,created_at").eq("published",true).order("sort_order").order("created_at");
    if (error) { console.error(error); status("Could not load songs. Please refresh in a moment."); return; }
    songs = data || [];
    renderPlaylist();
    if (songs.length) { playSong(0); audio.pause(); $("play").textContent = "▶"; status("Choose a song and press play."); }
    else status("Your playlist is ready. Add songs from the Admin page.");
  }
  async function loadMessages() {
    if (!db) return;
    const list = $("messages-list");
    const { data, error } = await db.from("messages").select("id,name,message,song_title,likes,created_at").eq("approved",true).order("created_at",{ascending:false}).limit(100);
    if (error) { console.warn(error); return; }
    $("message-count").textContent = (data || []).length;
    list.innerHTML = data?.length ? data.map(m => `<article class="note-card" style="padding:14px;margin:10px 0;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.04)"><p style="white-space:pre-wrap;overflow-wrap:anywhere">${safe(m.message)}</p><div style="display:flex;justify-content:space-between;gap:12px;opacity:.8;font-size:.85rem"><strong>${safe(m.name)}</strong><span>${m.song_title ? "♪ "+safe(m.song_title)+" · " : ""}${new Date(m.created_at).toLocaleDateString()}</span></div><button type="button" class="like-note" data-id="${safe(m.id)}" style="margin-top:8px;border:0;background:transparent;color:inherit;cursor:pointer">♥ <span>${Number(m.likes)||0}</span></button></article>`).join("") : '<div class="empty-state">Be the first to leave a note. 💌</div>';
    list.querySelectorAll(".like-note").forEach(b => b.addEventListener("click", async () => {
      // Like counts are intentionally not writable by anonymous clients; show a friendly message.
      b.disabled = true; b.title = "Likes will be enabled after the secure likes endpoint is added.";
      b.querySelector("span").textContent = Number(b.querySelector("span").textContent) || 0;
      status("Thanks for the love! The public likes feature is being finalized.");
    }));
  }
  $("play")?.addEventListener("click", () => {
    if (!songs.length) { status("Add your first song in the Admin page."); return; }
    if (audio.paused) audio.play().then(() => $("play").textContent="⏸").catch(()=>{}); else { audio.pause(); $("play").textContent="▶"; }
  });
  $("prev")?.addEventListener("click", () => playSong(currentIndex-1));
  $("next")?.addEventListener("click", () => playSong(shuffle ? Math.floor(Math.random()*songs.length) : currentIndex+1));
  $("shuffle")?.addEventListener("click", () => { shuffle=!shuffle; $("shuffle").style.opacity=shuffle?"1":".65"; });
  $("repeat")?.addEventListener("click", () => { repeat=!repeat; audio.loop=repeat; $("repeat").style.opacity=repeat?"1":".65"; });
  $("volume")?.addEventListener("input", e => audio.volume=Number(e.target.value));
  audio?.addEventListener("timeupdate", () => {
    if (Number.isFinite(audio.duration)) { $("seek").max=audio.duration; $("seek").value=audio.currentTime; $("current-time").textContent=time(audio.currentTime); $("duration").textContent=time(audio.duration); }
  });
  $("seek")?.addEventListener("input", e => { if (Number.isFinite(audio.duration)) audio.currentTime=Number(e.target.value); });
  audio?.addEventListener("ended", () => { if (!repeat && songs.length) playSong(shuffle ? Math.floor(Math.random()*songs.length) : currentIndex+1); });
  $("message-text")?.addEventListener("input", e => { $("char-count").textContent=e.target.value.length; });
  $("message-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const btn=e.submitter, name=$("sender-name").value.trim(), message=$("message-text").value.trim(), songId=$("favorite-song").value;
    if (!name || !message) return;
    btn.disabled=true; const old=btn.textContent; btn.textContent="Sending…";
    const chosen=songs.find(s=>s.id===songId);
    const { error } = await db.from("messages").insert({name,message,song_id:songId||null,song_title:chosen?.title||null,approved:false,likes:0});
    const statusEl=$("form-status");
    if (error) { console.error(error); statusEl.textContent="Sorry, your note could not be sent. Please try again later."; }
    else { statusEl.textContent="Your love note was sent for approval. Thank you! ❤️"; e.target.reset(); $("char-count").textContent="0"; }
    btn.disabled=false; btn.textContent=old;
  });
  loadSongs(); loadMessages();
})();