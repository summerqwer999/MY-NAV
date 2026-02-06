// ====== 配置区 ======
const CONFIG = {
    API_URL: 'https://mynavdata.summerqwer999.workers.dev/api/config', 
    ADMIN_PASS: '226688'
};
// ===================

let links = [];
let wallpaper = '';
let isLogged = false;

window.onload = async function() {
    try {
        const res = await fetch(CONFIG.API_URL);
        const data = await res.json();
        links = data.links || [];
        wallpaper = data.wallpaper || '';
        if (checkAuth()) enableAdminMode();
        render();
    } catch (e) {
        console.error("加载失败:", e);
        render();
    }
};

// 1. 核心渲染 (含双重保险图标逻辑)
window.render = function() {
    const bgLayer = document.getElementById('bg-layer');
    const bgUrl = wallpaper || 'https://images.unsplash.com/photo-1541123356219-284ebe98ae3b?q=80&w=1920';
    bgLayer.style.backgroundImage = `url(${bgUrl})`;
    
    const grid = document.getElementById('link-grid');
    grid.innerHTML = '';
    
    const categories = [...new Set(links.map(item => item.category || '默认'))];
    
    categories.forEach(cat => {
        const section = document.createElement('div');
        section.className = 'category-group';
        section.innerHTML = `<h2 class="cat-title">${cat}</h2><div class="cat-grid" data-category="${cat}"></div>`;
        const catGrid = section.querySelector('.cat-grid');
        
        links.filter(l => (l.category||'默认') === cat).forEach(item => {
            const card = document.createElement('div');
            card.className = 'glass-card card';
            
            let domain = '';
            try { domain = new URL(item.url).hostname; } catch(e) { domain = 'example.com'; }
            
            // 图标源 A: Google (首选)
            const googleIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            // 图标源 B: iowen (国内加速备选)
            const iowenIcon = `https://api.iowen.cn/favicon/${domain}.png`;

            // 创建图片并设置双重逻辑
            const imgId = `img-${Math.random().toString(36).substr(2, 9)}`;
            card.innerHTML = `
                <a href="${item.url}" target="_blank">
                    <img id="${imgId}" src="${googleIcon}" loading="lazy" alt="icon">
                    <div>${item.title}</div>
                </a>`;
            
            // 逻辑控制：1. 报错即换 2. 10秒不出来也换
            const targetImg = card.querySelector(`#${imgId}`);
            let hasSwitched = false;

            const switchToIowen = () => {
                if (!hasSwitched) {
                    hasSwitched = true;
                    targetImg.src = iowenIcon;
                }
            };

            targetImg.onerror = switchToIowen; // 报错立刻换
            
            setTimeout(() => {
                if (!targetImg.complete || targetImg.naturalWidth === 0) {
                    switchToIowen(); // 10秒还没加载完或宽度为0(被墙)
                }
            }, 10000);

            card.onclick = (e) => {
                if(document.body.classList.contains('edit-mode')) {
                    e.preventDefault();
                    if(confirm(`删除 "${item.title}"?`)) {
                        links = links.filter(l => l !== item);
                        render();
                    }
                }
            };
            catGrid.appendChild(card);
        });
        grid.appendChild(section);
        
        if (isLogged && !document.body.classList.contains('edit-mode')) {
            new Sortable(catGrid, { group: 'shared', animation: 150, onEnd: reorderLinksFromDOM });
        }
    });
};

// 2. 清空全部功能
window.clearAllData = function() {
    if (!checkAuth()) return alert("登录过期");
    if (confirm("⚠️ 警告：这将删除所有分类和链接！确定要格式化书斋吗？")) {
        if (confirm("请再次确认，此操作不可撤销！")) {
            links = [];
            render();
            alert("已清空，请记得点击'云端保存'同步到服务器。");
        }
    }
};

// 3. 导入书签
window.importBookmarks = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");
        const dl = doc.querySelector("dl");
        if (!dl) return alert("文件格式错误");
        const imported = [];
        function parseFolder(container, cat) {
            const items = container.querySelectorAll(":scope > dt");
            items.forEach(dt => {
                const h3 = dt.querySelector(":scope > h3");
                const a = dt.querySelector(":scope > a");
                const subDl = dt.querySelector(":scope > dl");
                if (h3 && subDl) parseFolder(subDl, h3.innerText);
                else if (a) imported.push({ title: a.innerText, url: a.href, category: cat || "书签导入" });
            });
        }
        parseFolder(dl, "书签导入");
        if (imported.length > 0) {
            links = [...links, ...imported];
            render();
            alert(`成功导入 ${imported.length} 条链接！`);
        }
    };
    reader.readAsText(file);
};

// 4. 壁纸逻辑
window.randomWallpaper = () => {
    const newWp = `https://bing.img.run/rand_uhd.php?rand=${Math.random()}`;
    document.getElementById('bg-layer').style.backgroundImage = `url(${newWp})`;
    window.tempWp = newWp;
};
window.fixCurrentWallpaper = () => {
    if(!window.tempWp) return alert("请先随机切换壁纸");
    wallpaper = window.tempWp;
    alert("📌 壁纸已锁定！记得保存。");
};
window.applyWallpaper = () => {
    wallpaper = document.getElementById('wp-input').value;
    render();
};

// 5. 权限与同步
function checkAuth() {
    const t = localStorage.getItem('loginTime');
    return t && (Date.now() - t < 10 * 60 * 1000);
}
window.login = () => {
    const p = document.getElementById('pass-input').value;
    if(p === CONFIG.ADMIN_PASS) {
        localStorage.setItem('loginTime', Date.now());
        enableAdminMode();
        hideModal('login-modal');
    } else alert("暗号错误");
};
function enableAdminMode() {
    isLogged = true;
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('admin-actions').style.display = 'flex';
}
window.saveAll = async function() {
    if(!checkAuth()) return alert("登录已过期");
    const btn = document.getElementById('save-btn');
    btn.innerText = "同步中...";
    try {
        const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.ADMIN_PASS}` },
            body: JSON.stringify({ links, wallpaper })
        });
        if(res.ok) alert("✅ 云端同步成功！");
        else alert("❌ 同步失败");
    } catch (e) { alert("❌ 网络错误"); }
    finally { btn.innerText = "☁️ 云端保存"; }
};

// 6. UI 与 弹窗
window.openLogin = () => document.getElementById('login-modal').style.display='flex';
window.hideModal = (id) => document.getElementById(id).style.display='none';
window.showSettingsHub = () => {
    if(!checkAuth()) { alert("登录超时"); location.reload(); return; }
    document.getElementById('settings-hub').style.display='flex';
};
window.showUniversalModal = (h) => { 
    document.getElementById('universal-content').innerHTML = h; 
    document.getElementById('universal-modal').style.display='flex'; 
};
window.openAddCategoryUI = () => {
    window.showUniversalModal(`<h3>新建分类</h3><input id="new-cat" placeholder="分类名"><button class="action-btn" onclick="window.confirmAddCat()">确定</button>`);
};
window.confirmAddCat = () => {
    const c = document.getElementById('new-cat').value;
    if(c) { links.push({title:'新书架', url:'https://www.google.com', category:c}); render(); hideModal('universal-modal'); }
};
window.openAddLinkUI = () => {
    const cats = [...new Set(links.map(item => item.category || '默认'))];
    let opts = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    window.showUniversalModal(`<h3>添加链接</h3><input id="at" placeholder="名称"><input id="au" placeholder="URL"><select id="ac">${opts}</select><button class="action-btn" onclick="window.confirmAddLink()">确定</button>`);
};
window.confirmAddLink = () => {
    const t=document.getElementById('at').value, u=document.getElementById('au').value, c=document.getElementById('ac').value;
    if(t&&u) { links.push({title:t,url:u,category:c}); render(); hideModal('universal-modal'); }
};

window.enterEditMode = () => { document.body.classList.add('edit-mode'); document.getElementById('exit-edit-btn').style.display='block'; hideModal('settings-hub'); render(); };
window.exitEditMode = () => { document.body.classList.remove('edit-mode'); document.getElementById('exit-edit-btn').style.display='none'; render(); };

function reorderLinksFromDOM() {
    const nl = [];
    document.querySelectorAll('.cat-grid').forEach(g => {
        const cat = g.dataset.category;
        g.querySelectorAll('.card').forEach(c => {
            const t = c.querySelector('div').innerText;
            const item = links.find(l => l.title === t);
            if(item) { item.category = cat; nl.push(item); }
        });
    });
    links = [...new Set(nl)];
}
