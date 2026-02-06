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
    } catch (e) { render(); }
};

// 自定义轻提示
window.toast = (msg) => {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerText = msg;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2500);
};

// 1. 渲染引擎
window.render = function() {
    const bgLayer = document.getElementById('bg-layer');
    if (wallpaper) bgLayer.style.backgroundImage = `url(${wallpaper})`;
    
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
            let domain = ''; try { domain = new URL(item.url).hostname; } catch(e) { domain = 'example.com'; }
            
            const gIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            const iIcon = `https://api.iowen.cn/favicon/${domain}.png`;

            const imgId = `img-${Math.random().toString(36).substr(2, 5)}`;
            card.innerHTML = `
                <div class="delete-badge" onclick="window.directDelete('${item.url}','${item.title}')">✕</div>
                <a href="${item.url}" target="_blank">
                    <img id="${imgId}" src="${gIcon}" loading="lazy">
                    <div>${item.title}</div>
                </a>`;
            
            const tImg = card.querySelector(`#${imgId}`);
            let switched = false;
            const toI = () => { if(!switched){ switched=true; tImg.src=iIcon; } };
            tImg.onerror = toI;
            setTimeout(toI, 10000);

            catGrid.appendChild(card);
        });
        grid.appendChild(section);
        
        if (isLogged && !document.body.classList.contains('edit-mode')) {
            new Sortable(catGrid, { group: 'shared', animation: 150, onEnd: reorderLinksFromDOM });
        }
    });
};

window.directDelete = (url, title) => {
    links = links.filter(l => !(l.url === url && l.title === title));
    render();
    window.toast("已移除项目");
};

// 2. 分类管理
window.openCategoryManager = () => {
    const cats = [...new Set(links.map(item => item.category || '默认'))];
    let listHtml = cats.map(cat => `
        <div class="cat-manage-item">
            <input type="text" value="${cat}" id="input-${cat}">
            <button class="pill-btn btn-danger" style="padding:5px 12px; font-size:12px;" onclick="window.confirmDelCat('${cat}')">删除</button>
            <button class="pill-btn btn-accent" style="padding:5px 12px; font-size:12px; margin-left:5px;" onclick="window.confirmRenameCat('${cat}')">改名</button>
        </div>
    `).join('');

    window.showUniversalModal(`
        <h3>分类管理</h3>
        <div class="cat-manage-list">${listHtml || '暂无分类'}</div>
        <button class="pill-btn btn-cancel full-w" onclick="window.hideModal('universal-modal')">返回</button>
    `);
};

window.confirmRenameCat = (oldName) => {
    const newName = document.getElementById(`input-${oldName}`).value;
    if(!newName || newName === oldName) return;
    links.forEach(l => { if(l.category === oldName) l.category = newName; });
    render();
    window.toast("分类名已更新");
    window.openCategoryManager();
};

window.confirmDelCat = (cat) => {
    if(confirm(`确定删除分类 "${cat}" 及其下所有链接吗？`)) {
        links = links.filter(l => l.category !== cat);
        render();
        window.openCategoryManager();
    }
};

// 3. 弹窗 UI
window.openAddCategoryUI = () => {
    window.showUniversalModal(`
        <h3>新建分类</h3>
        <input id="new-cat" placeholder="分类名称" class="full-w-input" style="width:100%; box-sizing:border-box; padding:12px; border-radius:15px; border:1px solid #444; background:rgba(0,0,0,0.3); color:#fff; margin-bottom:15px;">
        <button class="pill-btn btn-accent full-w" onclick="window.confirmAddCat()">确定创建</button>
        <button class="pill-btn btn-cancel full-w" onclick="window.hideModal('universal-modal')">取消</button>
    `);
};

window.openAddLinkUI = () => {
    const cats = [...new Set(links.map(item => item.category || '默认'))];
    let opts = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    window.showUniversalModal(`
        <h3>新增链接</h3>
        <input id="at" placeholder="网站名称" style="width:100%; box-sizing:border-box; padding:12px; border-radius:15px; border:1px solid #444; background:rgba(0,0,0,0.3); color:#fff; margin-bottom:10px;">
        <input id="au" placeholder="网址" style="width:100%; box-sizing:border-box; padding:12px; border-radius:15px; border:1px solid #444; background:rgba(0,0,0,0.3); color:#fff; margin-bottom:10px;">
        <select id="ac" style="width:100%; box-sizing:border-box; padding:12px; border-radius:15px; border:1px solid #444; background:rgba(0,0,0,0.3); color:#fff; margin-bottom:10px;">${opts}</select>
        <button class="pill-btn btn-accent full-w" onclick="window.confirmAddLink()">确定添加</button>
        <button class="pill-btn btn-cancel full-w" onclick="window.hideModal('universal-modal')">取消</button>
    `);
};

// 4. 功能逻辑
window.confirmAddCat = () => {
    const c = document.getElementById('new-cat').value;
    if(c) { links.push({title:'新书架', url:'https://www.google.com', category:c}); render(); hideModal('universal-modal'); window.toast("分类已创建");}
};
window.confirmAddLink = () => {
    const t=document.getElementById('at').value, u=document.getElementById('au').value, c=document.getElementById('ac').value;
    if(t&&u) { links.push({title:t,url:u,category:c}); render(); hideModal('universal-modal'); window.toast("链接已添加");}
};
window.importBookmarks = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const doc = new DOMParser().parseFromString(e.target.result, "text/html");
        const dl = doc.querySelector("dl"); if (!dl) return alert("解析失败");
        const imported = [];
        function parse(container, cat) {
            container.querySelectorAll(":scope > dt").forEach(dt => {
                const h3 = dt.querySelector(":scope > h3"), a = dt.querySelector(":scope > a"), sub = dt.querySelector(":scope > dl");
                if (h3 && sub) parse(sub, h3.innerText);
                else if (a) imported.push({ title: a.innerText, url: a.href, category: cat || "书签导入" });
            });
        }
        parse(dl, "书签导入");
        links = [...links, ...imported]; render(); window.toast(`成功导入 ${imported.length} 条数据`);
    };
    reader.readAsText(file);
};

window.clearAllData = () => {
    if(confirm("确定清空全站吗？")) { links = []; render(); window.toast("已格式化"); }
};
window.randomWallpaper = () => {
    const url = `https://bing.img.run/rand_uhd.php?r=${Math.random()}`;
    document.getElementById('bg-layer').style.backgroundImage = `url(${url})`;
    window.tempWp = url;
    window.toast("预览新背景中...");
};
window.fixCurrentWallpaper = () => { if(window.tempWp){ wallpaper = window.tempWp; window.toast("背景已锁定，记得点击保存"); } };
window.applyWallpaper = () => { wallpaper = document.getElementById('wp-input').value; render(); window.toast("背景已应用"); };

// 权限
function checkAuth() { const t = localStorage.getItem('loginTime'); return t && (Date.now() - t < 10*60*1000); }
window.login = () => {
    if(document.getElementById('pass-input').value === CONFIG.ADMIN_PASS) {
        localStorage.setItem('loginTime', Date.now()); enableAdminMode(); hideModal('login-modal'); window.toast("欢迎回来，馆长");
    } else { window.toast("暗号错误"); }
};
function enableAdminMode() { isLogged = true; document.getElementById('login-btn').style.display='none'; document.getElementById('admin-actions').style.display='flex'; }

window.saveAll = async () => {
    const btn = document.getElementById('save-btn'); btn.innerText = "正在同步...";
    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST', mode: 'cors',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.ADMIN_PASS}` },
            body: JSON.stringify({ links, wallpaper })
        });
        window.toast("✅ 云端数据已同步");
    } catch (e) { window.toast("❌ 保存失败"); }
    btn.innerText = "☁️ 保存";
};

// UI 辅助
window.openLogin = () => document.getElementById('login-modal').style.display='flex';
window.hideModal = (id) => document.getElementById(id).style.display='none';
window.showSettingsHub = () => document.getElementById('settings-hub').style.display='flex';
window.showUniversalModal = (h) => { document.getElementById('universal-content').innerHTML = h; document.getElementById('universal-modal').style.display='flex'; };
window.enterEditMode = () => { document.body.classList.add('edit-mode'); document.getElementById('exit-edit-btn').style.display='block'; hideModal('settings-hub'); window.toast("批量模式：点击红叉直接删除"); };
window.exitEditMode = () => { document.body.classList.remove('edit-mode'); document.getElementById('exit-edit-btn').style.display='none'; };

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
