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

// 1. 渲染引擎 - 锁定 DuckDuckGo
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
            
            // 使用最强大的 DuckDuckGo 源
            const iIcon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;

            card.innerHTML = `
                <div class="delete-badge" onclick="window.directDelete('${item.url}','${item.title}')">✕</div>
                <a href="${item.url}" target="_blank">
                    <img src="${iIcon}" onerror="this.src='https://www.google.com/s2/favicons?domain=example.com&sz=64'" loading="lazy">
                    <div>${item.title}</div>
                </a>`;
            
            catGrid.appendChild(card);
        });
        grid.appendChild(section);
        
        if (isLogged && !document.body.classList.contains('edit-mode')) {
            new Sortable(catGrid, { group: 'shared', animation: 150, onEnd: reorderLinksFromDOM });
        }
    });
};

// 2. 批量模式下的直接删除
window.directDelete = (url, title) => {
    links = links.filter(l => !(l.url === url && l.title === title));
    render();
};

// 3. 点击弹窗外关闭逻辑
window.handleOutsideClick = (e) => {
    if (e.target.classList.contains('modal')) {
        window.hideModal(e.target.id);
    }
};

// 4. 分类管理功能
window.openCategoryManager = () => {
    const cats = [...new Set(links.map(item => item.category || '默认'))];
    let listHtml = cats.map(cat => `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; background:rgba(0,0,0,0.2); padding:10px; border-radius:15px;">
            <input type="text" value="${cat}" id="input-${cat}" style="margin:0; flex:1">
            <button class="btn btn-gold" style="padding:8px 15px; margin:0; font-size:12px;" onclick="window.confirmRenameCat('${cat}')">改名</button>
            <button class="btn" style="padding:8px 15px; margin:0; font-size:12px; background:#8e2a2a; color:white" onclick="window.confirmDelCat('${cat}')">删除</button>
        </div>
    `).join('');

    window.showUniversalModal(`
        <h3>分类管理</h3>
        <div style="max-height:300px; overflow-y:auto; margin-bottom:20px;">${listHtml || '无分类'}</div>
        <button class="action-btn cancel" onclick="window.hideModal('universal-modal')">返回</button>
    `);
};

window.confirmRenameCat = (oldName) => {
    const newName = document.getElementById(`input-${oldName}`).value;
    if(!newName || newName === oldName) return;
    links.forEach(l => { if(l.category === oldName) l.category = newName; });
    render();
    window.openCategoryManager();
};

window.confirmDelCat = (cat) => {
    if(confirm(`删除分类 "${cat}" 及其下所有链接？`)) {
        links = links.filter(l => l.category !== cat);
        render();
        window.openCategoryManager();
    }
};

// 5. 新增与 UI
window.openAddCategoryUI = () => {
    window.showUniversalModal(`
        <h3>新建分类</h3>
        <input id="new-cat" placeholder="分类名称">
        <button class="action-btn" onclick="window.confirmAddCat()">确定创建</button>
        <button class="action-btn cancel" onclick="window.hideModal('universal-modal')">取消</button>
    `);
};

window.openAddLinkUI = () => {
    const cats = [...new Set(links.map(item => item.category || '默认'))];
    let opts = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    window.showUniversalModal(`
        <h3>新增链接</h3>
        <input id="at" placeholder="名称"><input id="au" placeholder="网址"><select id="ac">${opts}</select>
        <button class="action-btn" onclick="window.confirmAddLink()">确定添加</button>
        <button class="action-btn cancel" onclick="window.hideModal('universal-modal')">取消</button>
    `);
};

window.confirmAddCat = () => {
    const c = document.getElementById('new-cat').value;
    if(c) { links.push({title:'新书架', url:'https://www.google.com', category:c}); render(); hideModal('universal-modal'); }
};
window.confirmAddLink = () => {
    const t=document.getElementById('at').value, u=document.getElementById('au').value, c=document.getElementById('ac').value;
    if(t&&u) { links.push({title:t,url:u,category:c}); render(); hideModal('universal-modal'); }
};

window.clearAllData = () => {
    if(confirm("🧨 确定清空所有数据吗？不可撤销！")) { links = []; render(); }
};

window.importBookmarks = (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const doc = new DOMParser().parseFromString(e.target.result, "text/html");
        const dl = doc.querySelector("dl");
        const imported = [];
        function parse(container, cat) {
            container.querySelectorAll(":scope > dt").forEach(dt => {
                const h3 = dt.querySelector(":scope > h3"), a = dt.querySelector(":scope > a"), sub = dt.querySelector(":scope > dl");
                if (h3 && sub) parse(sub, h3.innerText);
                else if (a) imported.push({ title: a.innerText, url: a.href, category: cat || "书签导入" });
            });
        }
        if(dl) parse(dl, "书签导入");
        links = [...links, ...imported]; render();
    };
    reader.readAsText(file);
};

// 6. 壁纸与权限
window.randomWallpaper = () => {
    const url = `https://bing.img.run/rand_uhd.php?r=${Math.random()}`;
    document.getElementById('bg-layer').style.backgroundImage = `url(${url})`;
    window.tempWp = url;
};
window.fixCurrentWallpaper = () => { if(window.tempWp) wallpaper = window.tempWp; };
window.applyWallpaper = () => { wallpaper = document.getElementById('wp-input').value; render(); };

function checkAuth() { const t = localStorage.getItem('loginTime'); return t && (Date.now() - t < 12*60*60*1000); }
window.login = () => {
    if(document.getElementById('pass-input').value === CONFIG.ADMIN_PASS) {
        localStorage.setItem('loginTime', Date.now()); enableAdminMode(); hideModal('login-modal');
    } else alert("暗号错误");
};
function enableAdminMode() { isLogged = true; document.getElementById('login-btn').style.display='none'; document.getElementById('admin-actions').style.display='flex'; }

window.saveAll = async () => {
    const btn = document.getElementById('save-btn'); btn.innerText = "同步中...";
    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST', mode: 'cors',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.ADMIN_PASS}` },
            body: JSON.stringify({ links, wallpaper })
        });
        alert("✅ 云端同步成功！");
    } catch (e) { alert("❌ 保存失败"); }
    btn.innerText = "☁️ 云端保存";
};

// UI 辅助
window.openLogin = () => document.getElementById('login-modal').style.display='flex';
window.hideModal = (id) => document.getElementById(id).style.display='none';
window.showSettingsHub = () => document.getElementById('settings-hub').style.display='flex';
window.showUniversalModal = (h) => { document.getElementById('universal-content').innerHTML = h; document.getElementById('universal-modal').style.display='flex'; };
window.enterEditMode = () => { document.body.classList.add('edit-mode'); document.getElementById('exit-edit-btn').style.display='block'; hideModal('settings-hub'); };
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
