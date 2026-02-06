const API_URL = 'mynavdata.summerqwer999.workers.dev/api/config'; 
const ADMIN_PASS = '226688'; 

let links = [];
let wallpaper = '';
let isLogged = false;

// --- 基础初始化与渲染 ---
async function init() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        links = data.links || [];
        wallpaper = data.wallpaper || '';
        if (checkAuth()) enableAdminMode();
        render();
    } catch (e) { console.error(e); }
}

function render() {
    // 渲染背景
    const bgUrl = wallpaper || 'https://images.unsplash.com/photo-1541123356219-284ebe98ae3b?q=80&w=1920';
    document.getElementById('bg-layer').style.backgroundImage = `url(${bgUrl})`;
    
    const grid = document.getElementById('link-grid');
    grid.innerHTML = '';
    
    // 提取分类并按顺序渲染
    // 如果没有链接，categories 为空，需要处理“纯分类”添加的情况？
    // 这里采用简单策略：分类由链接决定。如果没有链接属于某分类，该分类不显示。
    // 为了支持“添加分类”后能看到，我们允许创建占位链接。
    const categories = [...new Set(links.map(item => item.category || '默认'))];
    
    categories.forEach(cat => {
        const section = document.createElement('div');
        section.className = 'category-group';
        section.innerHTML = `<h2 class="cat-title">${cat}</h2><div class="cat-grid" data-category="${cat}"></div>`;
        const catGrid = section.querySelector('.cat-grid');
        
        links.filter(item => (item.category || '默认') === cat).forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'glass-card card';
            // 绑定真实数据的索引，方便删除
            const realIndex = links.indexOf(item);
            card.dataset.index = realIndex; 
            
            card.innerHTML = `
                <a href="${item.url}" target="_blank">
                    <img src="https://api.faviconkit.com/${getDomain(item.url)}/64" onerror="this.src='https://api.faviconkit.com/default/64'">
                    <div>${item.title}</div>
                </a>`;
            
            // 点击删除逻辑 (仅在编辑模式下生效)
            card.onclick = (e) => {
                if(document.body.classList.contains('edit-mode')) {
                    if(confirm(`确定删除 "${item.title}" 吗？`)) {
                        links.splice(realIndex, 1);
                        render();
                    }
                }
            };
            catGrid.appendChild(card);
        });
        grid.appendChild(section);
        
        // 只有在非编辑模式且已登录时，才允许拖拽排序
        if (isLogged && !document.body.classList.contains('edit-mode')) {
            new Sortable(catGrid, { group: 'shared', animation: 150, onEnd: reorderLinks });
        }
    });
}

// --- 交互功能实现 ---

// 1. 添加分类 UI
function openAddCategoryUI() {
    const html = `
        <h3>新建书架分类</h3>
        <input type="text" id="new-cat-name" placeholder="例如：摸鱼专用">
        <div class="modal-btns">
            <button class="action-btn" onclick="confirmAddCategory()">确定创建</button>
            <button class="action-btn cancel" onclick="hideModal('universal-modal')">取消</button>
        </div>
    `;
    showUniversalModal(html);
}

function confirmAddCategory() {
    const name = document.getElementById('new-cat-name').value;
    if(name) {
        // 创建一个占位链接，让分类显示出来
        links.push({ title: '新站点', url: 'https://github.com', category: name });
        render();
        hideModal('universal-modal');
        hideModal('settings-hub');
    }
}

// 2. 编辑分类 UI (列表 + 排序)
function openCategoryManager() {
    const categories = [...new Set(links.map(item => item.category || '默认'))];
    let listHtml = `<div id="cat-sort-list" class="cat-manage-list">`;
    categories.forEach(cat => {
        listHtml += `
            <div class="cat-manage-item" data-name="${cat}">
                <span class="cat-drag-handle">☰</span>
                <input type="text" value="${cat}" onchange="renameCategory('${cat}', this.value)">
                <button class="del-icon-btn" onclick="deleteCategory('${cat}')">🗑</button>
            </div>`;
    });
    listHtml += `</div>`;
    
    const html = `
        <h3>管理分类 (拖拽排序)</h3>
        ${listHtml}
        <div class="modal-btns">
            <button class="action-btn" onclick="finishCategoryEdit()">完成</button>
        </div>
    `;
    showUniversalModal(html);
    
    // 启用列表拖拽
    new Sortable(document.getElementById('cat-sort-list'), {
        handle: '.cat-drag-handle',
        animation: 150,
        onEnd: () => {
            // 拖拽后重新排序 links 数组
            // 这是一个高级操作：根据 DOM 顺序重建数据
            const newOrderCats = Array.from(document.querySelectorAll('.cat-manage-item')).map(el => el.dataset.name);
            reorderLinksByCatList(newOrderCats);
        }
    });
}

// 重命名分类逻辑
function renameCategory(oldName, newName) {
    if(!newName) return;
    links.forEach(link => {
        if(link.category === oldName) link.category = newName;
    });
    // 更新 DOM 上的 data-name 防止下次拖拽出错
    const input = document.activeElement;
    if(input && input.parentElement) input.parentElement.dataset.name = newName;
}

// 删除分类逻辑
function deleteCategory(catName) {
    if(confirm(`删除分类 "${catName}" 会连带删除该分类下所有链接，确定吗？`)) {
        links = links.filter(link => link.category !== catName);
        openCategoryManager(); // 刷新列表
        render(); // 刷新后台
    }
}

// 拖拽分类后，调整 links 数组顺序
function reorderLinksByCatList(newCatOrder) {
    let newLinks = [];
    newCatOrder.forEach(cat => {
        newLinks = newLinks.concat(links.filter(l => l.category === cat));
    });
    links = newLinks;
    render();
}

function finishCategoryEdit() {
    hideModal('universal-modal');
    render();
}

// 3. 添加链接 UI
function openAddLinkUI() {
    const categories = [...new Set(links.map(item => item.category || '默认'))];
    let options = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    
    const html = `
        <h3>添加新藏书</h3>
        <input type="text" id="add-title" placeholder="网站名称">
        <input type="text" id="add-url" placeholder="网址 (https://...)" style="margin-top:10px;">
        <select id="add-cat" style="margin-top:10px;">${options}</select>
        <div class="modal-btns">
            <button class="action-btn" onclick="confirmAddLink()">确定添加</button>
            <button class="action-btn cancel" onclick="hideModal('universal-modal')">取消</button>
        </div>
    `;
    showUniversalModal(html);
}

function confirmAddLink() {
    const title = document.getElementById('add-title').value;
    const url = document.getElementById('add-url').value;
    const cat = document.getElementById('add-cat').value;
    
    if(title && url) {
        links.push({ title, url, category: cat });
        render();
        hideModal('universal-modal');
        hideModal('settings-hub');
    } else {
        alert("请填写完整信息");
    }
}

// 4. 管理链接 (全屏删除模式)
function enterEditMode() {
    hideModal('settings-hub');
    document.body.classList.add('edit-mode');
    document.getElementById('exit-edit-btn').style.display = 'block';
    // 禁用 Sortable 防止冲突
    render(); 
}

function exitEditMode() {
    document.body.classList.remove('edit-mode');
    document.getElementById('exit-edit-btn').style.display = 'none';
    render(); // 重新渲染以恢复 Sortable 和 A 标签跳转
}


// --- 辅助工具 ---
function showUniversalModal(htmlContent) {
    const container = document.getElementById('universal-content');
    container.innerHTML = htmlContent;
    document.getElementById('universal-modal').style.display = 'flex';
}

function getDomain(url) {
    try { return new URL(url).hostname; } catch(e) { return 'google.com'; }
}

function checkAuth() {
    const loginTime = localStorage.getItem('loginTime');
    if (!loginTime) return false;
    if (Date.now() - loginTime > 10 * 60 * 1000) { 
        localStorage.removeItem('loginTime'); 
        location.reload();
        return false; 
    }
    return true;
}

function login() {
    if (document.getElementById('pass-input').value === ADMIN_PASS) {
        localStorage.setItem('loginTime', Date.now());
        enableAdminMode();
        hideModal('login-modal');
    } else { alert('暗号不对！'); }
}

function enableAdminMode() {
    isLogged = true;
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('admin-actions').style.display = 'flex';
    render();
}

// 弹窗控制
function showSettingsHub() { if(checkAuth()) document.getElementById('settings-hub').style.display = 'flex'; }
function hideModal(id) { document.getElementById(id).style.display = 'none'; }
function applyWallpaper() { wallpaper = document.getElementById('wp-input').value; render(); }
function randomWallpaper() { wallpaper = 'https://bing.img.run/rand_uhd.php'; render(); }

function reorderLinks() {
    // 保持之前的网格内拖拽逻辑
    const newLinks = [];
    document.querySelectorAll('.cat-grid').forEach(grid => {
        const category = grid.dataset.category;
        grid.querySelectorAll('.card').forEach(card => {
             // 通过 data-index 找回原始对象比较保险，但这里简化处理直接重建
             // 更好的方式：
             const item = links[card.dataset.index]; 
             // 注意：这里因为拖拽导致 dataset.index 和数组下标可能不一致，
             // 所以最好根据 title/url 查找，或者简单地信任 DOM 顺序重建对象
             const title = card.querySelector('div').innerText;
             const linkObj = links.find(l => l.title === title); // 简单查找
             if(linkObj) {
                 linkObj.category = category;
                 newLinks.push(linkObj);
             }
        });
    });
    // 去重防止 bug
    links = [...new Set(newLinks)];
}

async function saveAll() {
    if(!checkAuth()) return;
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_PASS}` },
            body: JSON.stringify({ links, wallpaper })
        });
        if (res.ok) alert('✅ 同步成功！');
        else alert('❌ 同步失败');
    } catch (e) { alert('❌ 网络错误'); }
}

init();
