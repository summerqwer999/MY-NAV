// ====== 配置区 ======
const CONFIG = {
    API_URL: 'https://你的Worker地址.workers.dev/api/config', 
    ADMIN_PASS: '你的管理密码'
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

// 1. 渲染引擎
window.render = function() {
    const bgUrl = wallpaper || 'https://images.unsplash.com/photo-1541123356219-284ebe98ae3b?q=80&w=1920';
    document.getElementById('bg-layer').style.backgroundImage = `url(${bgUrl})`;
    
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
            
            // 双保险图标逻辑
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

// 2. 极速批量删除
window.directDelete = (url, title) => {
    links = links.filter(l => !(l.url === url && l.title === title));
    render();
};

// 3. 分类管理弹窗逻辑
window.openCategoryManager = () => {
    const cats = [...new Set(links.map(item => item.category || '默认'))];
    let listHtml = cats.map(cat => `
        <div class="cat-manage-item">
            <input type="text" value="${cat}" id="input-${cat}">
            <button class="action-btn danger" onclick="window.confirmDelCat('${cat}')">删除</button>
            <button class="action-btn" style="width:auto; padding:8px 15px; margin-left:5px;" onclick="window.confirmRenameCat('${cat}')">保存</button>
        </div>
    `).join('');

    window.showUniversalModal(`
        <h2>分类管理</h2>
        <p style="font-size:12px; color:#aaa;">修改名称后点保存，删除分类将清空其下所有链接</p>
        <div class="cat-manage-list">${listHtml}</div>
        <button class="action-btn cancel" onclick="window.hideModal('universal-modal')">关闭返回</button>
    `);
};

window.confirmRenameCat = (oldName) => {
    const newName = document.getElementById(`input-${oldName}`).value;
    if(!newName || newName === oldName) return;
    links.forEach(l => { if(l.category === oldName) l.category = newName; });
    render();
    window.openCategoryManager(); // 刷新列表
};

window.confirmDelCat = (cat) => {
    if(confirm(`确定删除分类 "${cat}" 及其下所有链接吗？`)) {
        links = links.filter(l => l.category !== cat);
        render();
        window.openCategoryManager();
    }
};

// 4. 带取消按钮的通用弹窗
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
        <input id="at" placeholder="网站名称">
        <input id="au" placeholder="网址 (http://...)">
        <select id="ac">${opts}</select>
        <button class="action-btn" onclick="window.confirmAddLink()">确定添加</button>
        <button class="action-btn cancel" onclick="window.hideModal('universal-modal')">取消</button>
    `);
};

// 5. 其它功能函数
window.confirmAddCat = () => {
    const c = document.getElementById('new-cat').value;
    if(c) { links.push({title:'新书架', url:'https://www.google.com', category:c}); render(); hideModal('universal-modal'); }
};
window.confirmAddLink = () => {
    const t=document.getElementById('at').value, u=document.getElementById('au').value, c=document.getElementById('ac').value;
    if(t&&u) { links.push({title:t,url:u,category:c}); render(); hideModal('universal-modal'); }
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
        links = [...links, ...imported]; render(); alert(`导入成功 ${imported.length} 条`);
    };
    reader.readAsText(file);
};

window.clearAllData = () => {
    if(confirm("确定清空全站所有分类和链接吗？")) { links = []; render(); alert("已清空，请保存。"); }
};
window.randomWallpaper = () => {
    const url = `https://bing.img.run/rand_uhd.php?r=${Math.random()}`;
    document.getElementById('bg-layer').style.backgroundImage = `url(${url})`;
    window.tempWp = url;
};
window.fixCurrentWallpaper = () => { if(window.tempWp){ wallpaper = window.tempWp; alert("壁纸已锁定"); } };
window.applyWallpaper = () => { wallpaper = document.getElementById('wp-input').value; render(); };

// 权限与保存
function checkAuth() { const t = localStorage.getItem('loginTime'); return t && (Date.now() - t < 10*60*1000); }
window.login = () => {
    if(document.getElementById('pass-input').value === CONFIG.ADMIN_PASS) {
        localStorage.setItem('loginTime', Date.now()); enableAdminMode(); hideModal('login-modal');
    } else alert("暗号不对");
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

// UI辅助
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
