// ====== 请务必修改这里 ======
const CONFIG = {
    API_URL: 'https://你的Worker地址.workers.dev/api/config', 
    ADMIN_PASS: '你的管理密码'
};
// ==========================

let links = [];
let wallpaper = '';
let isLogged = false;

// 1. 初始化加载
window.onload = async function() {
    try {
        const res = await fetch(CONFIG.API_URL);
        if(!res.ok) throw new Error("无法获取云端配置");
        const data = await res.json();
        links = data.links || [];
        wallpaper = data.wallpaper || '';
        if (checkAuth()) enableAdminMode();
        render();
    } catch (e) {
        console.error("加载数据失败:", e);
        render(); // 至少显示默认背景
    }
};

// 2. 检查 10 分钟有效期
function checkAuth() {
    const loginTime = localStorage.getItem('loginTime');
    if (!loginTime) return false;
    const isExpired = (Date.now() - loginTime > 10 * 60 * 1000);
    if (isExpired) {
        localStorage.removeItem('loginTime');
        return false;
    }
    return true;
}

// 3. 核心渲染
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
            let host = 'default';
            try { host = new URL(item.url).hostname; } catch(e){}
            
            card.innerHTML = `
                <a href="${item.url}" target="_blank">
                    <img src="https://api.faviconkit.com/${host}/64" onerror="this.src='https://api.faviconkit.com/default/64'">
                    <div>${item.title}</div>
                </a>`;
            
            card.onclick = (e) => {
                if(document.body.classList.contains('edit-mode')) {
                    e.preventDefault();
                    if(confirm(`确定删除 "${item.title}"?`)) {
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

// 4. 云端同步功能 (修复跨域/网络错误)
window.saveAll = async function() {
    if(!checkAuth()) {
        alert("登录已过期（10分钟），请重新登录后再同步！");
        location.reload();
        return;
    }
    
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "正在同步...";
    saveBtn.disabled = true;

    try {
        const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'cors', // 解决跨域关键
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.ADMIN_PASS}` 
            },
            body: JSON.stringify({ links, wallpaper })
        });
        
        if(res.ok) {
            alert("✅ 同步成功！数据已安全存储在云端。");
        } else {
            const errInfo = await res.text();
            alert(`❌ 同步失败: ${res.status} - ${errInfo}`);
        }
    } catch (e) {
        alert("❌ 网络错误：请检查 Worker 地址是否正确，且 Worker 脚本已开启 CORS 允许。");
        console.error(e);
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
};

// 5. 权限与弹窗
window.openLogin = function() { document.getElementById('login-modal').style.display='flex'; };
window.hideModal = function(id) { document.getElementById(id).style.display='none'; };
window.login = function() {
    const pass = document.getElementById('pass-input').value;
    if(pass === CONFIG.ADMIN_PASS) {
        localStorage.setItem('loginTime', Date.now());
        enableAdminMode();
        hideModal('login-modal');
    } else {
        alert("暗号错误，请核对。");
    }
};

function enableAdminMode() {
    isLogged = true;
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('admin-actions').style.display = 'flex';
}

window.showSettingsHub = function() {
    if(!checkAuth()) { alert("登录过期，请重登。"); location.reload(); return; }
    document.getElementById('settings-hub').style.display='flex';
};

// 6. 分类与链接操作
window.openAddCategoryUI = function() {
    window.showUniversalModal(`
        <h3>添加新分类</h3>
        <input id="new-cat" placeholder="分类名称，如：摸鱼">
        <button class="action-btn" onclick="window.confirmAddCat()">确定</button>
        <button class="action-btn cancel" onclick="window.hideModal('universal-modal')">取消</button>
    `);
};
window.confirmAddCat = function() {
    const c = document.getElementById('new-cat').value;
    if(c) { links.push({title:'新站点', url:'https://google.com', category:c}); render(); hideModal('universal-modal'); }
};

window.openAddLinkUI = function() {
    const cats = [...new Set(links.map(item => item.category || '默认'))];
    let opts = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    window.showUniversalModal(`
        <h3>添加链接</h3>
        <input id="at" placeholder="网站名称">
        <input id="au" placeholder="网址 https://...">
        <select id="ac">${opts}</select>
        <button class="action-btn" onclick="window.confirmAddLink()">确定</button>
        <button class="action-btn cancel" onclick="window.hideModal('universal-modal')">取消</button>
    `);
};
window.confirmAddLink = function() {
    const t=document.getElementById('at').value, u=document.getElementById('au').value, c=document.getElementById('ac').value;
    if(t&&u) { links.push({title:t,url:u,category:c}); render(); hideModal('universal-modal'); }
};

window.showUniversalModal = function(h) { 
    document.getElementById('universal-content').innerHTML = h; 
    document.getElementById('universal-modal').style.display='flex'; 
};

// 7. 编辑模式
window.enterEditMode = function() { 
    document.body.classList.add('edit-mode'); 
    document.getElementById('exit-edit-btn').style.display='block'; 
    hideModal('settings-hub'); 
    render(); 
};
window.exitEditMode = function() { 
    document.body.classList.remove('edit-mode'); 
    document.getElementById('exit-edit-btn').style.display='none'; 
    render(); 
};

// 8. 其他
window.applyWallpaper = function() { wallpaper = document.getElementById('wp-input').value; render(); };
window.randomWallpaper = function() { wallpaper = 'https://bing.img.run/rand_uhd.php'; render(); };

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
