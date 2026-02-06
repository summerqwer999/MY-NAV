// ====== 配置区域 (请修改这里) ======
const CONFIG = {
    API_URL: 'https://mynavdata.summerqwer999.workers.dev.workers.dev/api/config',  // 你的 Worker 地址
    ADMIN_PASS: '226688'                                 // 你的密码
};
// =================================

let links = [];
let wallpaper = '';
let isLogged = false;

// 1. 初始化
window.onload = async function() {
    try {
        console.log("正在加载数据...");
        const res = await fetch(CONFIG.API_URL);
        const data = await res.json();
        links = data.links || [];
        wallpaper = data.wallpaper || '';
        
        // 自动登录检查
        if (checkAuth()) {
            enableAdminMode();
        }
        
        render();
    } catch (e) {
        console.error("初始化错误:", e);
        // 如果数据加载失败，至少渲染一个空壳，防止页面白屏
        render();
    }
};

// 2. 核心渲染函数
window.render = function() {
    // 设置背景
    const bgUrl = wallpaper || 'https://images.unsplash.com/photo-1541123356219-284ebe98ae3b?q=80&w=1920';
    document.getElementById('bg-layer').style.backgroundImage = `url(${bgUrl})`;
    
    const grid = document.getElementById('link-grid');
    grid.innerHTML = '';
    
    // 提取分类
    const categories = [...new Set(links.map(item => item.category || '默认'))];
    
    categories.forEach(cat => {
        // 创建分类标题栏
        const section = document.createElement('div');
        section.className = 'category-group';
        section.innerHTML = `<h2 class="cat-title">${cat}</h2><div class="cat-grid" data-category="${cat}"></div>`;
        const catGrid = section.querySelector('.cat-grid');
        
        // 筛选该分类下的链接
        const catLinks = links.filter(item => (item.category || '默认') === cat);
        
        catLinks.forEach(item => {
            const card = document.createElement('div');
            card.className = 'glass-card card';
            
            // 获取 favicon，如果 URL 写错则用默认图标
            let iconUrl = 'https://api.faviconkit.com/default/64';
            try {
                if(item.url && item.url.startsWith('http')) {
                    const host = new URL(item.url).hostname;
                    iconUrl = `https://api.faviconkit.com/${host}/64`;
                }
            } catch(e) {}

            card.innerHTML = `
                <a href="${item.url}" target="_blank">
                    <img src="${iconUrl}" onerror="this.src='https://api.faviconkit.com/default/64'">
                    <div>${item.title}</div>
                </a>`;
            
            // 编辑模式点击删除
            card.onclick = (e) => {
                if(document.body.classList.contains('edit-mode')) {
                    e.preventDefault();
                    e.stopPropagation();
                    if(confirm(`删除 "${item.title}" ？`)) {
                        // 找到该元素在 links 数组中的真实索引并删除
                        const realIndex = links.indexOf(item);
                        if(realIndex > -1) {
                            links.splice(realIndex, 1);
                            render();
                        }
                    }
                }
            };
            catGrid.appendChild(card);
        });
        
        grid.appendChild(section);
        
        // 拖拽支持 (仅限已登录且非删除模式)
        if (isLogged && !document.body.classList.contains('edit-mode')) {
            new Sortable(catGrid, {
                group: 'shared',
                animation: 150,
                onEnd: function() {
                    reorderLinksFromDOM();
                }
            });
        }
    });
};

// 3. 弹窗控制
window.openLogin = function() { document.getElementById('login-modal').style.display = 'flex'; };
window.showSettingsHub = function() { 
    if(checkAuth()) document.getElementById('settings-hub').style.display = 'flex'; 
    else { alert('登录过期，请重新登录'); location.reload(); }
};
window.hideModal = function(id) { document.getElementById(id).style.display = 'none'; };
window.showUniversalModal = function(html) {
    document.getElementById('universal-content').innerHTML = html;
    document.getElementById('universal-modal').style.display = 'flex';
};

// 4. 登录逻辑
window.login = function() {
    const pass = document.getElementById('pass-input').value;
    if (pass === CONFIG.ADMIN_PASS) {
        localStorage.setItem('loginTime', Date.now());
        enableAdminMode();
        hideModal('login-modal');
    } else {
        alert('密码错误');
    }
};

window.logout = function() {
    localStorage.removeItem('loginTime');
    location.reload();
};

window.checkAuth = function() {
    const loginTime = localStorage.getItem('loginTime');
    if (!loginTime) return false;
    if (Date.now() - loginTime > 10 * 60 * 1000) { // 10分钟有效期
        localStorage.removeItem('loginTime');
        return false;
    }
    return true;
};

window.enableAdminMode = function() {
    isLogged = true;
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('admin-actions').style.display = 'flex';
};

// 5. 分类管理 (增/删/改/排序)
window.openAddCategoryUI = function() {
    showUniversalModal(`
        <h3>新建分类</h3>
        <input type="text" id="new-cat-name" placeholder="分类名称">
        <div class="modal-btns">
            <button class="action-btn" onclick="confirmAddCategory()">确定</button>
            <button class="action-btn cancel" onclick="hideModal('universal-modal')">取消</button>
        </div>
    `);
};

window.confirmAddCategory = function() {
    const name = document.getElementById('new-cat-name').value;
    if(name) {
        links.push({ title: '示例', url: 'https://github.com', category: name });
        render();
        hideModal('universal-modal');
        hideModal('settings-hub');
    }
};

window.openCategoryManager = function() {
    const categories = [...new Set(links.map(item => item.category || '默认'))];
    let html = `<h3>管理分类 (按住☰排序)</h3><div id="cat-list" class="cat-manage-list">`;
    
    categories.forEach(cat => {
        html += `
            <div class="cat-manage-item" data-name="${cat}">
                <span class="cat-drag-handle">☰</span>
                <input value="${cat}" onchange="renameCategory('${cat}', this.value)">
                <button class="del-icon-btn" onclick="deleteCategory('${cat}')">🗑</button>
            </div>`;
    });
    html += `</div><div class="modal-btns"><button class="action-btn" onclick="finishCatEdit()">完成</button></div>`;
    
    showUniversalModal(html);
    
    new Sortable(document.getElementById('cat-list'), {
        handle: '.cat-drag-handle',
        animation: 150,
        onEnd: function() {
            // 根据列表顺序重新排列 links
            const newOrder = Array.from(document.querySelectorAll('.cat-manage-item')).map(el => el.dataset.name);
            let newLinks = [];
            newOrder.forEach(c => {
                newLinks = newLinks.concat(links.filter(l => (l.category||'默认') === c));
            });
            links = newLinks;
            render();
        }
    });
};

window.renameCategory = function(oldName, newName) {
    if(!newName) return;
    links.forEach(l => { if((l.category||'默认') === oldName) l.category = newName; });
    // 更新 DOM data 属性
    if(document.activeElement.parentElement) document.activeElement.parentElement.dataset.name = newName;
};

window.deleteCategory = function(catName) {
    if(confirm(`删除分类 "${catName}" 会清空该分类下所有链接，确定吗？`)) {
        links = links.filter(l => (l.category||'默认') !== catName);
        hideModal('universal-modal');
        render();
    }
};

window.finishCatEdit = function() { hideModal('universal-modal'); render(); };

// 6. 链接添加
window.openAddLinkUI = function() {
    const cats = [...new Set(links.map(item => item.category || '默认'))];
    let opts = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    
    showUniversalModal(`
        <h3>添加链接</h3>
        <input id="add-title" placeholder="名称">
        <input id="add-url" placeholder="网址 https://">
        <select id="add-cat">${opts}</select>
        <div class="modal-btns">
            <button class="action-btn" onclick="confirmAddLink()">确定</button>
            <button class="action-btn cancel" onclick="hideModal('universal-modal')">取消</button>
        </div>
    `);
};

window.confirmAddLink = function() {
    const title = document.getElementById('add-title').value;
    const url = document.getElementById('add-url').value;
    const cat = document.getElementById('add-cat').value;
    if(title && url) {
        links.push({ title, url, category: cat });
        render();
        hideModal('universal-modal');
        hideModal('settings-hub');
    }
};

// 7. 管理链接 (全屏删除模式)
window.enterEditMode = function() {
    hideModal('settings-hub');
    document.body.classList.add('edit-mode');
    document.getElementById('exit-edit-btn').style.display = 'block';
    render(); // 重新渲染以绑定点击事件
};

window.exitEditMode = function() {
    document.body.classList.remove('edit-mode');
    document.getElementById('exit-edit-btn').style.display = 'none';
    render();
};

// 8. 辅助功能
window.applyWallpaper = function() {
    wallpaper = document.getElementById('wp-input').value;
    render();
};
window.randomWallpaper = function() {
    wallpaper = 'https://bing.img.run/rand_uhd.php';
    render();
};

window.reorderLinksFromDOM = function() {
    const newLinks = [];
    document.querySelectorAll('.cat-grid').forEach(grid => {
        const cat = grid.dataset.category;
        grid.querySelectorAll('.card a').forEach(a => {
            const title = a.querySelector('div').innerText;
            const item = links.find(l => l.title === title);
            if(item) {
                item.category = cat;
                newLinks.push(item);
            }
        });
    });
    // 去重
    links = [...new Set(newLinks)];
};

window.saveAll = async function() {
    if(!checkAuth()) { alert('请重新登录'); return; }
    try {
        const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.ADMIN_PASS}` },
            body: JSON.stringify({ links, wallpaper })
        });
        if(res.ok) alert('✅ 同步成功！');
        else alert('❌ 同步失败');
    } catch(e) { alert('❌ 网络错误'); }
};
