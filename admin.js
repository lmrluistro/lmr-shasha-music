/* See README.md before using a live website. Never place a Supabase service_role key in browser code. */
const SUPABASE_URL="";const SUPABASE_ANON_KEY="";const ADMIN_EMAIL=""; // Set your admin email after enabling Supabase Auth.
const db=(SUPABASE_URL&&SUPABASE_ANON_KEY&&window.supabase)?window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
const $=id=>document.getElementById(id);const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let songs=[];
async function adminUser(){if(!db)return null;const {data}=await db.auth.getSession();let user=data.session?.user;if(!user){const email=prompt("Admin email (must be authorized in Supabase):");if(!email)return null;const password=prompt("Password:");if(!password)return null;const res=await db.auth.signInWithPassword({email,password});if(res.error){alert("Sign-in failed: "+res.error.message);return null}user=res.data.user}if(!ADMIN_EMAIL||user.email?.toLowerCase()!==ADMIN_EMAIL.toLowerCase()){alert("This account is not authorized as the site admin.");await db.auth.signOut();return null}return user}
function demoSongs(){return JSON.parse(localStorage.getItem("lmr_demo_songs")||"[]")}
async function loadAdmin(){
 if(!db){songs=demoSongs();$("setup-status").textContent="Demo mode only. Changes on this device will not appear for other listeners.";renderSongs();renderAdminMessages(JSON.parse(localStorage.getItem("lmr_demo_messages")||"[]"));return}
 const user=await adminUser();if(!user){$("setup-status").textContent="Sign in with your authorized admin account to manage content.";return}
 $("setup-status").textContent="Connected. Signed in as "+user.email;
 let res=await db.from("songs").select("*").order("created_at",{ascending:false});if(!res.error)songs=res.data||[];renderSongs();
 res=await db.from("messages").select("*").order("created_at",{ascending:false}).limit(200);if(!res.error)renderAdminMessages(res.data||[]);
}
function renderSongs(){
 $("admin-count").textContent=songs.length;
 $("admin-songs").innerHTML=songs.length?songs.map(s=>`<div class="song-row"><span class="song-info"><strong>${safe(s.title)}</strong><small>${safe(s.artist||"LMR ❤️ SHASHA")} ${s.published===false?"• Draft":"• Published"}</small></span><button class="admin-action" data-delete-song="${safe(s.id)}">Delete</button></div>`).join(""):'<div class="empty-state">No songs added yet.</div>';
 document.querySelectorAll("[data-delete-song]").forEach(b=>b.addEventListener("click",()=>deleteSong(b.dataset.deleteSong)));
}
async function deleteSong(id){if(!confirm("Delete this song from the playlist?"))return;if(!db){songs=songs.filter(s=>String(s.id)!==String(id));localStorage.setItem("lmr_demo_songs",JSON.stringify(songs));renderSongs();return}const {error}=await db.from("songs").delete().eq("id",id);if(error){alert("Delete failed: "+error.message);return}loadAdmin()}
function renderAdminMessages(rows){
 $("admin-messages").innerHTML=rows.length?rows.map(m=>`<article class="message-card"><div class="message-top"><div><strong>${safe(m.name)}</strong><div class="message-song">${m.approved?"✓ Approved":"⌛ Pending approval"}</div></div><time>${m.created_at?new Date(m.created_at).toLocaleDateString():""}</time></div><p>${safe(m.message)}</p><div class="admin-actions">${!m.approved?`<button class="admin-action approve" data-approve="${safe(m.id)}">Approve</button>`:""}<button class="admin-action" data-delete-message="${safe(m.id)}">Delete</button></div></article>`).join(""):'<div class="empty-state">No listener messages yet.</div>';
 document.querySelectorAll("[data-approve]").forEach(b=>b.addEventListener("click",()=>moderate(b.dataset.approve,true)));
 document.querySelectorAll("[data-delete-message]").forEach(b=>b.addEventListener("click",()=>moderate(b.dataset.deleteMessage,false,true)));
}
async function moderate(id,approved,remove=false){if(!confirm(remove?"Delete this message?":"Approve this message for public display?"))return;if(!db){let rows=JSON.parse(localStorage.getItem("lmr_demo_messages")||"[]");rows=remove?rows.filter(m=>String(m.id)!==String(id)):rows.map(m=>String(m.id)===String(id)?{...m,approved:true}:m);localStorage.setItem("lmr_demo_messages",JSON.stringify(rows));renderAdminMessages(rows);return}const res=remove?await db.from("messages").delete().eq("id",id):await db.from("messages").update({approved:true}).eq("id",id);if(res.error){alert("Action failed: "+res.error.message);return}loadAdmin()}
$("song-form").addEventListener("submit",async e=>{e.preventDefault();const title=$("title").value.trim(),artist=$("artist").value.trim()||"LMR ❤️ SHASHA",audioFile=$("audio-file").files[0],coverFile=$("cover-file").files[0],status=$("admin-status");if(!audioFile)return;
 if(!db){const toDataURL=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});status.textContent="Preparing local demo song…";try{const item={id:Date.now(),title,artist,audio_url:await toDataURL(audioFile),cover_url:coverFile?await toDataURL(coverFile):"",published:true};songs.push(item);localStorage.setItem("lmr_demo_songs",JSON.stringify(songs));renderSongs();status.textContent="Added in this browser only. Large files may exceed browser storage limits.";e.target.reset()}catch(err){status.textContent="Could not store the file. Connect Supabase for larger/shared files."}return}
 const user=await adminUser();if(!user){status.textContent="Admin sign-in required.";return}status.textContent="Uploading audio…";
 try{const safeName=f=>f.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-");const audioPath=`${crypto.randomUUID()}-${safeName(audioFile)}`;let up=await db.storage.from("songs").upload(audioPath,audioFile,{upsert:false});if(up.error)throw up.error;const audioUrl=db.storage.from("songs").getPublicUrl(audioPath).data.publicUrl;let coverUrl=null;if(coverFile){status.textContent="Uploading cover…";const coverPath=`${crypto.randomUUID()}-${safeName(coverFile)}`;up=await db.storage.from("covers").upload(coverPath,coverFile,{upsert:false});if(up.error)throw up.error;coverUrl=db.storage.from("covers").getPublicUrl(coverPath).data.publicUrl}
 const {error}=await db.from("songs").insert({title,artist,audio_url:audioUrl,cover_url:coverUrl,published:true,sort_order:songs.length});if(error)throw error;status.textContent="Song added to the shared playlist! ❤️";e.target.reset();loadAdmin()
 }catch(err){console.error(err);status.textContent="Upload failed: "+(err.message||"Check your Supabase storage and table setup.")}});
loadAdmin();
