// ====== 请务必修改这里 ======
const CONFIG = {
    API_URL: 'https://你的Worker地址.workers.dev/api/config', 
    ADMIN_PASS: '你的管理密码'
};
// ==========================

let links = [];
let wallpaper = '';
let isLogged = false;

// 1. 初始化
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

// 2. 渲染核心
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

// 3. 必应壁纸逻辑
window.randomWallpaper = function() {
    // 使用随机数防止浏览器缓存同一张图
    const randId = Math.floor(Math.random() * 1000);
    const newWp = `https://bing.img.run/rand_uhd.php?rand=${randId}`;
    
    // 仅预览，不存入变量。用户满意后点“永久固定”才正式赋值。
    document.getElementById('bg-layer').style.backgroundImage = `url(${newWp})`;
    // 临时存储这个URL，以便点击固定时获取
    window.tempWp = newWp;
};

window.fixCurrentWallpaper = function() {
    if(!window.tempWp) {
        alert("请先点击'随机必应美图'，看到喜欢的再固定。");
        return;
    }
    wallpaper = window.tempWp;
    alert("📌 已选定这张美图为永久背景！请记得点击下方的'云端保存'。");
};

// 4. 谷歌书签导入逻辑
window.importBookmarks = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");
        const dl = doc.querySelector("dl"); // 谷歌书签的核心包裹层

        if (!dl) {
            alert("书签格式不正确，请确保是谷歌浏览器导出的 .html 文件");
            return;
        }

        const importedLinks = [];
        
        // 解析函数：处理嵌套文件夹
        function parseFolder(container, currentCategory) {
            const items = container.querySelectorAll(":scope > dt");
            items.forEach(dt => {
                const h3 = dt.querySelector(":scope > h3");
                const a = dt.querySelector(":scope > a");
                const subDl = dt.querySelector(":scope > dl");

                if (h3 && subDl) {
                    // 这是一个文件夹
                    parseFolder(subDl, h3.innerText);
                } else if (a) {
                    // 这是一个链接
                    importedLinks.push({
                        title: a.innerText,
                        url: a.href,
                        category: currentCategory || "书签导入"
                    });
                }
            });
        }

        parseFolder(dl, "书签导入");

        if (importedLinks.length > 0) {
            if (confirm(`成功解析出 ${importedLinks.length} 个书签，是否合并到当前导航站？`)) {
                links = [...links, ...importedLinks];
                render();
                alert("导入成功！已按文件夹分类展示。");
            }
        } else {
            alert("未在文件中找到有效的链接。");
        }
    };
    reader.readAsText(file);
};

// 5. 权限与认证
function checkAuth() {
    const t = localStorage.getItem('loginTime');
    return t && (Date.now() - t < 10 * 60 * 1000);
}

window.login = function() {
    const pass = document.getElementById('pass-input').value;
    if(pass === CONFIG.ADMIN_PASS) {
        localStorage.setItem('loginTime', Date.now());
        enableAdminMode();
        hideModal('login-modal');
    } else alert("暗号不对哦！");
};

function enableAdminMode() {
    isLogged = true;
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('admin-actions').style.display = 'flex';
}

// 6. 云端同步 (核心网络请求修复)
window.saveAll = async function() {
    if(!checkAuth()) return alert("登录已过期，请重新登录");
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = "正在同步...";
    
    try {
        const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.ADMIN_PASS}` 
            },
            body: JSON.stringify({ links, wallpaper })
        });
        if(res.ok) alert("✅ 云端同步成功！背景和书签已永久保存。");
        else alert("❌ 同步失败");
    } catch (e) {
        alert("❌ 网络错误：请检查 Worker 的跨域设置(CORS)");
    } finally {
        saveBtn.innerText = "☁️ 云端保存";
    }
};

// 7. 弹窗控制
window.openLogin = () => document.getElementById('login-modal').style.display='flex';
window.hideModal = (id) => document.getElementById(id).style.display='none';
window.showSettingsHub = () => document.getElementById('settings-hub').style.display='flex';
window.showUniversalModal = (h) => { 
    document.getElementById('universal-content').innerHTML = h; 
    document.getElementById('universal-modal').style.display='flex'; 
};

// 8. 分类与链接管理
window.openAddCategoryUI = () => {
    window.showUniversalModal(`<h3>新建分类</h3><input id="new-cat" placeholder="分类名"><button class="action-btn" onclick="window.confirmAddCat()">确定</button>`);
};
window.confirmAddCat = () => {
    const c = document.getElementById('new-cat').value;
    if(c) { links.push({title:'示例', url:'https://google.com', category:c}); render(); hideModal('universal-modal'); }
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

// 9. 编辑模式与背景
window.enterEditMode = () => { document.body.classList.add('edit-mode'); document.getElementById('exit-edit-btn').style.display='block'; hideModal('settings-hub'); render(); };
window.exitEditMode = () => { document.body.classList.remove('edit-mode'); document.getElementById('exit-edit-btn').style.display='none'; render(); };
window.applyWallpaper = () => { wallpaper = document.getElementById('wp-input').value; render(); };

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
