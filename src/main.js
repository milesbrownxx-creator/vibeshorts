import { firebaseReady, auth, db, storage } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile, onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytesResumable, deleteObject } from "firebase/storage";

const $ = (id) => document.getElementById(id);
// Canonical public site used when sharing from the packaged Android WebView.
const PUBLIC_APP_URL = "https://jolly-lollipop-4a2d6d.netlify.app";
function publicPageURL(params){
 const localWeb=location.protocol==="https:"&&location.hostname!=="localhost"&&location.hostname!=="127.0.0.1";
 const u=localWeb?new URL(location.pathname,location.origin):new URL("/",PUBLIC_APP_URL);
 u.search="";
 for(const [key,value] of Object.entries(params||{}))u.searchParams.set(key,String(value));
 return u.toString();
}
const s = { user:null, profile:null, profileCache:{}, posts:[], profileItems:[], profileFollowers:0, profileFollowing:0, profileTab:"grid", screen:"home", following:new Set(), filter:"For You", tag:"", commentPost:null, sharePayload:null, sharedPostHandled:false, stopFeed:null, stopComments:null, themeMode:"auto" };
const messages = {
 "auth/email-already-in-use":"That email already has an account. Sign in instead.",
 "auth/invalid-email":"Enter a valid email address.",
 "auth/invalid-credential":"Email or password is incorrect.",
 "auth/user-not-found":"No account was found for that email.",
 "auth/wrong-password":"Email or password is incorrect.",
 "auth/weak-password":"Use a password with at least 6 characters.",
 "auth/network-request-failed":"Network error. Check your internet connection.",
 "auth/too-many-requests":"Too many attempts. Wait a little and retry.",
 "auth/operation-not-allowed":"Enable Email/Password in Firebase Authentication.",
 "storage/unauthorized":"Storage rejected this upload. Make sure Firebase Storage is enabled and the latest Storage rules are published.",
 "storage/bucket-not-found":"Firebase Storage bucket was not found. Check the bucket name in Firebase and the app configuration.",
 "storage/project-not-found":"Firebase could not find the Storage project. Check the Firebase project configuration.",
 "storage/quota-exceeded":"Storage quota was exceeded. Check Firebase billing and usage limits.",
 "storage/retry-limit-exceeded":"The upload connection failed repeatedly. Try a stronger internet connection or a smaller video.",
 "storage/canceled":"The upload was canceled. Try again.",
 "permission-denied":"Firebase denied this action. The deployed Firestore or Storage rules may need updating.",
 "unavailable":"The service is temporarily unavailable. Check your internet connection and try again."
};
function err(e){ return messages[e && e.code] || (e && e.message) || "Something went wrong. Try again."; }
function esc(x){ return String(x == null ? "" : x).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function safeUrl(x){ try { const u=new URL(x, location.href); return u.protocol==="https:" || u.origin===location.origin ? u.href : ""; } catch { return ""; } }
function photoURL(){return safeUrl(s.profile?.avatarURL||s.user?.photoURL||"");}
function setAvatar(el,url,fallback,allowBlob=false){
 if(!el)return;
 let src=safeUrl(url);
 if(!src&&allowBlob&&typeof url==="string"&&url.startsWith("blob:"))src=url;
 el.textContent="";
 el.classList.toggle("avatar-has-image",!!src);
 if(src){const img=document.createElement("img");img.className="avatar-image";img.src=src;img.alt="";img.draggable=false;el.appendChild(img);}
 else el.textContent=fallback||"V";
}
function avatarHTML(label,url){
 const src=safeUrl(url);
 return src?'<img class="avatar-image" src="'+esc(src)+'" alt="" loading="lazy">':esc(initials(label));
}
function inferVideoMime(file){
 if(file?.type?.startsWith("video/"))return file.type;
 const ext=String(file?.name||"").toLowerCase().split(".").pop();
 return ({mp4:"video/mp4",m4v:"video/x-m4v",mov:"video/quicktime",webm:"video/webm",ogv:"video/ogg",ogg:"video/ogg","3gp":"video/3gpp","3gpp":"video/3gpp",mkv:"video/x-matroska",avi:"video/x-msvideo",mpeg:"video/mpeg",mpg:"video/mpeg"}[ext]||"");
}
function inferImageMime(file){
 if(file?.type?.startsWith("image/"))return file.type;
 const ext=String(file?.name||"").toLowerCase().split(".").pop();
 return ({jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",heic:"image/heic",heif:"image/heif"}[ext]||"");
}
function applyTheme(){
 let mode="auto";try{mode=localStorage.getItem("vibeshorts-theme")||"auto";}catch{}
 if(!["auto","light","dark"].includes(mode))mode="auto";
 s.themeMode=mode;
 const dark=mode==="dark"||(mode==="auto"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches);
 document.documentElement.dataset.theme=dark?"dark":"light";
 const b=$("top-theme");
 if(b){b.textContent=mode==="dark"?"☾":mode==="light"?"☀":"◐";b.title="Theme: "+mode[0].toUpperCase()+mode.slice(1)+" · tap to change";b.setAttribute("aria-label",b.title);}
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=dark?"#101014":"#ffffff";
}
function cycleTheme(){
 const next=s.themeMode==="auto"?"light":s.themeMode==="light"?"dark":"auto";
 try{localStorage.setItem("vibeshorts-theme",next);}catch{}
 applyTheme();toast("Appearance set to "+next+".");
}
function copyText(text){
 if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
 return new Promise((resolve,reject)=>{
  const area=document.createElement("textarea");area.value=text;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();
  const ok=document.execCommand("copy");area.remove();ok?resolve():reject(new Error("Copy was not permitted"));
 });
}
function openExternal(url){
 const w=window.open(url,"_blank","noopener,noreferrer");
 if(!w)location.href=url;
}
function initials(n){ const a=String(n||"Creator").trim().split(/\s+/); return ((a[0]||"C")[0]+(a.length>1?a[1][0]:"")).toUpperCase(); }
function name(){ return s.profile?.displayName || s.user?.displayName || (s.user?.email||"").split("@")[0] || "Creator"; }
function handle(){ return s.profile?.handle || name().toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20) || "creator"; }
function dateText(ts){ const d=ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null; return d && !isNaN(d.getTime()) ? new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(d) : "Just now"; }
function toast(txt,bad=false){ const e=$("toast"); e.textContent=txt; e.classList.toggle("error",bad); e.classList.add("visible"); clearTimeout(toast.t); toast.t=setTimeout(()=>e.classList.remove("visible"),3800); }
function notice(txt,bad=false){ const e=$("notice"); e.textContent=txt; e.classList.remove("hidden","notice-error"); if(bad)e.classList.add("notice-error"); }
function open(id){ $(id)?.classList.add("open"); }
function close(id){ $(id)?.classList.remove("open"); }
function problem(id,txt){ $(id).textContent=txt; $(id).classList.remove("hidden"); }
function clearProblem(id){ const e=$(id); if(e){e.textContent="";e.classList.add("hidden");} }
function mode(m){ const up=m==="signup"; $("auth-title").textContent=up?"Create your account":"Welcome back"; $("auth-subtitle").textContent=up?"Join VibeShorts and share your videos.":"Sign in to share videos across your devices."; $("auth-tab-signup").classList.toggle("active",up); $("auth-tab-signin").classList.toggle("active",!up); $("display-name-wrap").classList.toggle("hidden",!up); $("display-name").required=up; $("auth-password").autocomplete=up?"new-password":"current-password"; $("auth-submit").textContent=up?"Create account":"Sign in"; $("auth-form").dataset.mode=m; clearProblem("auth-error"); }
function askLogin(msg){ toast(msg||"Sign in first to use this feature."); mode("signin"); open("auth-modal"); }
function connection(txt,kind){ const e=$("connection-state"); e.lastElementChild.textContent=txt; e.className="connection connection-"+kind; }
async function ensureProfile(u){
 const r=doc(db,"profiles",u.uid), snap=await getDoc(r); if(snap.exists()) return snap.data();
 const n=(u.displayName||(u.email||"").split("@")[0]||"Creator").slice(0,40);
 const p={uid:u.uid,displayName:n,handle:n.toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20)||("creator"+u.uid.slice(0,6)),bio:"",avatarURL:u.photoURL||"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 await setDoc(r,p); return {...p,createdAt:new Date()};
}
function accountUI(){
 const yes=!!s.user;
 $("header-auth").textContent=yes?"Sign out":"Sign in";
 $("header-signup").classList.toggle("hidden",yes);
 $("header-profile").classList.toggle("hidden",!yes);
 setAvatar($("header-profile"),photoURL(),initials(name()));
 setAvatar($("composer-avatar"),photoURL(),initials(name()));
 setAvatar($("right-avatar"),photoURL(),initials(name()));
 setAvatar($("profile-screen-avatar"),photoURL(),initials(name()));
 const story=$("story-self-photo");
 if(story){
  const src=photoURL();
  story.style.backgroundImage=src?"url("+JSON.stringify(src)+")":"";
  story.textContent=src?"":yes?initials(name()):"＋";
 }
 $("creator-name").textContent=yes?name():"Guest creator";
 $("creator-handle").textContent=yes?"@"+handle():"Sign in to build your profile";
 $("account-action").textContent=yes?"Edit your profile":"Create your profile";
 $("my-video-count").textContent=s.posts.filter(p=>p.authorUid===s.user?.uid).length;
 $("my-like-count").textContent=s.posts.filter(p=>p.authorUid===s.user?.uid).reduce((a,p)=>a+(Number(p.likesCount)||0),0);
 $("my-following-count").textContent=s.following.size;
 $("profile-screen-handle").textContent=yes?handle():"your_profile";
 $("profile-screen-name").textContent=yes?name():"Join VibeShorts";
 $("profile-screen-bio-text").textContent=yes?(s.profile?.bio||"Welcome to my VibeShorts page."):"Sign in or create an account to share reels, follow creators and build your profile.";
 $("profile-screen-post-count").textContent=yes?(s.profileItems.length||s.posts.filter(p=>p.authorUid===s.user?.uid).length):"—";
 $("profile-screen-follower-count").textContent=yes?s.profileFollowers:"—";
 $("profile-screen-following-count").textContent=yes?s.profileFollowing:"—";
 $("profile-screen-signin").classList.toggle("hidden",yes);
 $("profile-screen-signup").classList.toggle("hidden",yes);
 $("profile-screen-edit").classList.toggle("hidden",!yes);
 $("profile-screen-share").classList.toggle("hidden",!yes);
 if(s.screen==="profile")renderProfileGrid();
}
function formatCount(n){
 const v=Number(n)||0;
 if(v>=1e6)return (v/1e6).toFixed(v>=1e7?0:1).replace(/\.0$/,"")+"M";
 if(v>=1e3)return (v/1e3).toFixed(v>=1e4?0:1).replace(/\.0$/,"")+"K";
 return String(v);
}
function postCard(p){
 const url=safeUrl(p.videoURL); if(!url)return "";
 const id=esc(p.id), n=esc(p.authorName||"Creator"), h=esc(p.authorHandle||"creator"), cap=esc(p.caption||""), tag=esc(p.tags||"");
 const mine=s.user?.uid===p.authorUid, authorAvatar=avatarHTML(p.authorName||"Creator",p.authorAvatarURL||s.profileCache[p.authorUid]?.avatarURL);
 const saved=(()=>{try{return (JSON.parse(localStorage.getItem("vibeshorts-saved")||"[]")).includes(p.id);}catch{return false;}})();
 const tagHtml=tag.split(/\s+/).filter(x=>x.startsWith("#")).map(x=>'<button data-tag="'+esc(x.slice(1))+'">'+esc(x)+'</button>').join(" ");
 return '<article class="reel-card insta-post" id="post-'+id+'"><header class="insta-post-header"><button class="creator-link" data-profile="'+esc(p.authorUid)+'"><span class="avatar">'+authorAvatar+'</span><span class="creator-meta"><strong>'+n+'</strong><small>@'+h+' · '+esc(dateText(p.createdAt))+'</small></span></button>'+(mine?'<button class="icon-button" data-delete-post="'+id+'" aria-label="Delete post">•••</button>':'<button class="icon-button" aria-label="More options" data-post-more="'+id+'">•••</button>')+'</header><video class="reel-video" src="'+esc(url)+'" controls playsinline preload="metadata"></video><div class="insta-post-content"><div class="insta-actions"><div class="insta-actions-left"><button class="social-icon" data-like-post="'+id+'" aria-label="Like reel">♡</button><button class="social-icon" data-comments-post="'+id+'" aria-label="Comments">◯</button><button class="social-icon" data-share-post="'+id+'" aria-label="Share reel">➤</button></div><button class="social-icon save-post '+(saved?"is-saved":"")+'" data-save-post="'+id+'" aria-label="'+(saved?"Remove saved reel":"Save reel")+'">'+(saved?"▣":"♧")+'</button></div><p class="insta-like-count">'+formatCount(p.likesCount||0)+' likes</p>'+(cap?'<p class="insta-caption"><strong>'+n+'</strong> '+cap+'</p>':'')+(tagHtml?'<p class="reel-tags">'+tagHtml+'</p>':'')+'<button class="view-comments" data-comments-post="'+id+'">View comments</button><div class="insta-date">'+esc(dateText(p.createdAt))+'</div></div></article>';
}
function visible(){
 let p=s.posts.slice();
 if(s.tag)p=p.filter(x=>((x.tags||"")+" "+(x.caption||"")).toLowerCase().includes(s.tag.toLowerCase()));
 if(s.filter==="Following")p=p.filter(x=>s.following.has(x.authorUid)||x.authorUid===s.user?.uid);
 if(s.filter==="Trending")p.sort((a,b)=>(Number(b.likesCount)||0)-(Number(a.likesCount)||0));
 return p;
}
function render(){
 const p=visible(), feed=$("feed"); feed.innerHTML=p.map(postCard).filter(Boolean).join("");
 if(!p.length){
  const msg=!firebaseReady?"Firebase is not configured. Add the VITE_FIREBASE settings to the deployed build.":s.filter==="Following"&&!s.user?"Sign in to see videos from creators you follow.":s.tag?"No videos found for this hashtag.":"No videos yet. Sign in and publish the first reel.";
  feed.innerHTML='<div class="empty-state"><div class="empty-icon">▶</div><h3>Nothing here yet</h3><p>'+esc(msg)+'</p><button class="btn btn-primary" id="empty-create">Create a video post</button></div>';
 }
 document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",s.screen==="home"&&b.dataset.filter===s.filter));
 $("mobile-account").classList.toggle("active",s.screen==="profile");
 accountUI();
 if(s.screen==="profile")renderProfileGrid();
}

function switchScreen(screen){
 s.screen=screen;
 $("home-screen").classList.toggle("hidden",screen!=="home");
 $("profile-screen").classList.toggle("hidden",screen!=="profile");
 document.querySelectorAll(".mobile-nav-item").forEach(b=>b.classList.toggle("active",b.id==="mobile-account"?screen==="profile":screen==="home"&&b.dataset.filter===s.filter));
 if(screen==="profile"){ accountUI(); renderProfileGrid(); }
 window.scrollTo({top:0,behavior:"smooth"});
}
function renderProfileGrid(){
 const grid=$("profile-grid"); if(!grid)return;
 document.querySelectorAll("[data-profile-tab]").forEach(b=>b.classList.toggle("active",b.dataset.profileTab===s.profileTab));
 if(!s.user){
  grid.innerHTML='<div class="profile-grid-empty"><span>◉</span><strong>Your profile starts here</strong><p>Sign in or create an account to share your own reels.</p><button id="profile-grid-create" class="btn btn-primary">＋ Create an account</button></div>';
  return;
 }
 if(s.profileTab==="reposts"||s.profileTab==="tagged"){
  grid.innerHTML='<div class="profile-grid-empty"><span>'+(s.profileTab==="reposts"?"⟳":"♙")+'</span><strong>'+(s.profileTab==="reposts"?"No reposts yet":"No tagged videos yet")+'</strong><p>These items will appear here when the feature is available.</p></div>';return;
 }
 const items=s.profileItems.filter(p=>safeUrl(p.videoURL));
 if(!items.length){
  grid.innerHTML='<div class="profile-grid-empty"><span>▦</span><strong>Your posts will appear here</strong><p>Upload a video to start building your profile grid.</p><button id="profile-grid-create" class="btn btn-primary">＋ Create your first reel</button></div>';return;
 }
 grid.innerHTML=items.map(p=>'<button class="profile-grid-tile" data-profile-post="'+esc(p.id)+'" aria-label="Open reel"><video src="'+esc(safeUrl(p.videoURL))+'" muted playsinline preload="metadata"></video><span class="grid-tile-overlay"><b>▶</b><span>'+formatCount(p.likesCount||0)+' likes</span></span></button>').join("");
}
async function showOwnProfile(){
 switchScreen("profile");
 if(!s.user){s.profileItems=[];s.profileFollowers=0;s.profileFollowing=0;accountUI();renderProfileGrid();return;}
 if(!firebaseReady||!db){toast("Firebase is not connected in this build.",true);return;}
 $("profile-screen-bio-text").textContent="Loading your profile…";
 try{
  const uid=s.user.uid;
  const [pSnap,followers,following,posts]=await Promise.all([
   getDoc(doc(db,"profiles",uid)),
   getDocs(collection(db,"profiles",uid,"followers")),
   getDocs(collection(db,"profiles",uid,"following")),
   getDocs(query(collection(db,"posts"),where("authorUid","==",uid),limit(60)))
  ]);
  if(pSnap.exists())s.profile=pSnap.data();
  s.profileFollowers=followers.size;s.profileFollowing=following.size;
  s.profileItems=posts.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
  accountUI();renderProfileGrid();
 }catch(e){console.error("Profile load:",e);$("profile-screen-bio-text").textContent="Profile details could not load: "+err(e);toast("Could not load your profile.",true);}
}
async function shareOwnProfile(){
 if(!s.user)return askLogin("Sign in before sharing your profile.");
 const url=publicPageURL({profile:s.user.uid});
 openShareModal({title:"Share your VibeShorts profile",text:"Follow "+name()+" on VibeShorts",url});
}
function toggleSavedPost(id){
 try{
  const saved=new Set(JSON.parse(localStorage.getItem("vibeshorts-saved")||"[]"));
  if(saved.has(id)){saved.delete(id);toast("Removed from saved reels.");}else{saved.add(id);toast("Reel saved on this device.");}
  localStorage.setItem("vibeshorts-saved",JSON.stringify([...saved]));render();
 }catch(e){toast("This browser could not save the reel.",true);}
}

async function hydrateCreatorProfiles(){
 if(!db)return;
 const ids=[...new Set(s.posts.map(p=>p.authorUid).filter(Boolean))].filter(uid=>!(uid in s.profileCache));
 if(!ids.length)return;
 await Promise.all(ids.map(async uid=>{try{const snap=await getDoc(doc(db,"profiles",uid));s.profileCache[uid]=snap.exists()?snap.data():{};}catch(e){s.profileCache[uid]={};}}));
 render();
}
function startFeed(){
 if(!firebaseReady){connection("Firebase not configured","error");render();return;}
 s.stopFeed?.();
 s.stopFeed=onSnapshot(query(collection(db,"posts"),orderBy("createdAt","desc"),limit(60)),snap=>{
  s.posts=snap.docs.map(d=>({id:d.id,...d.data()})); connection("Firebase connected","ok"); render();hydrateCreatorProfiles();
 },e=>{console.error(e);connection("Feed error","error");notice("Videos did not load: "+err(e)+" Check that Firestore exists and the current rules are published.",true);s.posts=[];render();});
}
async function getFollowing(){
 s.following=new Set(); if(!s.user)return;
 try{ const snap=await getDocs(collection(db,"profiles",s.user.uid,"following")); snap.forEach(d=>s.following.add(d.id)); }catch(e){console.warn("Following list:",e);}
}
async function openProfile(uid){
 if(!db||!uid)return; open("profile-modal"); $("profile-view-content").innerHTML="<p class='muted'>Loading creator profile…</p>"; $("profile-posts").innerHTML="";
 try{
  const snap=await getDoc(doc(db,"profiles",uid)); if(!snap.exists())throw new Error("Creator profile not found.");
  const p=snap.data();s.profileCache[uid]=p;const fs=await getDocs(collection(db,"profiles",uid,"followers")), gs=await getDocs(collection(db,"profiles",uid,"following"));
  const ps=await getDocs(query(collection(db,"posts"),where("authorUid","==",uid),limit(30)));
  const items=ps.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
  $("profile-modal-title").textContent=(p.displayName||"Creator")+"'s profile";
  const follow=s.following.has(uid), self=s.user?.uid===uid;
  $("profile-view-content").innerHTML='<div class="profile-hero"><div class="avatar avatar-large">'+avatarHTML(p.displayName,p.avatarURL)+'</div><div class="profile-hero-copy"><h3>'+esc(p.displayName||"Creator")+'</h3><p class="muted">@'+esc(p.handle||"creator")+'</p><p>'+esc(p.bio||"No bio yet.")+'</p></div></div><div class="profile-numbers"><span><b>'+items.length+'</b> videos</span><span><b>'+fs.size+'</b> followers</span><span><b>'+gs.size+'</b> following</span></div>'+(self?'<button class="btn btn-outline" id="profile-edit-from-view">Edit profile</button>':s.user?'<button class="btn '+(follow?"btn-outline":"btn-primary")+'" data-follow-uid="'+esc(uid)+'">'+(follow?"Following · Unfollow":"＋ Follow creator")+'</button>':'<button class="btn btn-primary" id="profile-signin">Sign in to follow</button>');
  $("profile-posts").innerHTML=items.map(postCard).filter(Boolean).join("")||"<p class='muted empty-inline'>This creator has not published a video yet.</p>";
 }catch(e){$("profile-view-content").innerHTML='<p class="form-error">'+esc(err(e))+'</p>';}
}
async function toggleFollow(uid){
 if(!s.user)return askLogin("Sign in to follow creators.");
 if(uid===s.user.uid)return;
 const a=doc(db,"profiles",s.user.uid,"following",uid), b=doc(db,"profiles",uid,"followers",s.user.uid);
 try{const snap=await getDoc(a);if(snap.exists()){await Promise.all([deleteDoc(a),deleteDoc(b)]);s.following.delete(uid);toast("Creator unfollowed.");}else{await Promise.all([setDoc(a,{uid,createdAt:serverTimestamp()}),setDoc(b,{uid:s.user.uid,createdAt:serverTimestamp()})]);s.following.add(uid);toast("You are now following this creator.");}accountUI();render();await openProfile(uid);}catch(e){toast(err(e),true);}
}
async function likePost(id){
 if(!s.user)return askLogin("Sign in to like reels.");
 const p=doc(db,"posts",id), l=doc(db,"posts",id,"likes",s.user.uid);
 try{await runTransaction(db,async t=>{const pair=await Promise.all([t.get(p),t.get(l)]);if(!pair[0].exists())throw new Error("This video was removed.");const n=Number(pair[0].data().likesCount)||0;if(pair[1].exists()){t.delete(l);t.update(p,{likesCount:Math.max(0,n-1)});}else{t.set(l,{uid:s.user.uid,createdAt:serverTimestamp()});t.update(p,{likesCount:n+1});}});}catch(e){toast(err(e),true);}
}
function openComments(id){
 s.commentPost=id; open("comments-modal"); $("comments-list").innerHTML="<p class='muted'>Loading comments…</p>"; $("comment-input").value="";clearProblem("comment-error");s.stopComments?.();
 s.stopComments=onSnapshot(query(collection(db,"posts",id,"comments"),orderBy("createdAt","asc"),limit(100)),snap=>{
  $("comments-list").innerHTML=snap.docs.map(d=>{const c=d.data();return '<div class="comment-row"><span class="avatar avatar-small">'+esc(initials(c.authorName))+'</span><div><strong>'+esc(c.authorName||"Creator")+'</strong><p>'+esc(c.text||"")+'</p><small>'+esc(dateText(c.createdAt))+'</small></div></div>';}).join("")||"<p class='muted empty-inline'>No comments yet. Be the first to say something kind.</p>";
 },e=>{$("comments-list").innerHTML='<p class="form-error">'+esc(err(e))+'</p>';});
}
async function addComment(e){
 e.preventDefault(); if(!s.user)return askLogin("Sign in to comment on reels.");
 const text=$("comment-input").value.trim(); if(!text||!s.commentPost)return;
 try{await addDoc(collection(db,"posts",s.commentPost,"comments"),{uid:s.user.uid,authorName:name().slice(0,80),text:text.slice(0,500),createdAt:serverTimestamp()});$("comment-input").value="";clearProblem("comment-error");}
 catch(error){problem("comment-error",err(error));}
}
function openUpload(){
 if(!s.user)return askLogin("Create an account or sign in before posting a reel.");
 $("upload-form").reset();clearProblem("upload-error");$("video-preview-wrap").classList.add("hidden");$("upload-progress-wrap").classList.add("hidden");$("file-label").textContent="Choose a video from your device";open("create-modal");
}
function preview(){
 const f=$("video-file").files?.[0]; if(!f)return;
 const mime=inferVideoMime(f);
 if(!mime){problem("upload-error","This file type was not recognized as a video. Choose MP4, MOV, WebM or another supported video.");$("video-file").value="";return;}
 if(f.size>=100*1024*1024){problem("upload-error","Choose a video smaller than 100 MB.");$("video-file").value="";return;}
 clearProblem("upload-error");$("file-label").textContent=f.name+" · "+(f.size/1024/1024).toFixed(1)+" MB";
 const v=$("video-preview");if(v.dataset.url)URL.revokeObjectURL(v.dataset.url);v.dataset.url=URL.createObjectURL(f);v.src=v.dataset.url;$("video-preview-wrap").classList.remove("hidden");
}
async function uploadVideo(e){
 e.preventDefault();
 if(!s.user)return askLogin("Sign in before publishing a reel.");
 if(!firebaseReady||!db||!storage)return problem("upload-error","Video posting needs Firebase Authentication, Firestore and Storage to be configured in this deployed app.");
 const f=$("video-file").files?.[0];if(!f)return problem("upload-error","Choose a video first.");
 const mime=inferVideoMime(f);
 if(!mime)return problem("upload-error","This file type was not recognized as a video. Choose MP4, MOV, WebM or another supported video.");
 if(f.size>=100*1024*1024)return problem("upload-error","Choose a video smaller than 100 MB.");
 const btn=$("publish-button");btn.disabled=true;clearProblem("upload-error");$("upload-progress-wrap").classList.remove("hidden");$("upload-progress").value=0;$("upload-percent").textContent="0%";$("upload-status").textContent="Starting upload…";
 const filename=f.name.toLowerCase().replace(/[^a-z0-9._-]/g,"_").slice(-80)||"video.mp4", path="videos/"+s.user.uid+"/"+Date.now()+"-"+filename;
 try{
  const task=uploadBytesResumable(storageRef(storage,path),f,{contentType:mime});
  task.on("state_changed",snap=>{
   const n=snap.totalBytes?Math.round(snap.bytesTransferred/snap.totalBytes*100):0;
   $("upload-progress").value=n;$("upload-percent").textContent=n+"%";$("upload-status").textContent=n>=100?"Saving post…":"Uploading video…";
  },error=>{
   btn.disabled=false;
   const detail=err(error);
   if(error?.code==="storage/unauthorized")problem("upload-error",detail+" In Firebase Console, check Storage → Rules and allow signed-in users to upload their own videos.");
   else if(error?.code==="storage/bucket-not-found"||error?.code==="storage/project-not-found")problem("upload-error",detail+" Check that this APK/site uses the correct Storage bucket.");
   else problem("upload-error",detail);
  },async()=>{
   try{
    const url=await getDownloadURL(task.snapshot.ref);
    await addDoc(collection(db,"posts"),{authorUid:s.user.uid,authorName:name().slice(0,80),authorHandle:handle().slice(0,25),videoURL:url,storagePath:path,caption:$("video-caption").value.trim().slice(0,1200),tags:$("video-tags").value.trim().slice(0,150),likesCount:0,createdAt:serverTimestamp()});
    close("create-modal");s.filter="For You";s.tag="";render();toast("Your reel is published!");
   }catch(error){
    const detail=err(error);
    problem("upload-error",error?.code==="permission-denied"?detail+" The Firestore post rule may not allow the new post fields yet.":detail);
   }finally{btn.disabled=false;}
  });
 }catch(error){btn.disabled=false;problem("upload-error",err(error));}
}
async function deletePost(id){
 if(!s.user||!confirm("Delete this video post? This cannot be undone."))return;
 try{const r=doc(db,"posts",id),snap=await getDoc(r);if(!snap.exists()||snap.data().authorUid!==s.user.uid)throw new Error("You can delete only your own posts.");const path=snap.data().storagePath;if(path){try{await deleteObject(storageRef(storage,path));}catch(cleanupError){console.warn("Storage cleanup failed:",cleanupError);}}await deleteDoc(r);toast("Post deleted.");}catch(e){toast(err(e),true);}
}
function postShareUrl(id){return publicPageURL({post:id});}
function openShareModal(payload){
 s.sharePayload=payload;
 $("share-title").textContent=payload.title||"Share on VibeShorts";
 $("share-subtitle").textContent=payload.text||"Send this link to your friends.";
 $("share-link-value").value=payload.url||location.href;
 clearProblem("share-error");open("share-modal");
}
function shareText(){return [s.sharePayload?.text||"Watch this on VibeShorts",s.sharePayload?.url||location.href].filter(Boolean).join(" ");}
async function shareNative(){
 const p=s.sharePayload||{};
 try{
  if(navigator.share){await navigator.share({title:p.title||"VibeShorts",text:p.text||"Watch this on VibeShorts",url:p.url||location.href});}
  else{await copyText(shareText());toast("Link copied. Choose TikTok, Facebook or WhatsApp and paste it.");}
 }catch(e){if(e?.name!=="AbortError"){try{await copyText(shareText());toast("Link copied. You can paste it into another app.");}catch{problem("share-error","Sharing is not available in this browser. Copy the link from the field above.");}}}
}
async function copyShareLink(){
 try{await copyText(s.sharePayload?.url||location.href);toast("Link copied. Paste it into TikTok, Facebook, WhatsApp or a message.");}
 catch{const input=$("share-link-value");input.focus();input.select();problem("share-error","Select the link above and use Copy on your phone.");}
}
function shareWhatsApp(){
 const target="https://wa.me/?text="+encodeURIComponent(shareText());
 openExternal(target);
}
function shareFacebook(){
 const target="https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(s.sharePayload?.url||location.href);
 openExternal(target);
}
async function shareTikTok(){
 if(navigator.share){await shareNative();return;}
 try{await copyText(shareText());toast("VibeShorts link copied. Paste it into TikTok or share it from TikTok’s link options.");openExternal("https://www.tiktok.com/");}
 catch{problem("share-error","Copy the link above, then paste it into TikTok.");}
}
async function sharePost(id){
 const p=s.posts.find(x=>x.id===id);
 openShareModal({title:"Share this VibeShorts reel",text:p?.caption||"Watch this reel on VibeShorts",url:postShareUrl(id)});
}
async function openSharedPost(id){
 if(!id||s.sharedPostHandled||!db)return;
 s.sharedPostHandled=true;
 try{
  let p=s.posts.find(x=>x.id===id);
  if(!p){const snap=await getDoc(doc(db,"posts",id));if(!snap.exists())throw new Error("This reel could not be found. It may have been removed or is not public.");p={id:snap.id,...snap.data()};s.posts=[p,...s.posts];}
  s.screen="home";s.filter="For You";render();
  setTimeout(()=>{const card=$("post-"+id);if(card)card.scrollIntoView({behavior:"smooth",block:"start"});},250);
 }catch(e){toast(err(e),true);}
}
function editProfile(){
 if(!s.user)return askLogin("Sign in to edit your profile.");
 $("profile-display-name").value=s.profile?.displayName||name();$("profile-handle").value=s.profile?.handle||handle();$("profile-bio").value=s.profile?.bio||"";
 $("profile-avatar-file").value="";
 setAvatar($("profile-avatar-preview"),photoURL(),initials(name()));
 clearProblem("profile-edit-error");open("edit-profile-modal");
}
function previewProfilePhoto(){
 const f=$("profile-avatar-file").files?.[0];if(!f)return;
 const mime=inferImageMime(f);
 if(!mime){problem("profile-edit-error","Choose a JPG, PNG, WebP or other supported image.");$("profile-avatar-file").value="";return;}
 if(f.size>5*1024*1024){problem("profile-edit-error","Choose a profile picture smaller than 5 MB.");$("profile-avatar-file").value="";return;}
 clearProblem("profile-edit-error");
 const old=$("profile-avatar-preview").dataset.previewUrl;if(old)URL.revokeObjectURL(old);
 const url=URL.createObjectURL(f);$("profile-avatar-preview").dataset.previewUrl=url;
 setAvatar($("profile-avatar-preview"),url,initials(name()),true);
}
async function saveProfile(e){
 e.preventDefault();if(!s.user)return askLogin("Sign in to edit your profile.");
 const n=$("profile-display-name").value.trim().slice(0,40), h=$("profile-handle").value.trim().toLowerCase(), bio=$("profile-bio").value.trim().slice(0,160), photo=$("profile-avatar-file").files?.[0];
 if(!n||!/^[a-z0-9_]{3,20}$/.test(h))return problem("profile-edit-error","Enter a name and a username using 3–20 letters, numbers or underscores.");
 if(photo&&(!inferImageMime(photo)||photo.size>5*1024*1024))return problem("profile-edit-error","Choose a supported image smaller than 5 MB.");
 if(photo&&!storage)return problem("profile-edit-error","Firebase Storage is not configured. Enable Storage before uploading a profile picture.");
 const b=$("profile-save-button");b.disabled=true;clearProblem("profile-edit-error");
 try{
  let avatarURL=s.profile?.avatarURL||s.user?.photoURL||"";
  if(photo){
   const mime=inferImageMime(photo), fileName=photo.name.toLowerCase().replace(/[^a-z0-9._-]/g,"_").slice(-70)||"profile.jpg";
   const target=storageRef(storage,"avatars/"+s.user.uid+"/"+Date.now()+"-"+fileName);
   const task=uploadBytesResumable(target,photo,{contentType:mime});
   const snap=await new Promise((resolve,reject)=>task.on("state_changed",null,reject,()=>resolve(task.snapshot)));
   avatarURL=await getDownloadURL(snap.ref);
  }
  await updateProfile(s.user,{displayName:n,photoURL:avatarURL||""});
  const p={uid:s.user.uid,displayName:n,handle:h,bio,avatarURL,createdAt:s.profile?.createdAt||serverTimestamp(),updatedAt:serverTimestamp()};
  await setDoc(doc(db,"profiles",s.user.uid),p,{merge:true});
  s.profile=p;s.profileCache[s.user.uid]=p;accountUI();render();if(s.screen==="profile")await showOwnProfile();close("edit-profile-modal");toast("Profile updated.");
 }catch(e){problem("profile-edit-error",err(e));}
 finally{b.disabled=false;}
}
async function authSubmit(e){
 e.preventDefault();if(!firebaseReady)return problem("auth-error","Firebase is not configured in this build.");const up=$("auth-form").dataset.mode==="signup", email=$("auth-email").value.trim(), pass=$("auth-password").value, b=$("auth-submit");b.disabled=true;clearProblem("auth-error");
 try{if(up){const n=$("display-name").value.trim().slice(0,40);if(!n)throw new Error("Enter a display name.");const cr=await createUserWithEmailAndPassword(auth,email,pass);await updateProfile(cr.user,{displayName:n});await setDoc(doc(db,"profiles",cr.user.uid),{uid:cr.user.uid,displayName:n,handle:n.toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20)||("creator"+cr.user.uid.slice(0,6)),bio:"",avatarURL:"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});toast("Welcome to VibeShorts! Account created.");}else{await signInWithEmailAndPassword(auth,email,pass);toast("You are signed in.");}close("auth-modal");}
 catch(error){problem("auth-error",err(error));}finally{b.disabled=false;}
}
async function resetPassword(){const email=$("auth-email").value.trim();if(!email)return problem("auth-error","Enter your email address first.");try{await sendPasswordResetEmail(auth,email);toast("Password reset email sent. Check your inbox.");clearProblem("auth-error");}catch(e){problem("auth-error",err(e));}}
function filterTo(f){s.filter=f;s.tag="";switchScreen("home");render();$("feed").scrollIntoView({behavior:"smooth",block:"start"});}
function makeScript(e){e.preventDefault();const topic=$("script-topic").value.trim(),style=$("script-style").value;if(!topic)return;const hooks={energetic:"Wait — here is what you need to know about ",funny:"I thought I knew ",educational:"Here are three useful things about ",story:"Let me tell you a quick story about ",review:"Before you choose "};$("script-output").value="HOOK (0–3 sec)\n"+(hooks[style]||hooks.energetic)+topic+".\n\nMAIN POINT (3–20 sec)\nShow one useful detail about "+topic+". Explain it simply and include a concrete example.\n\nPAYOFF (20–30 sec)\nSummarize the key lesson.\n\nCALL TO ACTION\n“What should I cover next? Leave your question below.”\n\nThis is a template outline, not a response from a live AI service.";}
function wire(){
 $("header-auth").addEventListener("click",()=>s.user?signOut(auth).then(()=>toast("Signed out." )).catch(e=>toast(err(e),true)):(mode("signin"),open("auth-modal")));
 $("top-create").addEventListener("click",openUpload);
 $("top-theme").addEventListener("click",cycleTheme);
 $("share-native").addEventListener("click",shareNative);
 $("share-whatsapp").addEventListener("click",shareWhatsApp);
 $("share-facebook").addEventListener("click",shareFacebook);
 $("share-tiktok").addEventListener("click",shareTikTok);
 $("share-copy-link").addEventListener("click",copyShareLink);
 $("profile-avatar-file").addEventListener("change",previewProfilePhoto);
 $("top-activity").addEventListener("click",()=>s.user?showOwnProfile():askLogin("Sign in to open your account."));
 $("story-self").addEventListener("click",openUpload);
 document.querySelectorAll("[data-story-preview]").forEach(b=>b.addEventListener("click",()=>toast("Stories are a visual preview for now. Watch published reels in the feed.")));
 $("mobile-account").addEventListener("click",showOwnProfile);
 $("profile-home-back").addEventListener("click",()=>switchScreen("home"));
 $("profile-screen-menu").addEventListener("click",()=>s.user?editProfile():askLogin("Create an account to set up your profile."));
 $("profile-screen-signin").addEventListener("click",()=>{mode("signin");open("auth-modal");});
 $("profile-screen-signup").addEventListener("click",()=>{mode("signup");open("auth-modal");});
 $("profile-screen-edit").addEventListener("click",editProfile);
 $("profile-screen-share").addEventListener("click",shareOwnProfile);
 $("profile-grid-create").addEventListener("click",()=>s.user?openUpload():(mode("signup"),open("auth-modal")));
 document.querySelectorAll("[data-profile-tab]").forEach(b=>b.addEventListener("click",()=>{s.profileTab=b.dataset.profileTab;renderProfileGrid();}));
 document.addEventListener("click",async e=>{
  const tile=e.target.closest("[data-profile-post]");
  if(tile){switchScreen("home");const card=$("post-"+tile.dataset.profilePost);if(card)card.scrollIntoView({behavior:"smooth",block:"start"});else toast("This reel is on your profile. Refresh the feed to load older posts.");return;}
  const save=e.target.closest("[data-save-post]");if(save){toggleSavedPost(save.dataset.savePost);return;}
  const more=e.target.closest("[data-post-more]");if(more){toast("More creator tools will be added here.");return;}
  if(e.target.closest("#profile-grid-create")){s.user?openUpload():(mode("signup"),open("auth-modal"));return;}
 });
 $("header-signup").addEventListener("click",()=>{mode("signup");open("auth-modal");});$("header-profile").addEventListener("click",editProfile);
 $("auth-tab-signin").addEventListener("click",()=>mode("signin"));$("auth-tab-signup").addEventListener("click",()=>mode("signup"));$("auth-form").addEventListener("submit",authSubmit);$("forgot-password").addEventListener("click",resetPassword);
 $("account-action").addEventListener("click",()=>s.user?editProfile():(mode("signup"),open("auth-modal")));$("profile-edit-form").addEventListener("submit",saveProfile);
 $("upload-form").addEventListener("submit",uploadVideo);$("video-file").addEventListener("change",preview);$("comment-form").addEventListener("submit",addComment);$("script-form").addEventListener("submit",makeScript);
 $("copy-script").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("script-output").value);toast("Script copied.");}catch{toast("Select the outline and copy it manually.");}});
 $("use-script").addEventListener("click",()=>{$("video-caption").value=$("script-output").value.slice(0,1200);close("ai-modal");openUpload();});
 ["side-create","promo-create","welcome-create","composer-open","composer-plus","mobile-create"].forEach(id=>$(id)?.addEventListener("click",openUpload));
 ["side-ai","mobile-ai"].forEach(id=>$(id)?.addEventListener("click",()=>open("ai-modal")));
 // Profile navigation is wired above to the main profile screen.
 document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>close(b.dataset.close)));
 document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)close(m.id);}));
 document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal.open").forEach(m=>close(m.id));});
 document.addEventListener("click",async e=>{
  const f=e.target.closest("[data-filter]");if(f){filterTo(f.dataset.filter);return;}
  const t=e.target.closest("[data-tag]");if(t){s.tag=t.dataset.tag;s.filter="For You";render();return;}
  const p=e.target.closest("[data-profile]");if(p){await openProfile(p.dataset.profile);return;}
  const l=e.target.closest("[data-like-post]");if(l){await likePost(l.dataset.likePost);return;}
  const c=e.target.closest("[data-comments-post]");if(c){openComments(c.dataset.commentsPost);return;}
  const sh=e.target.closest("[data-share-post]");if(sh){await sharePost(sh.dataset.sharePost);return;}
  const fu=e.target.closest("[data-follow-uid]");if(fu){await toggleFollow(fu.dataset.followUid);return;}
  const de=e.target.closest("[data-delete-post]");if(de){await deletePost(de.dataset.deletePost);return;}
  if(e.target.closest("#profile-signin"))askLogin("Sign in to follow this creator.");
  if(e.target.closest("#profile-edit-from-view"))editProfile();
  if(e.target.closest("#empty-create"))openUpload();
 });
}
function showStartupError(error,source="app"){
 console.error("VibeShorts "+source+" error:",error);
 try{
  const msg=(error&&error.message)?String(error.message):"An unexpected error occurred.";
  let panel=$("runtime-error-panel");
  if(!panel){
   panel=document.createElement("section");panel.id="runtime-error-panel";panel.setAttribute("role","alert");
   panel.style.cssText="position:fixed;z-index:99999;left:12px;right:12px;top:76px;max-height:75vh;overflow:auto;padding:18px;border-radius:14px;background:#fff0f2;color:#751d36;border:1px solid #e2a8b6;box-shadow:0 10px 35px #0003;font:14px/1.5 system-ui,sans-serif";
   document.body.appendChild(panel);
  }
  panel.innerHTML="<strong>VibeShorts needs to restart</strong><p>The app hit a loading error. Your account and saved posts have not been deleted.</p><p id='runtime-error-detail'></p><button id='runtime-reload' style='padding:10px 14px;border:0;border-radius:8px;background:#8e72ff;color:white;font-weight:700'>Reload app</button>";
  const detail=panel.querySelector("#runtime-error-detail");
  if(detail)detail.textContent=msg.slice(0,400);
  const reload=panel.querySelector("#runtime-reload");
  if(reload)reload.addEventListener("click",()=>location.reload());
 }catch(fallbackError){console.error("Could not render runtime error panel:",fallbackError);}
}
window.addEventListener("error",event=>showStartupError(event.error||event.message,"JavaScript"));
window.addEventListener("unhandledrejection",event=>showStartupError(event.reason,"background task"));

async function init(){
 try{
 applyTheme();
 window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change",()=>{if(s.themeMode==="auto")applyTheme();});
 wire();mode("signin");
 if(!firebaseReady){connection("Firebase not configured","error");notice("Firebase settings are missing. Add the VITE_FIREBASE_* values, rebuild and redeploy; sign-up and video posting need Firebase.",true);render();return;}
 connection("Connecting…","pending");startFeed();
 onAuthStateChanged(auth,async u=>{try{s.user=u;s.profile=null;s.profileItems=[];s.profileFollowers=0;s.profileFollowing=0;if(u){try{s.profile=await ensureProfile(u);}catch(e){console.error("Profile setup failed:",e);toast("Profile setup failed: "+err(e),true);}}await getFollowing();accountUI();render();const params=new URLSearchParams(location.search);const id=params.get("profile");if(id)openProfile(id);const postId=params.get("post");if(postId)openSharedPost(postId);if(s.screen==="profile")showOwnProfile();}catch(error){showStartupError(error,"account initialization");}});
 }catch(error){showStartupError(error,"startup");}
}
init().catch(error=>showStartupError(error,"startup"));