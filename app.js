/* Supabase setup: copy values from README.md. Public website only uses the anon key. */
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
const hasSupabase = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = id => document.getElementById(id);
const audio = $("audio");
let songs = [], currentIndex = -1, shuffled = false, repeatMode = 0;
const demoSongs = [];
const formatTime = n => { if (!Number.isFinite(n)) return "0:00"; return `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,"0")}`; };
const safe = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function currentSong(){return songs[currentIndex]||null}
function setStatus(t){$("player-status").textContent=t}
function updateSongSelect(){const select=$("favorite-song");select.innerHTML='<option value="">Any song / just a message</option>'+songs.map(s=>`<option value="${safe(s.id)}">${safe(s.title)}</option>`).join("")}
function renderPlaylist(){
 $("song-count").textContent=songs.length;
 $("playlist").innerHTML=songs.length?songs.map((s,i)=>`<button class="song-row ${i===currentIndex?'active':''}" data-index="${i}" type="button"><span class="song-number">${String(i+1).padStart(2,"0")}</span><img class="song-thumb" src="${safe(s.cover_url||"")}" alt="" onerror="this.style.visibility='hidden'"><span class="song-info"><strong>${safe(s.title)}</strong><small>${safe(s.artist||"LMR ❤️ SHASHA")}</small></span><span class="song-duration">▶</span></button>`).join(""):'<div class="empty-state">Your love-song collection will appear here. 💗</div>';
 $("playlist").querySelectorAll("[data-index]").forEach(el=>el.addEventListener("click",()=>playIndex(Number(el.dataset.index))));
 updateSongSelect();
}
async function loadSongs(){
 if(!db){songs=JSON.parse(localStorage.getItem("lmr_demo_songs")||"[]");renderPlaylist();setStatus(songs.length?"Preview mode — connect Supabase to share the library with everyone.":"Add songs in Admin to start your playlist.");return}
 const {data,error}=await db.from("songs").select("*").eq("published",true).order("sort_order",{ascending:true}).order("created_at",{ascending:true});
 if(error){setStatus("Could not load songs. Check the Supabase setup.");console.error(error);return}
 songs=data||[];renderPlaylist();
}
function playIndex(i){
 if(!songs.length)return;currentIndex=(i+songs.length)%songs.length;const s=currentSong();
 $("track-title").textContent=s.title;$("track-artist").textContent=s.artist||"LMR ❤️ SHASHA";
 if(s.cover_url){$("cover").src=s.cover_url;$("cover").classList.remove("hidden");$("cover-placeholder").classList.add("hidden")}else{$("cover").classList.add("hidden");$("cover-placeholder").classList.remove("hidden")}
 audio.src=s.audio_url;audio.play().then(()=>{$("play").textContent="Ⅱ";setStatus("Now playing — enjoy the song. ❤️")}).catch(()=>{ $("play").textContent="▶";setStatus("Tap Play to start this song.") });
 renderPlaylist();
}
$("play").addEventListener("click",()=>{if(!currentSong()){if(songs.length)playIndex(0);else setStatus("Add songs in the Admin page first.");return}if(audio.paused){audio.play().then(()=>$("play").textContent="Ⅱ").catch(()=>setStatus("Tap Play again to start."))}else{audio.pause();$("play").textContent="▶"}});
$("prev").addEventListener("click",()=>{if(songs.length)playIndex(currentIndex<=0?songs.length-1:currentIndex-1)});
$("next").addEventListener("click",()=>{if(songs.length)playIndex(shuffled?Math.floor(Math.random()*songs.length):(currentIndex+1)%songs.length)});
$("shuffle").addEventListener("click",()=>{shuffled=!shuffled;$("shuffle").classList.toggle("active",shuffled);setStatus(shuffled?"Shuffle is on.":"Shuffle is off.")});
$("repeat").addEventListener("click",()=>{repeatMode=(repeatMode+1)%3;audio.loop=repeatMode===1;$("repeat").classList.toggle("active",repeatMode!==0);$("repeat").textContent=repeatMode===1?"🔂": "🔁";setStatus(["Repeat off.","Repeating this song.","Playlist repeat selected."][repeatMode]);});
$("volume").addEventListener("input",e=>audio.volume=Number(e.target.value));audio.volume=.85;
audio.addEventListener("timeupdate",()=>{if(audio.duration){$("seek").value=audio.currentTime/audio.duration*100;$("current-time").textContent=formatTime(audio.currentTime);$("duration").textContent=formatTime(audio.duration)}});
$("seek").addEventListener("input",()=>{if(audio.duration)audio.currentTime=Number($("seek").value)/100*audio.duration});
audio.addEventListener("ended",()=>{if(repeatMode===1)return;if(currentIndex<songs.length-1||repeatMode===2)playIndex(shuffled?Math.floor(Math.random()*songs.length):(currentIndex+1)%songs.length);else $("play").textContent="▶"});
$("message-text").addEventListener("input",()=> $("char-count").textContent=$("message-text").value.length);
function renderMessages(rows){
 $("message-count").textContent=rows.length;
 $("messages-list").innerHTML=rows.length?rows.map(m=>`<article class="message-card"><div class="message-top"><div><strong>${safe(m.name)}</strong>${m.song_title?`<div class="message-song">♫ ${safe(m.song_title)}</div>`:""}</div><time>${m.created_at?new Date(m.created_at).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"Just now"}</time></div><p>${safe(m.message)}</p><button class="like-btn" type="button" data-like="${safe(m.id)}">♡ Like <span>${Number(m.likes||0)}</span></button></article>`).join(""):'<div class="empty-state">Be the first to leave a note. ✨</div>';
 $("messages-list").querySelectorAll("[data-like]").forEach(btn=>btn.addEventListener("click",()=>likeMessage(btn.dataset.like,btn)));
}
async function loadMessages(){
 if(!db){const rows=JSON.parse(localStorage.getItem("lmr_demo_messages")||"[]");renderMessages(rows);return}
 const {data,error}=await db.from("messages").select("id,name,message,song_title,created_at,likes").eq("approved",true).order("created_at",{ascending:false}).limit(100);
 if(error){console.error(error);$("messages-list").innerHTML='<div class="empty-state">Messages are temporarily unavailable.</div>';return}renderMessages(data||[]);
}
async function likeMessage(id,btn){
 if(!db){const rows=JSON.parse(localStorage.getItem("lmr_demo_messages")||"[]");const m=rows.find(x=>String(x.id)===String(id));if(m){m.likes=(m.likes||0)+1;localStorage.setItem("lmr_demo_messages",JSON.stringify(rows));renderMessages(rows)}return}
 // Prevent repeated likes in this browser; database RPC can be added for stronger rate limiting.
 const key="liked_"+id;if(localStorage.getItem(key)){btn.textContent="♥ Liked";return}
 const {data,error}=await db.rpc("increment_message_like",{message_id:id});
 if(error){btn.textContent="♡ Like";return}localStorage.setItem(key,"1");btn.classList.add("liked");btn.innerHTML=`♥ Liked <span>${data??""}</span>`;loadMessages();
}
$("message-form").addEventListener("submit",async e=>{
 e.preventDefault();const name=$("sender-name").value.trim(),message=$("message-text").value.trim(),songId=$("favorite-song").value;
 if(!name||!message)return;
 const song=songs.find(s=>String(s.id)===String(songId));
 const payload={name,message,song_id:songId||null,song_title:song?.title||null};
 const status=$("form-status");status.textContent="Sending your love note…";
 if(!db){const rows=JSON.parse(localStorage.getItem("lmr_demo_messages")||"[]");rows.unshift({id:Date.now(),name,message,song_title:payload.song_title,created_at:new Date().toISOString(),likes:0});localStorage.setItem("lmr_demo_messages",JSON.stringify(rows));renderMessages(rows);status.textContent="Saved in this browser only. Connect Supabase to share messages publicly.";e.target.reset();$("char-count").textContent="0";return}
 const {error}=await db.from("messages").insert(payload);
 if(error){status.textContent="Could not send right now. Please try again later.";console.error(error);return}
 status.textContent="Your note was sent for moderation. Thanks for sharing the love! ❤️";e.target.reset();$("char-count").textContent="0";loadMessages();
});
loadSongs();loadMessages();
