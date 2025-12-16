// ISHNT PhotoWall logic
const supabase = window.supabase.createClient(
  "https://eirjptyxvkidijdonytv.supabase.co",
  "sb_publishable_dQgs0UuaTWWodJytC8xDaA_xVJfB2e0"
);

const METADATA_TABLE = "image_metadata";

// State
let uid = localStorage.getItem("uid") || `u_${Math.random().toString(36).slice(2)}`;
localStorage.setItem("uid", uid);
let username = localStorage.getItem("username") || "";
let watermark = localStorage.getItem("watermark") === "true";
let likedImages = JSON.parse(localStorage.getItem("likedImages") || "[]");
let allImages = [];
let filterCategory = "all";
let sortBy = "newest";
let currentViewingImage = null;
let currentViewingMetadata = null;
let forceShowAll = true; // keep images displayed after filters until user changes again
const rootStyle = document.documentElement.style;

// Elements
const gallery = document.getElementById("gallery");
const addBtn = document.getElementById("addBtn");
const file = document.getElementById("file");
const uploadModal = document.getElementById("uploadModal");
const uploadFile = document.getElementById("uploadFile");
const uploadArea = document.getElementById("uploadArea");
const uploadCaption = document.getElementById("uploadCaption");
const uploadCategory = document.getElementById("uploadCategory");
const uploadProgress = document.getElementById("uploadProgress");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const settingsModal = document.getElementById("settingsModal");
const usernameInput = document.getElementById("usernameInput");
const themeToggle = document.getElementById("themeToggle");
const watermarkToggle = document.getElementById("watermarkToggle");
const editModal = document.getElementById("editModal");
const editCaption = document.getElementById("editCaption");
const editCategory = document.getElementById("editCategory");
const viewerModal = document.getElementById("viewerModal");
const viewerImg = document.getElementById("viewerImg");
const viewerUser = document.getElementById("viewerUser");
const viewerTime = document.getElementById("viewerTime");
const viewerCaption = document.getElementById("viewerCaption");
const viewerCategory = document.getElementById("viewerCategory");
const viewerLikeBtn = document.getElementById("viewerLikeBtn");
const viewerLikeCount = document.getElementById("viewerLikeCount");
const downloadLink = document.getElementById("downloadLink");
const editViewerBtn = document.getElementById("editViewerBtn");
const deleteViewerBtn = document.getElementById("deleteViewerBtn");
const settingsBtn = document.getElementById("settingsBtn");
const searchInput = document.getElementById("searchInput");
const categoriesBar = document.getElementById("categoriesBar");
const notice = createNotice();

// Theme
if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
themeToggle.checked = document.body.classList.contains("dark");
watermarkToggle.checked = watermark;

// Event bindings
addBtn.onclick = () => {
  ensureUsername();
  file.click();
};
file.onchange = () => openUploadModalWithFile(file.files[0]);
uploadFile.onchange = () => openUploadModalWithFile(uploadFile.files[0]);
uploadArea.onclick = () => uploadFile.click();
uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add("drag"); };
uploadArea.ondragleave = () => uploadArea.classList.remove("drag");
uploadArea.ondrop = (e) => {
  e.preventDefault();
  uploadArea.classList.remove("drag");
  const f = e.dataTransfer.files[0];
  if (f) openUploadModalWithFile(f);
};
settingsBtn.onclick = () => settingsModal.classList.add("show");
settingsModal.onclick = (e) => { if (e.target === settingsModal) closeSettings(); };
uploadModal.onclick = (e) => { if (e.target === uploadModal) closeUploadModal(); };
editModal.onclick = (e) => { if (e.target === editModal) closeEditModal(); };
viewerModal.onclick = (e) => { if (e.target === viewerModal) closeViewer(); };
themeToggle.onchange = () => toggleTheme();
watermarkToggle.onchange = () => toggleWatermark();
document.querySelectorAll(".category-chip").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".category-chip").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filterCategory = btn.dataset.category;
    forceShowAll = false;
    renderGallery();
  };
});
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    sortBy = btn.dataset.filter === "trending" ? "popular" : "newest";
    forceShowAll = false;
    renderGallery();
  };
});
searchInput.oninput = () => renderGallery();

// Mobile grid selector
document.querySelectorAll(".grid-btn").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".grid-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const cols = btn.dataset.cols || "2";
    rootStyle.setProperty("--mobile-cols", cols);
  };
});
// default grid
rootStyle.setProperty("--mobile-cols","2");

// Notice popup for old browsers / first visit
maybeShowNotice();

function ensureUsername() {
  if (!username) {
    const n = prompt("Enter username");
    if (!n) return false;
    username = n;
    localStorage.setItem("username", username);
  }
  return true;
}

function openUploadModalWithFile(f) {
  if (!ensureUsername()) return;
  uploadModal.classList.add("show");
  // show file name in hint
  uploadArea.querySelector(".upload-hint").textContent = f ? f.name : "or click to browse";
  uploadArea.dataset.file = f ? "1" : "";
  uploadArea.fileRef = f;
}

function closeUploadModal() {
  uploadModal.classList.remove("show");
  file.value = "";
  uploadFile.value = "";
  uploadCaption.value = "";
  uploadCategory.value = "nature";
  uploadArea.querySelector(".upload-hint").textContent = "or click to browse";
  uploadArea.fileRef = null;
}

function closeSettings() { settingsModal.classList.remove("show"); }
function closeEditModal() { editModal.classList.remove("show"); }
function closeViewer() { viewerModal.classList.remove("show"); currentViewingImage=null; currentViewingMetadata=null; }

function saveUsername() {
  const val = usernameInput.value.trim();
  if (!val) return;
  username = val;
  localStorage.setItem("username", val);
  closeSettings();
  renderGallery();
}

function toggleTheme() {
  document.body.classList.toggle("dark", themeToggle.checked);
  localStorage.setItem("theme", themeToggle.checked ? "dark" : "light");
}
function toggleWatermark() {
  watermark = watermarkToggle.checked;
  localStorage.setItem("watermark", watermark ? "true" : "false");
}

function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

async function confirmUpload() {
  const f = uploadArea.fileRef || file.files[0] || uploadFile.files[0];
  if (!f) return;
  const caption = uploadCaption.value.trim();
  const category = uploadCategory.value;
  const name = `${username}__${uid}__${Date.now()}_${f.name}`;

  uploadProgress.style.display = "flex";
  setProgress(5);
  try {
    const { error } = await supabase.storage.from("images").upload(name, f);
    if (error) throw error;
    setProgress(60);
    await saveMetadata(name, username, uid, caption, category);
    setProgress(100);
    closeUploadModal();
    await loadImages();
  } catch (err) {
    alert("Upload failed: " + err.message);
    console.error(err);
  } finally {
    setTimeout(() => {
      uploadProgress.style.display = "none";
      setProgress(0);
    }, 500);
  }
}

function setProgress(v) {
  progressFill.style.width = `${v}%`;
  progressText.textContent = `${v}%`;
}

async function saveMetadata(imageName, username, uid, caption, category) {
  try {
    const { error } = await supabase.from(METADATA_TABLE).upsert({
      image_name: imageName,
      username,
      uid,
      caption,
      category: category || "other",
      created_at: new Date().toISOString()
    }, { onConflict: "image_name" });
    if (error) throw error;
  } catch (err) {
    // fallback to localStorage
    const metadata = JSON.parse(localStorage.getItem("imageMetadata") || "{}");
    metadata[imageName] = { username, uid, caption, category: category || "other", created_at: Date.now(), likes: 0 };
    localStorage.setItem("imageMetadata", JSON.stringify(metadata));
  }
}

async function getMetadata(imageName) {
  try {
    const { data, error } = await supabase.from(METADATA_TABLE).select("*").eq("image_name", imageName).single();
    if (!error && data) return data;
  } catch (err) {
    const metadata = JSON.parse(localStorage.getItem("imageMetadata") || "{}");
    if (metadata[imageName]) {
      return { ...metadata[imageName], created_at: new Date(metadata[imageName].created_at).toISOString() };
    }
  }
  const parts = imageName.split("__");
  return {
    image_name: imageName,
    username: parts[0] || "unknown",
    uid: parts[1] || "",
    caption: "",
    category: "other",
    likes: 0,
    created_at: new Date(parseInt(parts[2]) || Date.now()).toISOString()
  };
}

async function updateMetadata(imageName, updates) {
  try {
    const { error } = await supabase.from(METADATA_TABLE).update(updates).eq("image_name", imageName);
    if (error) throw error;
  } catch (err) {
    const metadata = JSON.parse(localStorage.getItem("imageMetadata") || "{}");
    if (metadata[imageName]) {
      metadata[imageName] = { ...metadata[imageName], ...updates };
      localStorage.setItem("imageMetadata", JSON.stringify(metadata));
    }
  }
}

function isMyImage(imageName, imageUid) {
  const parts = imageName.split("__");
  return parts[0] === username && (parts[1] === uid || imageUid === uid);
}

async function deleteImage(imageName) {
  if (!confirm("Are you sure you want to delete this image?")) return;
  try {
    const { error: storageError } = await supabase.storage.from("images").remove([imageName]);
    if (storageError) throw storageError;
    try { await supabase.from(METADATA_TABLE).delete().eq("image_name", imageName); } catch (_) {}
    const metadata = JSON.parse(localStorage.getItem("imageMetadata") || "{}");
    delete metadata[imageName];
    localStorage.setItem("imageMetadata", JSON.stringify(metadata));
    await loadImages();
    closeViewer();
  } catch (err) {
    alert("Failed to delete image: " + err.message);
  }
}

async function deleteFromViewer() {
  if (currentViewingImage) await deleteImage(currentViewingImage);
}

async function editFromViewer() {
  if (!currentViewingMetadata) return;
  editCaption.value = currentViewingMetadata.caption || "";
  editCategory.value = currentViewingMetadata.category || "other";
  editModal.classList.add("show");
}

async function saveEdit() {
  if (!currentViewingImage) return;
  const caption = editCaption.value.trim();
  const category = editCategory.value;
  await updateMetadata(currentViewingImage, { caption, category });
  await loadImages();
  editModal.classList.remove("show");
  if (viewerModal.classList.contains("show")) openViewer(currentViewingImage, true);
}

function toggleLike(imageName) {
  const idx = likedImages.indexOf(imageName);
  if (idx > -1) {
    likedImages.splice(idx, 1);
  } else {
    likedImages.push(imageName);
    incrementLikes(imageName);
    bumpLocalLikes(imageName, 1);
  }
  localStorage.setItem("likedImages", JSON.stringify(likedImages));
  renderGallery();
  if (viewerModal.classList.contains("show") && currentViewingImage === imageName) updateViewerLikes();
}

function bumpLocalLikes(imageName, delta){
  allImages = allImages.map(img=>{
    if(img.name===imageName){
      const meta = img.metadata||{};
      meta.likes = (meta.likes||0) + delta;
      return {...img, metadata:meta};
    }
    return img;
  });
  if(currentViewingImage===imageName && currentViewingMetadata){
    currentViewingMetadata.likes = (currentViewingMetadata.likes||0)+delta;
  }
}

async function incrementLikes(imageName) {
  const meta = await getMetadata(imageName);
  await updateMetadata(imageName, { likes: (meta.likes || 0) + 1 });
}

function isLiked(imageName) {
  return likedImages.includes(imageName);
}

async function updateViewerLikes() {
  if (!currentViewingMetadata) return;
  const liked = isLiked(currentViewingImage);
  viewerLikeBtn.classList.toggle("liked", liked);
  viewerLikeCount.textContent = currentViewingMetadata.likes || 0;
}

async function loadImages() {
  gallery.innerHTML = "";
  // skeleton
  for (let i = 0; i < 6; i++) {
    const s = document.createElement("div");
    s.className = "skeleton card";
    gallery.appendChild(s);
  }
  try {
    const { data } = await supabase.storage.from("images").list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (!data || data.length === 0) {
      gallery.innerHTML = '<div class="empty">No photos yet. Be the first to upload!</div>';
      return;
    }
    allImages = [];
    for (const img of data) {
      const meta = await getMetadata(img.name);
      allImages.push({ ...img, metadata: meta });
    }
    renderGallery();
  } catch (err) {
    console.error(err);
    gallery.innerHTML = '<div class="empty">Error loading images</div>';
  }
}

function renderGallery() {
  gallery.innerHTML = "";
  let filtered = [...allImages];
  if (filterCategory !== "all") filtered = filtered.filter(i => (i.metadata?.category || "other") === filterCategory);
  const term = searchInput.value.trim().toLowerCase();
  if (term) filtered = filtered.filter(i => (i.metadata?.caption || "").toLowerCase().includes(term) || i.name.toLowerCase().includes(term));

  if (sortBy === "popular") filtered.sort((a, b) => (b.metadata?.likes || 0) - (a.metadata?.likes || 0));
  else filtered.sort((a, b) => new Date(b.metadata?.created_at || b.created_at) - new Date(a.metadata?.created_at || a.created_at));

  if (forceShowAll) filtered = allImages;

  filtered.forEach((img, idx) => {
    const meta = img.metadata || {};
    const parts = img.name.split("__");
    const isMine = isMyImage(img.name, meta.uid);
    const liked = isLiked(img.name);
    const { data: url } = supabase.storage.from("images").getPublicUrl(img.name);
    const card = document.createElement("div");
    card.className = "card reveal";

    const wrap = document.createElement("div");
    wrap.className = "card-image-wrapper";
    const im = document.createElement("img");
    im.loading = "lazy";
    im.src = watermark ? addWatermark(url.publicUrl) : url.publicUrl;
    im.onclick = () => openViewer(img.name, isMine);
    wrap.appendChild(im);
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = meta.category || "other";
    wrap.appendChild(badge);

    const body = document.createElement("div");
    body.className = "card-body";
    const row = document.createElement("div");
    row.className = "card-row";
    const user = document.createElement("div");
    user.className = "user";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = (meta.username || parts[0] || "?")[0]?.toUpperCase() || "I";
    const uname = document.createElement("div");
    uname.textContent = "@" + (meta.username || parts[0] || "unknown");
    user.append(avatar, uname);
    const time = document.createElement("div");
    time.className = "time";
    const ts = meta.created_at ? new Date(meta.created_at).getTime() : parseInt(parts[2]) || Date.now();
    time.textContent = getTimeAgo(ts);
    row.append(user, time);

    const cap = document.createElement("div");
    cap.className = "caption" + (meta.caption ? "" : " empty");
    cap.textContent = meta.caption || "No caption";

    const actions = document.createElement("div");
    actions.className = "actions";
    const likeBtn = document.createElement("button");
    likeBtn.className = "like-btn" + (liked ? " liked" : "");
    likeBtn.innerHTML = `${liked ? "❤️" : "🤍"} ${meta.likes || 0}`;
    likeBtn.onclick = (e) => { e.stopPropagation(); toggleLike(img.name); };

    const cardBtns = document.createElement("div");
    cardBtns.className = "card-btns";
    const shareBtn = document.createElement("button");
    shareBtn.className = "pill-btn secondary";
    shareBtn.textContent = "Share";
    shareBtn.onclick = (e) => { e.stopPropagation(); shareImage(url.publicUrl); };

    const dlBtn = document.createElement("button");
    dlBtn.className = "pill-btn";
    dlBtn.textContent = "Download";
    dlBtn.onclick = (e) => { e.stopPropagation(); downloadImage(url.publicUrl, img.name); };

    cardBtns.append(shareBtn, dlBtn);
    if (isMine) {
      const editBtn = document.createElement("button");
      editBtn.className = "pill-btn secondary";
      editBtn.textContent = "Edit";
      editBtn.onclick = (e) => { e.stopPropagation(); currentViewingImage = img.name; currentViewingMetadata = meta; editFromViewer(); };
      const delBtn = document.createElement("button");
      delBtn.className = "pill-btn danger";
      delBtn.textContent = "Delete";
      delBtn.onclick = (e) => { e.stopPropagation(); deleteImage(img.name); };
      cardBtns.append(editBtn, delBtn);
    }
    actions.append(likeBtn, cardBtns);

    body.append(row, cap, actions);
    card.append(wrap, body);
    gallery.appendChild(card);
  });

  // scroll reveal once
  const observer = new IntersectionObserver((entries, obs)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("reveal-visible");
        obs.unobserve(entry.target);
      }
    });
  },{threshold:0.1});
  document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
}

function addWatermark(url) {
  // simple watermark param if supported by CDN; otherwise return same
  return url;
}

async function openViewer(imageName, isMine) {
  const meta = await getMetadata(imageName);
  currentViewingImage = imageName;
  currentViewingMetadata = meta;
  const { data: url } = supabase.storage.from("images").getPublicUrl(imageName);
  viewerImg.src = watermark ? addWatermark(url.publicUrl) : url.publicUrl;
  viewerUser.textContent = "@" + (meta.username || "unknown");
  viewerCaption.textContent = meta.caption || "No caption";
  viewerCategory.textContent = meta.category || "other";
  viewerTime.textContent = getTimeAgo(new Date(meta.created_at || Date.now()).getTime());
  viewerLikeCount.textContent = meta.likes || 0;
  viewerLikeBtn.classList.toggle("liked", isLiked(imageName));
  editViewerBtn.style.display = isMine ? "block" : "none";
  deleteViewerBtn.style.display = isMine ? "block" : "none";
  downloadLink.href = url.publicUrl;
  viewerModal.classList.add("show");
}

function shareImage(url) {
  if (navigator.share) {
    navigator.share({ title: "ISHNT Image", url });
  } else {
    navigator.clipboard.writeText(url);
    alert("Link copied!");
  }
}

function downloadImage(url, name) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name || "image";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function createNotice() {
  const n = document.createElement("div");
  n.className = "notice";
  n.innerHTML = `
    <div class="notice-box">
      <h3>Browser Update Required</h3>
      <p>To upload images smoothly on ISHNT, please use an updated web browser.</p>
      <p>Older browser versions may not support modern upload features.</p>
      <p><strong>Recommended:</strong><br/>• Chrome (latest)<br/>• Samsung Internet<br/>• Firefox</p>
      <p>Viewing images will still work on older browsers.</p>
      <div class="notice-buttons">
        <button class="btn-small primary" id="noticeOk">OK</button>
        <button class="btn-small secondary" id="noticeRefresh">Refresh Page</button>
      </div>
    </div>`;
  document.body.appendChild(n);
  n.querySelector("#noticeOk").onclick = () => n.classList.remove("show");
  n.querySelector("#noticeRefresh").onclick = () => location.reload();
  return n;
}

function maybeShowNotice() {
  const ua = navigator.userAgent;
  const chromeMatch = ua.match(/Chrome\/([0-9]+)/);
  const isOldChrome = chromeMatch ? parseInt(chromeMatch[1], 10) < 90 : false;
  const firstVisit = !localStorage.getItem("ishnt_seen_notice");
  if (isOldChrome || firstVisit) {
    notice.classList.add("show");
    localStorage.setItem("ishnt_seen_notice", "1");
  }
}

// Accessibility: close on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    [uploadModal, settingsModal, editModal, viewerModal, notice].forEach(m => m?.classList?.remove("show"));
  }
});

// Init form values
usernameInput.value = username;
loadImages();

